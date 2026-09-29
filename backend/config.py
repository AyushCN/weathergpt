from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "WeatherGPT"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "mysql+pymysql://weathergpt:weathergpt@127.0.0.1:3306/weathergpt"
    
    # LLM Providers
    LLM_PRIMARY_PROVIDER: str = "groq"  # groq, ollama
    LLM_FALLBACK_PROVIDERS: str = "ollama,keyword"  # comma-separated
    LLM_AUTO_SELECT: bool = True
    
    # Groq API (Online)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Ollama (Local LLM)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    # Weather APIs
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_GEOCODING_URL: str = "https://geocoding-api.open-meteo.com/v1"
    
    # IMD (optional)
    IMD_API_KEY: Optional[str] = None
    
    # ML Models
    MODEL_DIR: str = "./ml/trained_models"
    TEMPERATURE_MODEL_PATH: str = "temperature_model.pkl"
    RAIN_MODEL_PATH: str = "rain_model.pkl"

    # Scheduler
    FETCH_INTERVAL_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # JWT Authentication
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Password hashing
    PASSWORD_HASH_ALGORITHM: str = "argon2"

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()