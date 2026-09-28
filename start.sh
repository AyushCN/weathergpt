#!/bin/bash
# WeatherGPT Web - Startup Script

set -e

echo "🌤️  Starting WeatherGPT Web Application"
echo "========================================"

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  No backend/.env found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env and add your GEMINI_API_KEY"
    echo "   Get a free key at: https://aistudio.google.com/apikey"
    exit 1
fi

# Check for Gemini API key
if grep -q "your_gemini_api_key_here" backend/.env; then
    echo "⚠️  Please set your GEMINI_API_KEY in backend/.env"
    echo "   Get a free key at: https://aistudio.google.com/apikey"
    exit 1
fi

echo "✅ Environment configured"

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check health
echo "🔍 Checking service health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    echo "   Waiting for backend... ($i/30)"
    sleep 2
done

echo ""
echo "🎉 WeatherGPT is running!"
echo ""
echo "📱 Frontend:  http://localhost:5173"
echo "🔧 Backend:   http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "💡 Try asking: 'What's the weather in Bangalore?'"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"