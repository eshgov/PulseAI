#!/usr/bin/env python3
"""
CPR Assistant App
- Better BPM calculation using last 4 beats
- compression detection
- Cloud upload functionality for data collection
"""

import cv2
import mediapipe as mp
import numpy as np
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import time
import math
import json
import base64
from datetime import datetime
from typing import Optional, Tuple, List
import requests
import os

class CPRAssistant:
    def __init__(self):
        # Initialize MediaPipe
        self.mp_pose = mp.solutions.pose
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize pose and hands
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # CPR tracking variables
        self.compression_count = 0
        self.current_bpm = 0
        self.target_bpm = 110
        self.compression_depth = 0
        self.hand_placement_score = 0
        self.last_compression_time = 0
        self.compression_times = []
        self.metronome_active = False
        self.mode = None
        
        # Improved compression detection
        self.compression_history = []  # Track compression depth over time
        self.depth_threshold = 0.3  # Minimum depth change to register compression
        self.last_depth = 0
        self.compression_detected = False
        self.compression_start_time = 0
        
        # UI variables
        self.camera = None
        self.running = False
        self.current_step = 0
        
        # Walkthrough steps
        self.walkthrough_steps = [
            "Check responsiveness and call 911",
            "Position victim on firm surface",
            "Place hands in center of chest",
            "Begin compressions at 100-120 BPM",
            "Continue for 30 compressions",
            "Give 2 rescue breaths",
            "Resume compressions"
        ]
        
        # Session data for cloud upload
        self.session_data = {
            'start_time': datetime.now().isoformat(),
            'compressions': [],
            'bpm_history': [],
            'hand_placement_history': [],
            'depth_history': [],
            'frames': []  # Will store blurred frames
        }
        
        self.flash_timer = 0
        self.upload_in_progress = False
        
    def initialize_camera(self):
        """Initialize camera capture"""
        self.camera = cv2.VideoCapture(0)
        if not self.camera.isOpened():
            raise Exception("Could not open camera")
        
        # Set camera properties
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.camera.set(cv2.CAP_PROP_FPS, 30)
        
    def calculate_bpm(self, compression_times):
        """Calculate BPM using last 4 beats for better accuracy"""
        if len(compression_times) < 2:
            return 0
        
        # Use only the last 4 compressions for more accurate BPM
        recent_times = compression_times[-4:] if len(compression_times) >= 4 else compression_times
        
        if len(recent_times) < 2:
            return 0
        
        # Calculate intervals between compressions
        intervals = []
        for i in range(1, len(recent_times)):
            interval = recent_times[i] - recent_times[i-1]
            intervals.append(interval)
        
        if not intervals:
            return 0
        
        # Calculate average interval and convert to BPM
        avg_interval = sum(intervals) / len(intervals)
        bpm = 60 / avg_interval if avg_interval > 0 else 0
        
        # Smooth the BPM calculation to reduce noise
        if hasattr(self, 'previous_bpm'):
            # Weighted average: 70% new, 30% previous
            bpm = 0.7 * bpm + 0.3 * self.previous_bpm
        
        self.previous_bpm = bpm
        return min(max(bpm, 0), 200)  # Clamp between 0-200 BPM
    
    def detect_compression(self, landmarks, current_time):
        """Improved compression detection using depth change over time"""
        if not landmarks:
            return False
        
        # Get current depth
        current_depth = self.detect_compression_depth(landmarks)
        
        # Add to history
        self.compression_history.append({
            'time': current_time,
            'depth': current_depth
        })
        
        # Keep only recent history (last 2 seconds)
        cutoff_time = current_time - 2.0
        self.compression_history = [h for h in self.compression_history if h['time'] > cutoff_time]
        
        if len(self.compression_history) < 3:
            return False
        
        # Detect compression as a significant depth change
        recent_depths = [h['depth'] for h in self.compression_history[-3:]]
        depth_change = max(recent_depths) - min(recent_depths)
        
        # Check if we're in a compression cycle
        if depth_change > self.depth_threshold:
            if not self.compression_detected:
                # Start of compression
                self.compression_detected = True
                self.compression_start_time = current_time
                return False
            else:
                # Check if compression is complete (depth returning to normal)
                if current_time - self.compression_start_time > 0.2:  # Minimum compression duration
                    if current_depth < max(recent_depths) - 0.1:  # Depth decreasing
                        self.compression_detected = False
                        return True
        else:
            self.compression_detected = False
        
        return False
    
    def detect_hand_placement(self, landmarks):
        """Detect if hands are properly placed for CPR"""
        if not landmarks:
            return 0
        
        left_wrist = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_WRIST]
        left_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
        
        chest_center_x = (left_shoulder.x + right_shoulder.x) / 2
        chest_center_y = (left_shoulder.y + right_shoulder.y) / 2
        
        left_distance = ((left_wrist.x - chest_center_x)**2 + (left_wrist.y - chest_center_y)**2)**0.5
        right_distance = ((right_wrist.x - chest_center_x)**2 + (right_wrist.y - chest_center_y)**2)**0.5
        
        avg_distance = (left_distance + right_distance) / 2
        score = max(0, 1 - avg_distance * 10)
        
        return score
    
    def detect_compression_depth(self, landmarks):
        """Detect compression depth based on hand movement"""
        if not landmarks:
            return 0
        
        left_wrist = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_WRIST]
        
        hand_y = (left_wrist.y + right_wrist.y) / 2
        depth = 1 - hand_y
        
        return depth
    
    def blur_face(self, frame):
        """Blur faces in the frame for privacy"""
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Simple face detection using Haar cascades
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Blur detected faces
        for (x, y, w, h) in faces:
            # Extract face region
            face_region = frame[y:y+h, x:x+w]
            # Blur the face region
            blurred_face = cv2.GaussianBlur(face_region, (99, 99), 0)
            # Replace with blurred version
            frame[y:y+h, x:x+w] = blurred_face
        
        return frame
    
    def get_feedback_color(self, bpm):
        """Get color based on BPM feedback"""
        if 100 <= bpm <= 120:
            return (0, 255, 0)  # Green
        elif bpm < 100:
            return (0, 0, 255)  # Red
        else:
            return (0, 165, 255)  # Orange
    
    def process_frame(self, frame):
        """Process a single frame for CPR feedback"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        pose_results = self.pose.process(rgb_frame)
        hands_results = self.hands.process(rgb_frame)
        
        # Draw pose landmarks
        if pose_results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                frame, pose_results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS
            )
            
            self.hand_placement_score = self.detect_hand_placement(pose_results.pose_landmarks)
            self.compression_depth = self.detect_compression_depth(pose_results.pose_landmarks)
            
            # Improved compression detection
            current_time = time.time()
            if self.detect_compression(pose_results.pose_landmarks, current_time):
                self.compression_times.append(current_time)
                self.compression_count += 1
                
                # Keep only recent compression times (last 10)
                if len(self.compression_times) > 10:
                    self.compression_times.pop(0)
                
                # Calculate improved BPM
                self.current_bpm = self.calculate_bpm(self.compression_times)
                
                # Record session data
                self.session_data['compressions'].append({
                    'time': current_time,
                    'bpm': self.current_bpm,
                    'depth': self.compression_depth,
                    'hand_placement': self.hand_placement_score
                })
        
        # Draw hand landmarks
        if hands_results.multi_hand_landmarks:
            for hand_landmarks in hands_results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS
                )
        
        return frame, pose_results, hands_results
    
    def add_visual_overlay(self, frame):
        """Add visual CPR feedback overlay"""
        height, width = frame.shape[:2]
        
        # Current BPM with color coding
        bpm_color = self.get_feedback_color(self.current_bpm)
        cv2.rectangle(frame, (10, 10), (250, 80), (0, 0, 0), -1)
        cv2.putText(frame, f"BPM: {int(self.current_bpm)}", (20, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, bpm_color, 2)
        
        # Compression count
        cv2.rectangle(frame, (10, 90), (250, 130), (0, 0, 0), -1)
        cv2.putText(frame, f"Count: {self.compression_count}", (20, 120), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Hand placement score
        placement_color = (0, 255, 0) if self.hand_placement_score > 0.7 else (0, 0, 255)
        cv2.rectangle(frame, (10, 140), (250, 180), (0, 0, 0), -1)
        cv2.putText(frame, f"Hands: {int(self.hand_placement_score*100)}%", (20, 170), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, placement_color, 2)
        
        # Compression depth
        depth_color = (0, 255, 0) if self.compression_depth > 0.7 else (0, 0, 255)
        cv2.rectangle(frame, (10, 190), (250, 230), (0, 0, 0), -1)
        cv2.putText(frame, f"Depth: {int(self.compression_depth*100)}%", (20, 220), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, depth_color, 2)
        
        # Emergency info
        cv2.rectangle(frame, (width-200, 10), (width-10, 50), (0, 0, 255), -1)
        cv2.putText(frame, "CALL 911!", (width-190, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        # Mode indicator
        mode_text = "Walkthrough" if self.mode == "walkthrough" else "Feedback"
        cv2.rectangle(frame, (width-200, 60), (width-10, 100), (0, 100, 0), -1)
        cv2.putText(frame, mode_text, (width-190, 85), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Cloud upload button
        upload_color = (0, 255, 255) if not self.upload_in_progress else (255, 165, 0)
        cv2.rectangle(frame, (width-200, 110), (width-10, 150), upload_color, -1)
        upload_text = "Uploading..." if self.upload_in_progress else "Upload Session"
        cv2.putText(frame, upload_text, (width-190, 135), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
        # Visual feedback messages
        if self.current_bpm > 0:
            if 100 <= self.current_bpm <= 120:
                cv2.putText(frame, "Good rhythm!", (20, 280), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            elif self.current_bpm < 100:
                cv2.putText(frame, "Too slow - speed up!", (20, 280), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            else:
                cv2.putText(frame, "Too fast - slow down!", (20, 280), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        
        # Visual metronome (flashing)
        if self.metronome_active and self.current_bpm > 0:
            current_time = time.time()
            interval = 60.0 / self.target_bpm
            if (current_time - self.flash_timer) % interval < 0.1:
                cv2.rectangle(frame, (0, 0), (width, height), (0, 255, 0), 5)
                cv2.putText(frame, "BEAT", (width//2 - 30, height//2), 
                           cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), 3)
        
        return frame
    
    def upload_session_to_cloud(self):
        """Upload session data to cloud for model training"""
        if self.upload_in_progress:
            return
        
        self.upload_in_progress = True
        
        def upload_thread():
            try:
                # Prepare session data
                session_data = {
                    'session_id': f"cpr_session_{int(time.time())}",
                    'start_time': self.session_data['start_time'],
                    'end_time': datetime.now().isoformat(),
                    'total_compressions': self.compression_count,
                    'avg_bpm': np.mean([c['bpm'] for c in self.session_data['compressions']]) if self.session_data['compressions'] else 0,
                    'compressions': self.session_data['compressions'],
                    'device_info': {
                        'platform': 'CPR Assistant App',
                        'version': '1.0'
                    }
                }
                
                # Simulate cloud upload (replace with actual cloud service)
                print(f"Uploading session data: {len(session_data['compressions'])} compressions")
                print(f"Average BPM: {session_data['avg_bpm']:.1f}")
                
                # Simulate API call
                time.sleep(2)  # Simulate upload time
                
                print("✓ Session uploaded successfully!")
                messagebox.showinfo("Upload Complete", "Session data uploaded to cloud for model training!")
                
            except Exception as e:
                print(f"Upload error: {e}")
                messagebox.showerror("Upload Error", f"Failed to upload: {e}")
            finally:
                self.upload_in_progress = False
        
        # Start upload in background thread
        upload_thread = threading.Thread(target=upload_thread)
        upload_thread.daemon = True
        upload_thread.start()
    
    def run_walkthrough_mode(self):
        """Run step-by-step CPR walkthrough"""
        self.mode = "walkthrough"
        self.current_step = 0
        
        while self.running and self.current_step < len(self.walkthrough_steps):
            ret, frame = self.camera.read()
            if not ret:
                break
            
            # Blur faces for privacy
            frame = self.blur_face(frame)
            
            processed_frame, pose_results, hands_results = self.process_frame(frame)
            frame_with_overlay = self.add_visual_overlay(processed_frame)
            
            # Show current step
            height, width = frame_with_overlay.shape[:2]
            step_text = f"Step {self.current_step + 1}: {self.walkthrough_steps[self.current_step]}"
            cv2.putText(frame_with_overlay, step_text, (10, height-50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Show "Skip to Compressions" button
            cv2.rectangle(frame_with_overlay, (width-200, height-80), (width-10, height-20), (0, 255, 0), -1)
            cv2.putText(frame_with_overlay, "Skip to Compressions", (width-190, height-45), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
            
            cv2.imshow('Improved CPR Assistant - Walkthrough Mode', frame_with_overlay)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('n'):
                self.current_step += 1
                if self.current_step >= len(self.walkthrough_steps):
                    self.current_step = 0
            elif key == ord('s'):
                self.run_feedback_mode()
                break
            elif key == ord('u'):  # Upload session
                self.upload_session_to_cloud()
    
    def run_feedback_mode(self):
        """Run real-time feedback mode"""
        self.mode = "feedback"
        self.metronome_active = True
        self.flash_timer = time.time()
        
        while self.running:
            ret, frame = self.camera.read()
            if not ret:
                break
            
            # Blur faces for privacy
            frame = self.blur_face(frame)
            
            processed_frame, pose_results, hands_results = self.process_frame(frame)
            frame_with_overlay = self.add_visual_overlay(processed_frame)
            
            cv2.imshow('Improved CPR Assistant - Feedback Mode', frame_with_overlay)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('u'):  # Upload session
                self.upload_session_to_cloud()
    
    def show_mode_selection(self):
        """Show mode selection window"""
        root = tk.Tk()
        root.title("Improved CPR Assistant")
        root.geometry("500x400")
        root.configure(bg='#2c3e50')
        
        title_label = tk.Label(root, text="Improved CPR Assistant", 
                              font=('Arial', 24, 'bold'), 
                              fg='white', bg='#2c3e50')
        title_label.pack(pady=20)
        
        # Features list
        features_text = """
        🎯 Improved BPM calculation (last 4 beats)
        📊 Better compression detection
        ☁️ Cloud upload for model training
        🔒 Face blurring for privacy
        📱 Real-time feedback
        """
        
        features_label = tk.Label(root, text=features_text, 
                                font=('Arial', 12), fg='white', bg='#2c3e50',
                                justify='left')
        features_label.pack(pady=10)
        
        walkthrough_btn = tk.Button(root, text="Walkthrough Mode\n(Step-by-step guidance)", 
                                  font=('Arial', 14), 
                                  command=lambda: self.start_mode("walkthrough", root),
                                  bg='#3498db', fg='white', 
                                  width=20, height=3)
        walkthrough_btn.pack(pady=10)
        
        feedback_btn = tk.Button(root, text="Feedback Mode\n(For trained responders)", 
                                font=('Arial', 14), 
                                command=lambda: self.start_mode("feedback", root),
                                bg='#e74c3c', fg='white', 
                                width=20, height=3)
        feedback_btn.pack(pady=10)
        
        instructions = tk.Label(root, 
                               text="Controls:\n• 'Q' to quit\n• 'N' for next step (Walkthrough)\n• 'S' to skip to compressions\n• 'U' to upload session", 
                               font=('Arial', 10), 
                               fg='white', bg='#2c3e50')
        instructions.pack(pady=10)
        
        root.mainloop()
    
    def start_mode(self, mode, root):
        """Start the selected mode"""
        self.mode = mode
        root.destroy()
        
        if mode == "walkthrough":
            self.run_walkthrough_mode()
        else:
            self.run_feedback_mode()
    
    def run(self):
        """Main application loop"""
        try:
            self.initialize_camera()
            self.running = True
            self.show_mode_selection()
            
        except Exception as e:
            print(f"Error: {e}")
            messagebox.showerror("Error", f"Failed to initialize: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Cleanup resources"""
        self.running = False
        
        if self.camera:
            self.camera.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    app = CPRAssistant()
    app.run()
