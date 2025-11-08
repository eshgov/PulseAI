import { useEffect, useRef } from 'react';
// The URL of our (future) backend WebSocket server
const WEBSOCKET_URL = "ws://localhost:8000/ws/cpr";
const FRAME_INTERVAL_MS = 100; // Send ~10 frames per second

function useCPRWebSocket({ videoRef, onMessage }) {
  const ws = useRef(null); // Ref to hold the WebSocket instance

  useEffect(() => {
    // 1. Initialize WebSocket connection
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    // 3. Handle incoming messages from the server
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data); // Pass the data to our CPRView state
      } catch (err) {
        console.error("Error parsing message from server:", err);
      }
    };

    // 4. Set up an interval to send video frames
    const frameSender = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN && videoRef.current) {
        sendFrame(videoRef.current);
      }
    }, FRAME_INTERVAL_MS);

    // 5. Cleanup on unmount
    return () => {
      clearInterval(frameSender); // Stop sending frames
      if (ws.current) {
        ws.current.close(); // Close WebSocket connection
      }
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, onMessage]); // Re-run if these props change

  const sendFrame = (video) => {
    // --- FIX 1: ADD A GUARD ---
    // Wait until the video's metadata (like width/height) is loaded
    if (!video.videoWidth || video.videoWidth === 0) {
      console.log("Video not ready, skipping frame.");
      return;
    }

    // Create a temporary canvas to draw the frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // --- FIX 2: INCREASE JPEG QUALITY ---
    // Get the frame as a JPEG image and send it
    // We'll use 0.7 (70%) quality.
    const dataURL = canvas.toDataURL('image/jpeg', 0.7);
    
    // Send the base64-encoded image data
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        image: dataURL
      }));
    }
  };
}

export default useCPRWebSocket;