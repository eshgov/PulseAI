# PulseAI - CPR Training App

A web-based CPR training application that provides real-time feedback on compression rate, depth, and hand placement using computer vision.

## Features

- **Real-time Face Blurring**: Uses OpenCV.js to detect and blur faces for privacy
- **Pose Detection**: TensorFlow.js MoveNet for real-time body pose tracking
- **CPR Metrics**:
  - Compression Rate (BPM) from wrist movement
  - Compression Depth (mm) from hand-to-shoulder distance
  - Hand Placement accuracy
- **Color-coded Feedback**: Green (good), Orange (minor issues), Red (critical)
- **Mock Upload**: Simulated session upload for demo purposes

## Technologies

- React + TypeScript + Vite
- TensorFlow.js (MoveNet model)
- OpenCV.js (Face detection and blurring)
- TailwindCSS (Styling)
- Framer Motion (Animations)

## Running Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**:
   Navigate to `http://localhost:5173`

4. **Allow camera permissions** when prompted

## Usage

1. Position yourself in front of the camera
2. Perform CPR compressions on a training manikin (or simulate the motion)
3. View real-time feedback on:
   - BPM (target: 100-120)
   - Compression depth (target: 45-60mm)
   - Hand placement (should be centered)
4. Adjust your technique based on the color-coded feedback

## Important Note

**This is a training app. Call 911 in real emergencies.**

## Project Structure

```
frontend/
  src/
    components/
      CameraFeed.tsx      # Webcam, face blur, pose detection
      FeedbackPanel.tsx   # Metrics display
      UploadMock.tsx      # Upload animation
    utils/
      cprLogic.ts         # BPM, depth, placement calculations
      throttler.ts        # Throttle utilities
    App.tsx               # Main app component
    main.tsx              # Entry point
```

## Browser Compatibility

- Requires a modern browser with WebGL support
- Camera access required
- Works best in Chrome, Firefox, or Edge

## Development

- Development server runs on port 5173
- Hot module replacement enabled
- TypeScript strict mode enabled

## License

MIT

