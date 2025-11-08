import React, { useRef, useEffect } from 'react';

function OverlayCanvas() {
  const canvasRef = useRef(null);

  // We'll add drawing logic here in a future step
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas dimensions to match the window
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  return (
    <canvas ref={canvasRef} className="overlay-canvas" />
  );
}

export default OverlayCanvas;