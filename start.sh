#!/bin/bash
echo "==================================================="
echo "Starting Knowledge Architect"
echo "==================================================="
echo ""

echo "Starting the backend server in the background..."
# Start the server and redirect output to server.log
nohup node server.js > server.log 2>&1 &
# Save the process ID to a file so we can stop it later
echo $! > server.pid

echo "Waiting for the server to initialize..."
sleep 2

echo ""
echo "Services started successfully! Logs are being written to server.log."
echo "Process ID saved to server.pid."
