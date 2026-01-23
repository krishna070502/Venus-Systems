# Start frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!