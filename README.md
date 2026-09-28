# WeatherGPT Web - AI-Powered Conversational Weather Intelligence

A full-stack web application that combines weather APIs, machine learning predictions, and conversational AI to provide intelligent weather information through a natural language interface.

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI   │────▶│  PostgreSQL │
│  Frontend   │     │   Backend   │     │  Database   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐
         │Open-Meteo│  │ Gemini  │  │ XGBoost │
         │ Weather  │  │   LLM   │  │ Models  │
         └─────────┘  └─────────┘  └─────────┘
```

## ✨ Features

- **Real-time Weather**: Current conditions, 7-day hourly/daily forecasts
- **ML Predictions**: XGBoost models for temperature and rain probability
- **Conversational AI**: Natural language queries via Google Gemini
- **Historical Analysis**: Temperature/rainfall trends with charts
- **Weather Alerts**: Severe weather warnings display
- **Multi-location Support**: Search and save locations worldwide
- **Responsive UI**: Works on desktop and mobile

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 (AsyncPG) |
| ML | XGBoost, scikit-learn, pandas |
| LLM | Google Gemini (gemini-1.5-flash) |
| Weather | Open-Meteo (ECMWF IFS) |
| Charts | Chart.js / react-chartjs-2 |
| Deployment | Docker Compose |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Google Gemini API key (free at [Google AI Studio](https://aistudio.google.com/apikey))

### 1. Clone and Configure

```bash
cd weathergpt-web

# Copy environment template
cp backend/.env.example backend/.env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_key_here
```

### 2. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Train ML Models (Optional)

```bash
# Run training with profile
docker-compose --profile ml up ml-trainer
```

## 📡 API Endpoints

### Weather
- `GET /api/weather/current` - Current weather
- `GET /api/weather/forecast` - 7-day forecast
- `GET /api/weather/historical` - Historical analysis
- `GET /api/weather/alerts` - Active alerts
- `GET /api/weather/locations/search` - Location search

### Chat
- `POST /api/chat` - Send message to WeatherGPT
- `GET /api/chat/history/{session_id}` - Get chat history

## 💬 Example Queries

- "What's the weather in Mumbai today?"
- "Will it rain tomorrow in Bangalore?"
- "What's the temperature forecast for this week?"
- "Show me historical rainfall trends for Delhi"
- "Are there any weather alerts for Chennai?"
- "Should I carry an umbrella tomorrow?"

## 🔧 Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env
uvicorn main:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## 📁 Project Structure

```
weathergpt-web/
├── backend/
│   ├── api/           # FastAPI routes
│   ├── services/      # Business logic
│   ├── models/        # SQLAlchemy models
│   ├── database.py    # DB connection
│   ├── config.py      # Settings
│   ├── main.py        # App entry
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API clients
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Helpers
│   └── package.json
├── ml/
│   └── train.py       # ML training script
├── docker-compose.yml
└── README.md
```

## 🤖 ML Models

### Temperature Prediction (XGBoost Regressor)
- **Features**: Current weather, time features, lag features (1h, 3h, 24h)
- **Horizons**: 1h, 3h, 6h, 12h, 24h
- **Metrics**: MAE, RMSE, R²

### Rain Prediction (XGBoost Classifier)
- **Features**: Humidity, cloud cover, pressure, rainfall history
- **Horizons**: 1h, 3h, 6h, 12h, 24h
- **Metrics**: Accuracy, Precision, Recall, F1, AUC

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `IMD_API_KEY` | IMD API key for alerts | No |
| `FETCH_INTERVAL_MINUTES` | Weather fetch interval | No (default: 30) |

## 📊 Data Sources

- **Primary**: Open-Meteo (ECMWF IFS, GFS, ICON models)
- **Historical**: Open-Meteo Archive API
- **Alerts**: IMD (India Meteorological Department) - optional

## 📝 License

MIT License - Built for educational and hackathon purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request