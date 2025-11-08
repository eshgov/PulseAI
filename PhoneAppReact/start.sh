#!/bin/bash

echo "🚀 Starting Phone Camera App..."
echo ""

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
else
    IP="YOUR_LAPTOP_IP"
fi

echo "📱 Your laptop IP address: $IP"
echo ""
echo "To access from your phone, open Safari and go to:"
echo "   http://$IP:3000"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start both client and server
npm run dev

