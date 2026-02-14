#!/bin/bash
# MedScribe — One-Click Dev Environment Setup

set -e

echo "🏥 MedScribe — Setting up development environment..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required. Please install it first."
    exit 1
fi
echo "✅ Python 3 found: $(python3 --version)"

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install it first."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   Created virtual environment"
fi

source venv/bin/activate
pip install -r requirements.txt --quiet
echo "   Installed Python dependencies"

cd ..

# Setup .env
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   Created .env from template — please add your GROQ_API_KEY"
else
    echo "   .env already exists"
fi

# Setup frontend
echo ""
echo "📦 Setting up frontend..."
cd frontend
npm install --silent
echo "   Installed Node dependencies"
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add your GROQ_API_KEY to .env"
echo "   2. Start backend:  cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
echo "   3. Start frontend: cd frontend && npm run dev"
echo "   4. Open http://localhost:3000"
