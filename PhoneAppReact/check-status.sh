#!/bin/bash

echo "🔍 Checking server status..."
echo ""

# Check port 3001 (Express server)
echo "📡 Backend Server (port 3001):"
if lsof -i :3001 > /dev/null 2>&1; then
    echo "   ✅ Running"
    RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)
    if [ -n "$RESPONSE" ]; then
        echo "   ✅ Health check: OK"
        echo "   Response: $RESPONSE"
    else
        echo "   ⚠️  Health check: No response (may still be starting)"
    fi
else
    echo "   ❌ Not running"
fi

echo ""

# Check port 3000 (React app)
echo "⚛️  React App (port 3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Running"
    echo "   Access at: http://localhost:3000"
else
    echo "   ❌ Not running"
fi

echo ""

# Get IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -n "$IP" ]; then
    echo "📱 Access from phone:"
    echo "   http://$IP:3000"
fi

echo ""
echo "💡 To view logs, check the terminal where you ran 'npm run dev'"

