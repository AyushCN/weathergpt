from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator
from config import settings


class Base(DeclarativeBase):
    pass


# Use synchronous engine with psycopg2
sync_db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(
    sync_db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    engine,
    class_=Session,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend.models import (
        Location,
        WeatherObservation,
        WeatherForecast,
        WeatherPrediction,
        WeatherAlert,
        UserQuery,
        HistoricalWeather,
        User,
        UserLocation,
        ChatSession,
        ChatMessage,
        SearchHistory,
    )
    Base.metadata.create_all(bind=engine)