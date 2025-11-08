const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store camera stream data
let cameraData = null;

// Endpoint to receive camera data from phone
app.post('/api/camera-data', (req, res) => {
  cameraData = req.body;
  console.log('Received camera data from phone:', {
    timestamp: new Date().toISOString(),
    hasImage: !!cameraData.image
  });
  res.json({ success: true, message: 'Camera data received' });
});

// Endpoint to get camera data
app.get('/api/camera-data', (req, res) => {
  res.json(cameraData || { message: 'No camera data yet' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running', 
    timestamp: new Date().toISOString(),
    message: 'Server is ready to receive camera data'
  });
});

// Load SSL certificates
let httpsOptions = null;
try {
  const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');
  const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    console.log('✅ SSL certificates loaded');
  } else {
    console.log('⚠️  SSL certificates not found, falling back to HTTP');
  }
} catch (err) {
  console.log('⚠️  Error loading SSL certificates:', err.message);
}

// Start server with HTTPS if certificates are available, otherwise HTTP
if (httpsOptions) {
  https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTPS Server running on https://localhost:${PORT}`);
    console.log(`📱 Access from your phone at: https://YOUR_LAPTOP_IP:${PORT}`);
    console.log(`\nTo find your laptop IP:`);
    console.log(`  macOS: ifconfig | grep "inet " | grep -v 127.0.0.1`);
    console.log(`  Or check System Preferences > Network`);
  });
} else {
  const http = require('http');
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
    console.log(`📱 Access from your phone at: http://YOUR_LAPTOP_IP:${PORT}`);
    console.log(`\n⚠️  Note: For camera access on iOS, HTTPS is recommended`);
    console.log(`  Run './generate-cert.sh' to generate SSL certificates`);
  });
}

