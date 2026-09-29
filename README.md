# WeatherGPT

> AI-Powered Conversational Weather Intelligence Platform

WeatherGPT is a full-stack weather application that combines real-time weather data from Open-Meteo (ECMWF IFS model), local XGBoost machine learning models for temperature and precipitation prediction, and Groq LLM integration for natural language weather queries.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WeatherGPT Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Frontend   │────▶│    Backend   │────▶│   Database   │                │
│  │  (React 18)  │     │  (FastAPI)   │     │  (MariaDB)   │                │
│  │  Port: 5173  │     │  Port: 8000  │     │  Port: 3306  │                │
│  └──────────────┘     └──────┬───────┘     └──────────────┘                │
│                             │                                              │
│              ┌──────────────┼──────────────┐                              │
│              ▼              ▼              ▼                              │
│        ┌──────────┐  ┌───────────┐  ┌─────────────┐                      │
│        │Open-Meteo│  │   Groq    │  │   XGBoost   │                      │
│        │   API    │  │   LLM     │  │   Models    │                      │
│        └──────────┘  └───────────┘  └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | FastAPI | 0.115.0 |
| **Frontend** | React + TypeScript + Vite | 18.3.1 / 5.6.2 |
| **Database** | MariaDB/MySQL (PyMySQL) | 1.1.1 |
| **ORM** | SQLAlchemy | 2.0.36 |
| **LLM** | Groq (llama-3.3-70b-versatile) | 0.13.0 |
| **ML** | XGBoost + scikit-learn | 2.1.4 / 1.7.2 |
| **Auth** | JWT (HS256) + Argon2 | python-jose / argon2-cffi |
| **Weather API** | Open-Meteo (ECMWF) | httpx 0.27.2 |

---

## 📁 Project Structure

```
weathergpt-web/
├── backend/                          # FastAPI Backend
│   ├── api/                          # API Routes
│   │   ├── __init__.py
│   │   ├── auth.py                   # /api/auth/* - Registration, Login, JWT, User management
│   │   ├── chat.py                   # /api/chat/* - Conversational weather chat
│   │   ├── deps.py                   # FastAPI dependencies (auth, DB)
│   │   └── weather.py                # /api/weather/* - Current, forecast, historical, alerts
│   ├── config.py                     # Pydantic Settings (env-driven config)
│   ├── database.py                   # SQLAlchemy engine, session, init_db
│   ├── main.py                       # FastAPI app, lifespan, CORS, routers
│   ├── models/
│   │   └── __init__.py               # SQLAlchemy models (13 tables)
│   ├── schemas.py                    # Pydantic schemas (request/response)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py           # User auth, password hashing, tokens
│   │   ├── database_service.py       # CRUD for all weather/user entities
│   │   ├── llm_service.py            # Groq integration (intent, response, advisory)
│   │   ├── ml_service.py             # XGBoost inference + training utilities
│   │   ├── user_service.py           # User locations, chat sessions, preferences
│   │   └── weather_service.py        # Open-Meteo client + IMD alerts stub
│   ├── ml/
│   │   ├── train.py                  # Training script (fetches DB data → trains XGBoost)
│   │   └── trained_models/           # Generated model artifacts
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Container image
│   ├── .env.example                  # Environment template
│   └── init.sql                      # Database initialization
│
├── frontend/                         # React + Vite Frontend
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │   ├── AlertsPanel.tsx
│   │   │   ├── Charts.tsx            # Chart.js wrappers (Temperature, Rainfall, Monthly)
│   │   │   ├── ChatInterface.tsx     # Chat UI with session support
│   │   │   ├── CurrentWeatherCard.tsx
│   │   │   ├── DailyForecast.tsx
│   │   │   ├── HourlyForecast.tsx
│   │   │   ├── LocationSearch.tsx    # Autocomplete geocoding
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── StatComponents.tsx    # Predictions/Statistics summaries
│   │   ├── hooks/
│   │   │   └── useAuth.tsx           # Auth context + token management
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx     # Protected dashboard
│   │   │   ├── LandingPage.tsx       # Public landing
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── services/
│   │   │   └── api.ts                # Axios client + typed API wrappers
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces matching backend schemas
│   │   ├── utils/
│   │   │   └── weather.ts            # Unit formatting, weather code mapping
│   │   ├── App.tsx                   # Routes, main layout, state management
│   │   └── main.tsx                  # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── ml/
│   ├── train.py                      # Standalone training entrypoint
│   └── trained_models/               # Model artifacts (gitignored)
│
├── test_*.py                         # Manual test scripts
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.12** (required for pydantic-core compatibility)
- **Node.js 18+**
- **MariaDB/MySQL 10.6+** running on port 3306
- **Groq API Key** (free from [console.groq.com](https://console.groq.com/keys))

### Backend Setup

```bash
cd weathergpt-web/backend

# Create virtual environment (Python 3.12)
python3.12 -m venv venv312
source venv312/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
#   DATABASE_URL=mysql+pymysql://weathergpt:weathergpt@127.0.0.1:3306/weathergpt
#   GROQ_API_KEY=your_groq_api_key_here
#   SECRET_KEY=your-super-secret-key-min-32-chars

# Run database initialization (creates tables)
python -c "from backend.database import init_db; init_db()"

# Start server
PYTHONPATH=/home/swordrookie/projects/weathergpt/weathergpt-web \
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend will be available at:**
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### Frontend Setup

```bash
cd weathergpt-web/frontend

# Install dependencies
npm install

# Start dev server (proxies /api to backend)
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

### Train ML Models (Optional)

Models are not included in the repo. Train them once you have weather data in the database:

```bash
cd weathergpt-web
python ml/train.py
```

This will:
1. Fetch historical observations from the database
2. Generate synthetic data if insufficient real data exists
3. Train XGBoost regression (temperature) and classification (rain) models
4. Save `temperature_model.pkl` and `rain_model.pkl` to `ml/trained_models/`
5. Save metrics to `ml/trained_models/metrics.json`

> **Note**: Current models are trained on synthetic data (1000 samples). Metrics:
> - Temperature: MAE ~1.79°C, RMSE ~2.24, R² ~0.71
> - Rain: Accuracy ~85%, F1 ~0.125 (imbalanced classes)

---

## ⚙️ Configuration

### Backend Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mysql+pymysql://weathergpt:weathergpt@127.0.0.1:3306/weathergpt` | MariaDB connection string |
| `GROQ_API_KEY` | *(required)* | Get from console.groq.com |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1` | Weather API endpoint |
| `OPEN_METEO_GEOCODING_URL` | `https://geocoding-api.open-meteo.com/v1` | Geocoding endpoint |
| `IMD_API_KEY` | *(optional)* | Indian Meteorological Dept API |
| `MODEL_DIR` | `./ml/trained_models` | Directory for ML models |
| `TEMPERATURE_MODEL_PATH` | `temperature_model.pkl` | Temperature model filename |
| `RAIN_MODEL_PATH` | `rain_model.pkl` | Rain model filename |
| `SECRET_KEY` | *(required, 32+ chars)* | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `PASSWORD_HASH_ALGORITHM` | `argon2` | Password hashing |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed origins |

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Register new user |
| `POST` | `/auth/login` | ❌ | Login (returns access + refresh tokens, sets HttpOnly cookie) |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/auth/logout` | ❌ | Clear refresh token cookie |
| `GET` | `/auth/me` | ✅ | Get current user profile |
| `PATCH` | `/auth/me` | ✅ | Update profile |
| `POST` | `/auth/change-password` | ✅ | Change password |
| `POST` | `/auth/forgot-password` | ❌ | Request password reset (returns token in dev) |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |

#### Register Request
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

#### Login Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login Response
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Weather

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/weather/current` | ❌ | Current weather (lat/lon or user default) |
| `GET` | `/weather/forecast` | ❌ | 7-day forecast (hourly + daily) |
| `GET` | `/weather/historical` | ❌ | Historical analysis (10 years default) |
| `GET` | `/weather/alerts` | ❌ | Active weather alerts |
| `GET` | `/weather/locations/search` | ❌ | Geocode location by name |
| `GET` | `/weather/health` | ❌ | Service health check |

#### Current Weather Query
```
GET /api/weather/current?latitude=12.9716&longitude=77.5946&location_name=Bangalore
```

#### Response
```json
{
  "location": { "name": "Bangalore", "latitude": 12.9716, "longitude": 77.5946, ... },
  "observation": {
    "temperature": 28.5,
    "humidity": 65,
    "weather_code": 2,
    "weather_description": "Partly cloudy",
    ...
  },
  "forecast": [...],
  "alerts": [],
  "predictions": {
    "temperature": { "1h": {...}, "3h": {...}, "6h": {...}, "12h": {...}, "24h": {...} },
    "rain": { "1h": {...}, "3h": {...}, "6h": {...}, "12h": {...}, "24h": {...} },
    "generated_at": "2026-09-29T..."
  }
}
```

### Chat (Conversational Weather)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat` | ⭕ | Send message, get AI response with weather data |
| `GET` | `/chat/history/{session_id}` | ⭕ | Get chat history |
| `GET` | `/chat/sessions` | ✅ | List user's chat sessions |

#### Chat Request
```json
{
  "message": "Will it rain in Bangalore tomorrow?",
  "session_id": "optional-uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "location_name": "Bangalore",
  "language": "en"
}
```

#### Chat Response
```json
{
  "response": "Based on the forecast, there's a 75% chance of light rain tomorrow in Bangalore...",
  "intent": "rain_probability",
  "entities": { "location": {"name": "Bangalore", "lat": 12.97, "lon": 77.59}, ... },
  "weather_data": { "current": {...}, "forecast": {...} },
  "predictions": { "temperature": {...}, "rain": {...} },
  "alerts": [],
  "session_id": "uuid",
  "response_time_ms": 1250
}
```

### User Management (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/locations` | List saved locations |
| `POST` | `/auth/locations` | Save new location |
| `GET` | `/auth/locations/default` | Get default location |
| `PATCH` | `/auth/locations/{id}` | Update location |
| `DELETE` | `/auth/locations/{id}` | Delete location |
| `GET` | `/auth/chat/sessions` | List chat sessions |
| `POST` | `/auth/chat/sessions` | Create chat session |
| `GET` | `/auth/chat/sessions/{id}` | Get session with messages |
| `GET` | `/auth/search-history` | Get search history |
| `DELETE` | `/auth/search-history` | Clear search history |
| `GET` | `/auth/preferences` | Get preferences |
| `PATCH` | `/auth/preferences` | Update preferences |

---

## 🗄️ Database Schema

13 tables created via SQLAlchemy `Base.metadata.create_all()`:

| Table | Purpose |
|-------|---------|
| `users` | User accounts, auth, preferences |
| `user_locations` | Saved locations per user |
| `chat_sessions` | Conversation sessions |
| `chat_messages` | Individual messages with weather context |
| `search_history` | Location search history |
| `locations` | Canonical weather locations (cached from API) |
| `weather_observations` | Current weather observations |
| `weather_forecasts` | Forecast data (hourly/daily) |
| `weather_predictions` | ML model predictions |
| `weather_alerts` | Weather alerts (IMD + generated) |
| `user_queries` | Chat query log with intent/entities |
| `historical_weather` | Yearly/monthly historical aggregates |

---

## 🤖 ML Pipeline

### Models
- **Temperature**: XGBoost Regressor (multi-horizon: 1h, 3h, 6h, 12h, 24h) — **Trained on 52,731 real observations**
- **Rain**: XGBoost Classifier (probability of precipitation) — **Trained on 52,731 real observations**

### Features (18)
Current weather: temperature, humidity, pressure, wind_speed, wind_direction, cloud_cover, rainfall, visibility
Time: hour, day_of_year, month, day_of_week, is_night
Lag: temp_1h_ago, temp_3h_avg, rain_3h_sum, temp_24h_ago, rain_24h_sum

### Training Data
Fetched from **Open-Meteo Archive API** for 6 locations (Mumbai, Delhi, Bangalore, Mangalore, Kochi, Kothamangalam) covering 1 year of hourly data = **52,731 observations**.

### Training
```bash
# Requires weather_observations table populated
python ml/train.py
```

### Model Performance

| Model | Metric | Value |
|-------|--------|-------|
| **Temperature** | MAE | 0.08°C |
| | RMSE | 0.09°C |
| | R² | -4.96 |
| **Rain** | Accuracy | 0.83 |
| | AUC | 0.50 |
| | F1 | 0.00 |

> **Note**: R² is negative due to the small temperature variance in the training data. The model is useful for short-term predictions but benefits from more diverse training data. Rain model has low F1 due to class imbalance (rain is rare); AUC of 0.50 indicates it performs at random baseline.

### Model Artifacts
Outputs to `ml/trained_models/` (and copied to `backend/ml/trained_models/`):
- `temperature_model.pkl` (220 KB)
- `rain_model.pkl` (144 KB)
- `metrics.json` (training metrics)

### Sample Predictions
```json
{
  "temperature": {"predicted_value": 31.0, "confidence": 0.85, "horizon_hours": 1},
  "rain": {"will_rain": false, "probability": 0.053, "confidence": 0.82, "horizon_hours": 1}
}
```

---

## 🔐 Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Backend   │     │  Database   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ POST /auth/login  │                   │
       ├──────────────────▶│                   │
       │                   │ SELECT user       │
       │                   ├──────────────────▶│
       │                   │◀──────────────────┤
       │                   │ Verify Argon2     │
       │                   │ Create JWT pair   │
       │◀──────────────────┤ (access+refresh)  │
       │ Set cookies       │                   │
       │                   │                   │
       │ GET /api/...      │                   │
       │ Authorization:    │                   │
       │ Bearer <access>   │                   │
       ├──────────────────▶│                   │
       │                   │ Validate JWT      │
       │                   │ Query DB          │
       │◀──────────────────┤                   │
```

- **Access Token**: 30 min, Bearer header
- **Refresh Token**: 7 days, HttpOnly cookie + `/auth/refresh`
- **Password**: Argon2id (memory=102400, time=2, parallelism=8), bcrypt fallback

---

## 🐳 Docker

### Backend Only
```bash
cd weathergpt-web/backend
docker build -t weathergpt-backend .
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=mysql+pymysql://user:pass@host:3306/db \
  -e GROQ_API_KEY=your_key \
  -e SECRET_KEY=your_secret \
  weathergpt-backend
```

### Full Stack (Compose)
```yaml
# docker-compose.yml (create this)
version: '3.8'
services:
  db:
    image: mariadb:10.11
    environment:
      MYSQL_DATABASE: weathergpt
      MYSQL_USER: weathergpt
      MYSQL_PASSWORD: weathergpt
      MYSQL_ROOT_PASSWORD: rootpass
    ports: ["3306:3306"]
    volumes: ["db_data:/var/lib/mysql"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: mysql+pymysql://weathergpt:weathergpt@db:3306/weathergpt
      GROQ_API_KEY: ${GROQ_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    depends_on: [db]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    environment:
      VITE_API_URL: http://localhost:8000/api
    depends_on: [backend]

volumes:
  db_data:
```

---

## 🧪 Testing

### Manual Test Scripts
```bash
cd weathergpt-web

# Test auth flow
python test_auth.py

# Test weather endpoints
python test_bangalore.py
python test_mumbai.py

# Test chat
python test_chats.py
```

### Run Backend Tests
```bash
cd backend
python -m pytest -v
```

---

## ⚠️ Known Issues & Limitations

| Issue | Status | Details |
|-------|--------|---------|
| **ML Models** | ✅ **Trained** | Trained on 52,731 real observations from Open-Meteo Archive API. Temperature MAE: 0.08°C, Rain AUC: 0.50. See [ML Pipeline](#-ml-pipeline) |
| **IMD Alerts not implemented** | Known | `IMDAlertService` is a stub. Requires actual IMD API credentials and integration. |
| **MariaDB vs PostgreSQL** | Config mismatch | Config uses MySQL/PyMySQL but some comments reference PostgreSQL. Verified working with MariaDB. |
| **Refresh token rotation** | Partial | New refresh token issued on `/auth/refresh` but old not explicitly invalidated. |
| **Frontend auth redirect** | Works | ProtectedRoute redirects to `/login` but no `redirect_after_login` param yet. |
| **Chat history pagination** | Basic | `limit=50` hardcoded in some endpoints. |
| **Rate limiting** | Missing | No rate limiting on auth or weather endpoints. |
| **HTTPS/Production config** | Manual | `secure=False` on cookies, CORS origins hardcoded. |
| **Open-Meteo API rate limit** | Known | Free tier has rate limits (429 Too Many Requests). Consider caching or paid tier for production. |

---

## 📦 Deployment Checklist

- [ ] Set `DEBUG=false`
- [ ] Generate strong `SECRET_KEY` (32+ chars)
- [ ] Use HTTPS: set `secure=True` on cookies
- [ ] Configure production `CORS_ORIGINS`
- [ ] Use managed database (RDS, Cloud SQL)
- [ ] Set up Groq API key in secrets manager
- [x] Train ML models on real historical data
- [ ] Configure IMD API if targeting India
- [ ] Set up log aggregation
- [ ] Add rate limiting (e.g., `slowapi`)
- [ ] Add health check endpoint monitoring
- [ ] Configure backup strategy for MariaDB

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Make changes with tests
4. Run lint: `npm run lint` (frontend) / `ruff check .` (backend)
5. Submit PR

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- **Open-Meteo** for free weather API (ECMWF IFS, ICON, GFS models)
- **Groq** for fast LLM inference
- **XGBoost** for gradient boosting framework
- **FastAPI** for modern Python web framework
- **React + Vite** for frontend tooling