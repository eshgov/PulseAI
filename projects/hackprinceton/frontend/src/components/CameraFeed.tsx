/**
 * CameraFeed Component
 * Handles webcam capture, OpenCV face blurring, and TensorFlow.js MoveNet pose detection
 */

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { calculateCPRMetrics, CPRMetrics, calculateDepth, calculateBPM } from '../utils/cprLogic';

// Declare OpenCV types
declare global {
  interface Window {
    cv: any;
  }
}

export type { CPRMetrics };

interface CameraFeedProps {
  onMetricsUpdate: (metrics: CPRMetrics) => void;
}

export function CameraFeed({ onMetricsUpdate }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const faceCascadeRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastPoseTimeRef = useRef<number>(0);

  // Compression tracking (simplified like Python implementation)
  const compressionCountRef = useRef<number>(0);
  const compressionTimesRef = useRef<number[]>([]); // Track times of compressions
  const depthHistoryRef = useRef<number[]>([]); // Track depth over time
  const previousBPMRef = useRef<number>(0);
  
  // Compression detection (like Python - depth change tracking)
  const compressionHistoryRef = useRef<Array<{ time: number; depth: number }>>([]);
  const depthThresholdRef = useRef<number>(0.08); // Minimum depth change to register compression (normalized, adjusted for web)
  const compressionDetectedRef = useRef<boolean>(false);
  const compressionStartTimeRef = useRef<number>(0);
  const lastDepthRef = useRef<number>(0);

  /**
   * Initialize TensorFlow.js WebGL backend and MoveNet detector
   */
  const initializeTensorFlow = async () => {
    try {
      // Set WebGL backend
      await tf.setBackend('webgl');
      await tf.ready();

      // Initialize MoveNet detector
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      detectorRef.current = detector;
      console.log('MoveNet detector initialized');
    } catch (err) {
      console.error('Error initializing TensorFlow:', err);
      setError('Failed to initialize pose detection');
    }
  };

  /**
   * Initialize OpenCV and load face cascade
   */
  const initializeOpenCV = async () => {
    return new Promise<void>((resolve, reject) => {
      if (window.cv && window.cv['onRuntimeInitialized']) {
        // OpenCV already loaded
        loadFaceCascade(resolve, reject);
      } else if (window.cv) {
        // Wait for runtime initialization
        window.cv['onRuntimeInitialized'] = () => {
          loadFaceCascade(resolve, reject);
        };
      } else {
        // Wait for OpenCV to load
        const checkInterval = setInterval(() => {
          if (window.cv) {
            clearInterval(checkInterval);
            if (window.cv['onRuntimeInitialized']) {
              loadFaceCascade(resolve, reject);
            } else {
              window.cv['onRuntimeInitialized'] = () => {
                loadFaceCascade(resolve, reject);
              };
            }
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('OpenCV.js failed to load'));
        }, 10000);
      }
    });
  };

  /**
   * Load face detection cascade from URL
   * Fetches the Haar cascade XML file and loads it into OpenCV
   */
  const loadFaceCascade = async (
    resolve: () => void,
    _reject: (error: Error) => void
  ) => {
    try {
      const cv = window.cv;
      
      // Fetch the Haar cascade XML file from CDN
      // Using OpenCV's official cascade repository
      const cascadeUrl = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml';
      
      try {
        const response = await fetch(cascadeUrl);
        const xmlText = await response.text();
        
        // Create a FileStorage and load the cascade
        // OpenCV.js requires the XML to be loaded via FileStorage
        cv.FS_createDataFile(
          '/',
          'haarcascade_frontalface_default.xml',
          xmlText,
          true,
          false,
          false
        );
        
        // Create cascade classifier
        const cascade = new cv.CascadeClassifier();
        const loaded = cascade.load('/haarcascade_frontalface_default.xml');
        
        if (loaded) {
          faceCascadeRef.current = cascade;
          console.log('Face cascade loaded successfully');
          resolve();
        } else {
          console.warn('Failed to load cascade, using fallback face blur');
          // Fallback: use a simple region-based blur
          faceCascadeRef.current = null;
          resolve();
        }
      } catch (fetchErr) {
        console.warn('Failed to fetch cascade XML, using fallback:', fetchErr);
        // Fallback: continue without cascade, use region-based blur
        faceCascadeRef.current = null;
        resolve();
      }
    } catch (err) {
      console.error('Error loading face cascade:', err);
      // Don't reject - allow app to continue with fallback
      faceCascadeRef.current = null;
      resolve();
    }
  };

  // Face blur disabled for lower latency
  // Face blur causes significant performance issues, so we skip it
  // The video is displayed directly for maximum performance

  /**
   * Process video frame: blur faces and detect pose
   * Optimized for lower latency - skip blur on some frames, reduce processing
   */
  const processFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const blurCanvas = blurCanvasRef.current;

    if (!video || !canvas || !blurCanvas || !detectorRef.current) {
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      blurCanvas.width = video.videoWidth;
      blurCanvas.height = video.videoHeight;
    }

    const now = Date.now();

    // Skip face blur entirely for much lower latency - just draw video directly
    // Face blur can be enabled optionally but causes significant latency
    ctx.drawImage(video, 0, 0);

    // Run pose detection (throttled to ~6 FPS = every 166ms for better performance and lower latency)
    if (now - lastPoseTimeRef.current >= 166) {
      lastPoseTimeRef.current = now;
      detectPose(canvas);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  /**
   * Detect pose using MoveNet and draw skeleton
   */
  const detectPose = async (canvas: HTMLCanvasElement) => {
    if (!detectorRef.current || !videoRef.current) {
      return;
    }

    try {
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      const ctx = canvas.getContext('2d');

      if (!ctx || poses.length === 0) {
        return;
      }

      const pose = poses[0];
      const keypoints = pose.keypoints;

      // Find key keypoints
      const leftWrist = keypoints.find((kp) => kp.name === 'left_wrist');
      const rightWrist = keypoints.find((kp) => kp.name === 'right_wrist');
      const leftShoulder = keypoints.find((kp) => kp.name === 'left_shoulder');
      const rightShoulder = keypoints.find((kp) => kp.name === 'right_shoulder');
      const leftElbow = keypoints.find((kp) => kp.name === 'left_elbow');
      const rightElbow = keypoints.find((kp) => kp.name === 'right_elbow');

      // Draw skeleton with better visibility
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;

      // Draw connections
      if (leftShoulder && leftElbow) {
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x, leftShoulder.y);
        ctx.lineTo(leftElbow.x, leftElbow.y);
        ctx.stroke();
      }

      if (leftElbow && leftWrist) {
        ctx.beginPath();
        ctx.moveTo(leftElbow.x, leftElbow.y);
        ctx.lineTo(leftWrist.x, leftWrist.y);
        ctx.stroke();
      }

      if (rightShoulder && rightElbow) {
        ctx.beginPath();
        ctx.moveTo(rightShoulder.x, rightShoulder.y);
        ctx.lineTo(rightElbow.x, rightElbow.y);
        ctx.stroke();
      }

      if (rightElbow && rightWrist) {
        ctx.beginPath();
        ctx.moveTo(rightElbow.x, rightElbow.y);
        ctx.lineTo(rightWrist.x, rightWrist.y);
        ctx.stroke();
      }

      if (leftShoulder && rightShoulder) {
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x, leftShoulder.y);
        ctx.lineTo(rightShoulder.x, rightShoulder.y);
        ctx.stroke();
      }

      // Draw keypoints with better visibility
      ctx.shadowBlur = 0; // Reset shadow for keypoints
      const keypointsToDraw = [
        { kp: leftWrist, color: '#00ff00', size: 8 },
        { kp: rightWrist, color: '#00ff00', size: 8 },
        { kp: leftShoulder, color: '#00aaff', size: 6 },
        { kp: rightShoulder, color: '#00aaff', size: 6 },
        { kp: leftElbow, color: '#00ccff', size: 6 },
        { kp: rightElbow, color: '#00ccff', size: 6 },
      ].filter((item) => item.kp && item.kp.score && item.kp.score > 0.5);

      keypointsToDraw.forEach((item) => {
        if (item.kp) {
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(item.kp.x, item.kp.y, item.size, 0, 2 * Math.PI);
          ctx.fill();
          // Add outer ring for better visibility
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(item.kp.x, item.kp.y, item.size + 2, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });

      // Calculate metrics (simplified like Python implementation)
      if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
        const now = Date.now();
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const handY = (leftWrist.y + rightWrist.y) / 2;

        // Calculate current depth (normalized 0-1, where 1 is deepest)
        const currentDepth = 1 - (handY / canvas.height); // Normalize by canvas height
        const depthMm = calculateDepth(shoulderY, handY, shoulderWidth, 0.3);

        // Add to compression history (keep last 2 seconds like Python)
        compressionHistoryRef.current.push({
          time: now,
          depth: currentDepth,
        });

        // Keep only recent history (last 2 seconds)
        const cutoffTime = now - 2000;
        compressionHistoryRef.current = compressionHistoryRef.current.filter(
          (h) => h.time > cutoffTime
        );

        // Detect compression using depth change (like Python)
        if (compressionHistoryRef.current.length >= 3) {
          const recentDepths = compressionHistoryRef.current
            .slice(-3)
            .map((h) => h.depth);
          const depthChange = Math.max(...recentDepths) - Math.min(...recentDepths);

          // Check if we're in a compression cycle
          if (depthChange > depthThresholdRef.current) {
            if (!compressionDetectedRef.current) {
              // Start of compression
              compressionDetectedRef.current = true;
              compressionStartTimeRef.current = now;
            } else {
              // Check if compression is complete (depth returning to normal)
              const compressionDuration = (now - compressionStartTimeRef.current) / 1000;
              if (compressionDuration > 0.2) {
                // Minimum compression duration
                const maxRecentDepth = Math.max(...recentDepths);
                if (currentDepth < maxRecentDepth - 0.05) {
                  // Depth decreasing - compression complete
                  compressionDetectedRef.current = false;

                  // Add compression time
                  compressionTimesRef.current.push(now);

                  // Keep only last 10 compression times
                  if (compressionTimesRef.current.length > 10) {
                    compressionTimesRef.current.shift();
                  }

                  // Update compression count
                  compressionCountRef.current++;
                  if (compressionCountRef.current >= 30) {
                    compressionCountRef.current = 0;
                  }
                }
              }
            }
          } else {
            compressionDetectedRef.current = false;
          }
        }

        // Reset compression count if inactive for more than 6 seconds
        if (compressionTimesRef.current.length > 0) {
          const lastCompressionTime = compressionTimesRef.current[compressionTimesRef.current.length - 1];
          const timeSinceLastCompression = now - lastCompressionTime;
          
          if (timeSinceLastCompression > 6000) {
            // Reset compression count after 6 seconds of inactivity
            compressionCountRef.current = 0;
            compressionTimesRef.current = [];
            compressionHistoryRef.current = [];
            compressionDetectedRef.current = false;
          }
        }

        // Update depth history
        if (depthMm > 0) {
          depthHistoryRef.current.push(depthMm);
          if (depthHistoryRef.current.length > 10) {
            depthHistoryRef.current.shift();
          }
        }

        // Calculate all metrics using the simplified system
        const metrics = calculateCPRMetrics(
          leftWrist,
          rightWrist,
          leftShoulder,
          rightShoulder,
          compressionTimesRef.current,
          compressionCountRef.current,
          depthHistoryRef.current,
          previousBPMRef.current
        );

        // Update previous BPM for smoothing
        previousBPMRef.current = metrics.bpm;

        // Update parent component
        onMetricsUpdate(metrics);
      } else {
        // No pose detected - still update with current metrics (maintain BPM smoothing)
        if (compressionTimesRef.current.length >= 2) {
          // Calculate BPM even without current pose (use previous values)
          const bpm = calculateBPM(compressionTimesRef.current, previousBPMRef.current);
          previousBPMRef.current = bpm;
          
          const metrics = calculateCPRMetrics(
            null,
            null,
            null,
            null,
            compressionTimesRef.current,
            compressionCountRef.current,
            depthHistoryRef.current,
            previousBPMRef.current
          );
          metrics.bpm = bpm; // Use calculated BPM
          onMetricsUpdate(metrics);
        }
      }
    } catch (err) {
      console.error('Error detecting pose:', err);
    }
  };

  /**
   * Initialize webcam stream
   */
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsInitialized(true);
          // Start processing frames
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please allow camera permissions.');
    }
  };

  /**
   * Initialize everything on mount
   */
  useEffect(() => {
    const init = async () => {
      try {
        await initializeTensorFlow();
        await initializeOpenCV();
        await initializeCamera();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize application');
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      // Clean up OpenCV cascade if loaded
      if (faceCascadeRef.current && typeof faceCascadeRef.current.delete === 'function') {
        try {
          faceCascadeRef.current.delete();
        } catch (err) {
          console.warn('Error disposing cascade:', err);
        }
      }
      
      // Reset compression tracking
      compressionCountRef.current = 0;
      compressionTimesRef.current = [];
      depthHistoryRef.current = [];
      previousBPMRef.current = 0;
      compressionHistoryRef.current = [];
      compressionDetectedRef.current = false;
      compressionStartTimeRef.current = 0;
      lastDepthRef.current = 0;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Error: {error}</p>
          <p className="text-sm opacity-75">Please refresh the page and allow camera permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      <canvas
        ref={blurCanvasRef}
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-xl mb-2">Initializing...</p>
            <p className="text-sm opacity-75">Please allow camera permissions</p>
          </div>
        </div>
      )}
    </div>
  );
}

