#!/bin/bash

# CoreDesk - Start Script
# This script starts both the frontend and backend servers

echo "🚀 Starting CoreDesk..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check if required ports are available
echo "🔍 Checking ports..."
check_port 3000
FRONTEND_PORT_FREE=$?
check_port 8000
BACKEND_PORT_FREE=$?

if [ $FRONTEND_PORT_FREE -ne 0 ] || [ $BACKEND_PORT_FREE -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}Please stop any running services on these ports and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ports are available${NC}"
echo ""

# Start backend
echo -e "${BLUE}📦 Starting Backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and start backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo -e "${GREEN}✅ CoreDesk is starting!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to handle script termination
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping CoreDesk...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Wait for both processes
wait
