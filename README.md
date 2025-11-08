# PulseAI App

A comprehensive CPR guidance application using Python, MediaPipe, and AI-powered assistance. This app provides real-time feedback for CPR performance using pose estimation and intelligent guidance.

## Features

### 🎯 Core Functionality
- **Real-time pose estimation** using MediaPipe for hand and body tracking
- **AI-powered CPR guidance** with LLM integration for intelligent Q&A
- **Audio/visual metronome** at 100-120 BPM for proper rhythm
- **Live performance feedback** on compression depth, rhythm, and hand placement
- **Voice input** for asking CPR questions
- **Step-by-step walkthrough** for untrained users
- **Real-time feedback mode** for trained responders

### 🎮 Two Operating Modes

#### Walkthrough Mode
- Step-by-step CPR guidance
- Spoken and on-screen prompts
- Auto-advancing steps with pause detection
- "Skip to Compressions" option
- Perfect for untrained bystanders

#### Feedback Mode
- Immediate real-time feedback
- Live camera overlay with pose estimation
- Metronome starts automatically when needed
- Compression counting and breath prompts
- Ideal for trained responders

### 🤖 AI-Powered Features
- **LLM Integration**: Ask CPR questions and get intelligent responses
- **Performance Analysis**: Real-time feedback on technique
- **Emergency Guidance**: Step-by-step emergency response
- **Voice Recognition**: Speak questions instead of typing

## Installation

### Prerequisites
- Python 3.8 or higher
- Webcam or camera device
- Microphone (for voice input)

### Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd PulseAI
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Optional: Set up OpenAI API** (for enhanced LLM features):
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Dependencies

The app requires the following Python packages:
- `opencv-python`: Computer vision and camera handling
- `mediapipe`: Pose estimation and hand tracking
- `numpy`: Numerical computations
- `requests`

## Usage

### Basic Usage

1. **Run the application**:
```bash
python cpr_assistant.py
```

2. **Select your mode**:
   - **Walkthrough Mode**: For step-by-step guidance
   - **Feedback Mode**: For real-time feedback

3. **Follow the on-screen instructions**

### Controls

During CPR practice:
- **'Q'**: Quit the application
- **'A'**: Open Q&A assistant
- **'N'**: Next step (Walkthrough mode)
- **'S'**: Skip to compressions (Walkthrough mode)

### Q&A Assistant

The AI-powered Q&A system can answer questions like:
- "What's the correct compression rate?"
- "How deep should I compress?"
- "Where do I place my hands?"
- "When do I give rescue breaths?"
- "What if I'm alone?"

## Technical Details

### Pose Estimation
- Uses MediaPipe for real-time pose and hand tracking
- Tracks hand placement relative to chest center
- Monitors compression depth and rhythm
- Provides visual feedback with color-coded indicators

### Performance Metrics
- **BPM Tracking**: Real-time compression rate monitoring
- **Hand Placement Score**: Accuracy of hand positioning
- **Compression Depth**: Estimated compression depth
- **Rhythm Analysis**: Consistency of compression timing

### Audio Features
- **Metronome**: Audio/visual beat at 100-120 BPM
- **Voice Guidance**: Spoken instructions and feedback
- **Voice Input**: Ask questions using speech recognition
- **Audio Feedback**: Immediate performance corrections

## Safety Features

### Emergency Information
- Persistent "Call 911!" display
- Emergency response guidance
- Safety-first approach to CPR instruction

### Accuracy Measures
- Based on current AHA (American Heart Association) guidelines
- Real-time feedback prevents poor technique
- AI guidance ensures up-to-date information

## Troubleshooting

### Common Issues

1. **Camera not detected**:
   - Ensure camera is connected and not used by other applications
   - Check camera permissions

2. **Audio issues**:
   - Verify microphone permissions
   - Check audio device settings

3. **Performance issues**:
   - Close other applications to free up resources
   - Ensure good lighting for pose estimation

### System Requirements
- **OS**: Windows, macOS, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Camera**: USB webcam or built-in camera
- **Audio**: Microphone and speakers/headphones

## Development

### Project Structure
```
PulseAI/
├── cpr_assistant.py            # Main application
├── run_cpr.py                  # Run application
├── requirements.txt            # Dependencies
└── README.md                   # This file
```

## Disclaimer

This application is for educational and training purposes only. It is not a substitute for proper CPR certification or professional medical training. Always call 911 in emergency situations and seek proper medical training.

---

**Remember**: This app is designed to assist with CPR training and guidance. In real emergency situations, always call 911 immediately and follow proper emergency protocols.
