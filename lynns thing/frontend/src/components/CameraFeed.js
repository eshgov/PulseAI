import React, { useEffect, forwardRef } from 'react';

const CameraFeed = forwardRef((props, ref) => {
  useEffect(() => {
    // Function to get camera access
    const getCamera = async () => {
      if (!ref.current) {
        return;
      }
      try {
        // Request the user's camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 }, // Ask for a reasonable size
            height: { ideal: 480 },
            facingMode: "user" // Use front camera
          }
        });
        
        // Attach the stream to the video element
        ref.current.srcObject = stream;
        
        // Play the video
        ref.current.play().catch(err => {
          console.error("Error playing video:", err);
        });
        
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
      }
    };

    getCamera();

    // Cleanup: stop the stream when the component unmounts
    return () => {
      if (ref.current && ref.current.srcObject) {
        ref.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [ref]); // Re-run if the ref changes

  return (
    <video
      ref={ref}
      className="camera-feed"
      autoPlay
      playsInline
      muted // Mute to allow autoplay in most browsers
    />
  );
});

export default CameraFeed;