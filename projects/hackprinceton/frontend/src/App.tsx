/**
 * PulseAI - CPR Training App
 * 
 * A web-based CPR training application that provides real-time feedback on:
 * - Compression rate (BPM)
 * - Compression depth (mm)
 * - Hand placement
 * 
 * Technologies:
 * - React + TypeScript + Vite
 * - TensorFlow.js MoveNet for pose detection
 * - OpenCV.js for face blurring
 * - TailwindCSS for styling
 * 
 * Running Instructions:
 * 1. Install dependencies: npm install
 * 2. Start development server: npm run dev
 * 3. Open browser to: http://localhost:5173
 * 4. Allow camera permissions when prompted
 * 
 * Note: This is a training app. Call 911 in real emergencies.
 */

import { useState } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { WalkthroughMode } from './components/WalkthroughMode';
import { FeedbackMode } from './components/FeedbackMode';

type AppMode = 'selection' | 'walkthrough' | 'feedback';

function App() {
  const [mode, setMode] = useState<AppMode>('selection');

  const handleModeSelect = (selectedMode: 'walkthrough' | 'feedback') => {
    setMode(selectedMode);
  };

  const handleSkipToCompressions = () => {
    setMode('feedback');
  };

  const handleBackToSelection = () => {
    setMode('selection');
  };

  if (mode === 'selection') {
    return <ModeSelection onSelectMode={handleModeSelect} />;
  }

  if (mode === 'walkthrough') {
    return <WalkthroughMode onSkipToCompressions={handleSkipToCompressions} onBack={handleBackToSelection} />;
  }

  return <FeedbackMode onBack={handleBackToSelection} />;
}

export default App;
