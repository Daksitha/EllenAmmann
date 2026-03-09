#!/bin/bash
echo "==================================================="
echo "Stopping Knowledge Architect"
echo "==================================================="
echo ""

if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    echo "Stopping the Node.js server with PID $PID..."
    kill $PID
    rm server.pid
    echo ""
    echo "Services stopped successfully."
else
    echo "No server.pid file found. The application might not be running or the pid file was removed."
fi
