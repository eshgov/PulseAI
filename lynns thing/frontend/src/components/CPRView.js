import React, { useState, useRef, useCallback } from 'react'; // 1. Import useCallback
import { useSearchParams } from 'react-router-dom';
import CameraFeed from './CameraFeed';
import FeedbackDisplay from './FeedbackDisplay';
import OverlayCanvas from './OverlayCanvas';
import useCPRWebSocket from '../hooks/useCPRWebSocket';

function CPRView() {
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  
  // Get mode from URL, default to 'feedback' if not specified
  const mode = searchParams.get('mode') || 'feedback';

  // State to hold the latest feedback from the server
  const [feedback, setFeedback] = useState({
    bpm: 0,
    count: 0,
    message: "Initializing...",
    // We'll add pose data later
  });

  // 2. Stabilize the onMessage function
  // This function will now be "memoized" and won't be re-created on every render.
  // This will stop the WebSocket from disconnecting.
  const onSocketMessage = useCallback((data) => {
    setFeedback(data); // Update state with data from backend
  }, []); // The dependency array is empty, so this function never changes

  // Custom hook to handle WebSocket connection
  useCPRWebSocket({
    videoRef,
    onMessage: onSocketMessage // 3. Pass the stabilized function
  });

  // Walkthrough-specific UI (from cpr app.pdf)
  const renderWalkthroughUI = () => (
    <div className="walkthrough-controls">
      <p>Step 1: Check for responsiveness.</p>
      <button className="skip-button">Skip to Compressions</button>
    </div>
  );

  return (
    <div className="cpr-view-container">
      {/* The FeedbackDisplay is the main UI overlay */}
      <FeedbackDisplay
        bpm={feedback.bpm}
        count={feedback.count}
        message={feedback.message}
      />
      
      {/* The CameraFeed handles getting and displaying the video */}
      <CameraFeed ref={videoRef} />
      
      {/* The OverlayCanvas will be used to draw pose skeletons */}
      <OverlayCanvas />

      {/* Show step-by-step UI only if in walkthrough mode */}
      {mode === 'walkthrough' && renderWalkthroughUI()}
    </div>
  );
}

export default CPRView;