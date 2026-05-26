#!/bin/bash
echo "Starting backend on :3002..."
node backend/server.js &
BACKEND_PID=$!

echo "Starting frontend on :5174..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Open: http://localhost:5174"
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
