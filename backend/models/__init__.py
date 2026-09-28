from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Index,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from .database import Base
import enum


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    preferences = Column(JSON, default={})
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    locations = relationship("UserLocation", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")


class UserLocation(Base):
    __tablename__ = "user_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    country = Column(String(100))
    state = Column(String(100))
    district = Column(String(100))
    timezone = Column(String(50), default="UTC")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="locations")

    __table_args__ = (
        Index("ix_user_loc_user_default", "user_id", "is_default"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    weather_data = Column(JSON)
    predictions = Column(JSON)
    alerts = Column(JSON)
    intent = Column(String(100))
    entities = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    query = Column(String(500), nullable=False)
    location_name = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="search_history")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    country = Column(String(100))
    state = Column(String(100))
    district = Column(String(100))
    timezone = Column(String(50), default="UTC")
    elevation = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    observations = relationship("WeatherObservation", back_populates="location")
    forecasts = relationship("WeatherForecast", back_populates="location")
    predictions = relationship("WeatherPrediction", back_populates="location")
    alerts = relationship("WeatherAlert", back_populates="location")
    historical = relationship("HistoricalWeather", back_populates="location")

    __table_args__ = (
        Index("ix_location_coords", "latitude", "longitude"),
    )


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    rainfall = Column(Float)
    cloud_cover = Column(Float)
    visibility = Column(Float)
    uv_index = Column(Float)
    weather_code = Column(Integer)
    weather_description = Column(String(255))
    source = Column(String(50), default="open-meteo")
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="observations")

    __table_args__ = (
        Index("ix_obs_location_time", "location_id", "timestamp"),
    )


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    forecast_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    valid_time = Column(DateTime(timezone=True), nullable=False, index=True)
    horizon_hours = Column(Integer)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    rainfall = Column(Float)
    cloud_cover = Column(Float)
    visibility = Column(Float)
    uv_index = Column(Float)
    weather_code = Column(Integer)
    weather_description = Column(String(255))
    precipitation_probability = Column(Float)
    source = Column(String(50), default="open-meteo")
    model = Column(String(50))
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="forecasts")

    __table_args__ = (
        Index("ix_fcst_location_valid", "location_id", "valid_time"),
    )


class WeatherPrediction(Base):
    __tablename__ = "weather_predictions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    prediction_timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    valid_time = Column(DateTime(timezone=True), nullable=False, index=True)
    horizon_hours = Column(Integer)
    prediction_type = Column(String(50), nullable=False)  # "temperature" or "rain"
    predicted_value = Column(Float, nullable=False)
    confidence = Column(Float)
    model_version = Column(String(50))
    features_used = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="predictions")

    __table_args__ = (
        Index("ix_pred_location_valid", "location_id", "valid_time"),
    )


class WeatherAlert(Base):
    __tablename__ = "weather_alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    alert_type = Column(String(100), nullable=False)  # heavy_rain, storm, cyclone, heat_wave, cold_wave, etc.
    severity = Column(String(20), nullable=False)  # minor, moderate, severe, extreme
    title = Column(String(255), nullable=False)
    description = Column(Text)
    issued_at = Column(DateTime(timezone=True), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(50), default="imd")
    source_id = Column(String(100))
    areas_affected = Column(JSON)
    recommended_actions = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    location = relationship("Location", back_populates="alerts")

    __table_args__ = (
        Index("ix_alert_location_active", "location_id", "is_active"),
        Index("ix_alert_time_active", "issued_at", "expires_at", "is_active"),
    )


class UserQuery(Base):
    __tablename__ = "user_queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String(100), index=True)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text)
    intent = Column(String(100))
    extracted_entities = Column(JSON)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    latitude = Column(Float)
    longitude = Column(Float)
    language = Column(String(10), default="en")
    response_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_query_session_time", "session_id", "created_at"),
        Index("ix_query_user_time", "user_id", "created_at"),
    )


class HistoricalWeather(Base):
    __tablename__ = "historical_weather"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    year = Column(Integer, index=True)
    month = Column(Integer, index=True)
    day = Column(Integer)
    avg_temperature = Column(Float)
    min_temperature = Column(Float)
    max_temperature = Column(Float)
    total_rainfall = Column(Float)
    avg_humidity = Column(Float)
    avg_wind_speed = Column(Float)
    source = Column(String(50), default="open-meteo-archive")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="historical")

    __table_args__ = (
        Index("ix_hist_location_date", "location_id", "date"),
        Index("ix_hist_year_month", "year", "month"),
    )