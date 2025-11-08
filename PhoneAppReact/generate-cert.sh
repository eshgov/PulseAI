#!/bin/bash

echo "🔐 Generating self-signed SSL certificate..."

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    IP=$(hostname -I | awk '{print $1}')
else
    IP="localhost"
fi

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate private key
openssl genrsa -out certs/key.pem 2048

# Generate certificate with IP and localhost as Subject Alternative Names
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=$IP" \
  -addext "subjectAltName=IP:$IP,IP:127.0.0.1,IP:0.0.0.0,DNS:localhost"

echo "✅ Certificate generated in certs/ directory"
echo "📱 Your IP: $IP"
echo ""
echo "⚠️  Note: You'll need to trust this certificate on your iPhone:"
echo "   1. Open https://$IP:3000 on your iPhone"
echo "   2. Tap 'Advanced' when you see the security warning"
echo "   3. Tap 'Proceed to $IP (unsafe)'"
echo "   4. Or install the certificate via Settings > General > About > Certificate Trust Settings"

