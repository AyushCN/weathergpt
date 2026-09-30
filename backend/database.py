from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator
from backend.config import settings


class Base(DeclarativeBase):
    pass


# Use synchronous engine with pymysql for MariaDB/MySQL
sync_db_url = settings.DATABASE_URL

import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_engine(
    sync_db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context} if ("tidbcloud" in sync_db_url or "aivencloud" in sync_db_url) else {}
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
        db.commit()
    except Exception:
        db.rollback()
        raise
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