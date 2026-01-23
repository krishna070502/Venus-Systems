# Start backend
echo -e "${BLUE}📦 Starting Backend...${NC}"
cd backend

# Check if virtual environment exists and is valid
# Using a check for the activate script's current directory to see if it's broken
if [ -d "venv" ]; then
    if ! grep -q "$PWD" venv/bin/activate; then
        echo -e "${YELLOW}⚠️  Existing venv appears to be from a different location. Recreating...${NC}"
        rm -rf venv
    fi
fi

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${YELLOW}Installing requirements...${NC}"
    ./venv/bin/pip install -r requirements.txt
fi

# Activate virtual environment and start backend
source venv/bin/activate
# Ensure uvicorn is available, if not try to install it explicitly or from requirements
if ! command -v uvicorn &> /dev/null; then
    echo -e "${YELLOW}uvicorn not found, installing dependencies...${NC}"
    pip install -r requirements.txt
fi

python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!