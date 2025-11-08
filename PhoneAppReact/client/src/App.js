import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

// Dynamically determine API URL based on current hostname
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // Will be 'https:' if using HTTPS
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3001`;
  }
  // If accessing from phone, use the same hostname and protocol
  return `${protocol}//${hostname}:3001`;
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [capturedImage, setCapturedImage] = useState(null);
  const [apiUrl, setApiUrl] = useState(getApiUrl());

  // Update API URL based on current hostname (for phone access)
  useEffect(() => {
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      const newApiUrl = `http://${currentHost}:3001`;
      setApiUrl(newApiUrl);
      console.log('Using API URL:', newApiUrl);
    }
  }, []);

  // Check server connection on mount
  useEffect(() => {
    checkServerConnection();
    const interval = setInterval(checkServerConnection, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const checkServerConnection = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/health`);
      setServerStatus('connected');
    } catch (err) {
      setServerStatus('disconnected');
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      
      // Debug: Check what's available
      console.log('navigator.mediaDevices:', navigator.mediaDevices);
      console.log('navigator.getUserMedia:', navigator.getUserMedia);
      console.log('navigator.webkitGetUserMedia:', navigator.webkitGetUserMedia);
      
      let mediaStream;
      
      // Try modern API first
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Using modern mediaDevices API');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } 
      // Fallback to webkitGetUserMedia for Safari
      else if (navigator.webkitGetUserMedia) {
        console.log('Using webkitGetUserMedia fallback');
        mediaStream = await new Promise((resolve, reject) => {
          navigator.webkitGetUserMedia(
            { video: { facingMode: 'environment' } },
            resolve,
            reject
          );
        });
      }
      // Fallback to getUserMedia
      else if (navigator.getUserMedia) {
        console.log('Using getUserMedia fallback');
        mediaStream = await new Promise((resolve, reject) => {
          navigator.getUserMedia(
            { video: { facingMode: 'environment' } },
            resolve,
            reject
          );
        });
      }
      else {
        throw new Error('Camera API not available. Make sure you are using Safari on iOS and the page is loaded over HTTP/HTTPS.');
      }
      
      if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage = err.message || err.name || String(err);
      setError(`Camera access denied: ${errorMessage}. Make sure you're using Safari on iOS, have granted camera permissions, and are accessing over HTTP (not file://).`);
      console.error('Camera error details:', err);
      console.error('Error stack:', err.stack);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      sendToServer(imageData);
    }
  };

  const sendToServer = async (imageData) => {
    try {
      await axios.post(`${apiUrl}/api/camera-data`, {
        image: imageData,
        timestamp: new Date().toISOString(),
        device: navigator.userAgent
      });
      console.log('Image sent to server successfully');
    } catch (err) {
      console.error('Error sending to server:', err);
      setError(`Failed to send to server: ${err.message}`);
    }
  };

  const startAutoCapture = () => {
    if (!isStreaming) {
      startCamera();
      setTimeout(() => {
        const interval = setInterval(() => {
          if (isStreaming) {
            capturePhoto();
          } else {
            clearInterval(interval);
          }
        }, 2000); // Capture every 2 seconds
      }, 1000);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>📱 Phone Camera App</h1>
        
        <div className="status-indicator">
          <div className={`status-dot ${serverStatus}`}></div>
          <span>
            Server: {serverStatus === 'connected' ? 'Connected' : 
                    serverStatus === 'checking' ? 'Checking...' : 'Disconnected'}
          </span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video-preview"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {capturedImage && (
          <div className="captured-image-container">
            <h3>Last Captured Image:</h3>
            <img src={capturedImage} alt="Captured" className="captured-image" />
          </div>
        )}

        <div className="controls">
          {!isStreaming ? (
            <>
              <button onClick={startCamera} className="btn btn-primary">
                📷 Start Camera
              </button>
              <button onClick={startAutoCapture} className="btn btn-secondary">
                🔄 Auto Capture Mode
              </button>
            </>
          ) : (
            <>
              <button onClick={capturePhoto} className="btn btn-primary">
                📸 Capture Photo
              </button>
              <button onClick={stopCamera} className="btn btn-danger">
                ⏹ Stop Camera
              </button>
            </>
          )}
        </div>

        <div className="info">
          <p>📝 Instructions:</p>
          <ol>
            <li>Make sure the server is running on your laptop</li>
            <li>Allow camera access when prompted</li>
            <li>Use "Capture Photo" to send images to your laptop</li>
            <li>Or use "Auto Capture Mode" for continuous capture</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;

