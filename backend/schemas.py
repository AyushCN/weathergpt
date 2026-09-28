from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class WeatherCode(str, Enum):
    CLEAR = "clear"
    MAINLY_CLEAR = "mainly_clear"
    PARTLY_CLOUDY = "partly_cloudy"
    OVERCAST = "overcast"
    DRIZZLE = "drizzle"
    RAIN = "rain"
    SNOW = "snow"
    THUNDERSTORM = "thunderstorm"
    FOG = "fog"


class AlertSeverity(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class IntentType(str, Enum):
    CURRENT_WEATHER = "current_weather"
    FORECAST = "forecast"
    RAIN_PROBABILITY = "rain_probability"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    WIND = "wind"
    HISTORICAL = "historical"
    ALERTS = "alerts"
    COMPARISON = "comparison"
    GENERAL = "general"
    GREETING = "greeting"
    UNKNOWN = "unknown"


class LocationBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    timezone: str = "UTC"
    elevation: Optional[float] = None


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WeatherObservationBase(BaseModel):
    timestamp: datetime
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    rainfall: Optional[float] = None
    cloud_cover: Optional[float] = None
    visibility: Optional[float] = None
    uv_index: Optional[float] = None
    weather_code: Optional[int] = None
    weather_description: Optional[str] = None
    source: str = "open-meteo"


class WeatherObservationCreate(WeatherObservationBase):
    location_id: int


class WeatherObservationResponse(WeatherObservationBase):
    id: int
    location_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WeatherForecastBase(BaseModel):
    forecast_timestamp: datetime
    valid_time: datetime
    horizon_hours: int
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    rainfall: Optional[float] = None
    cloud_cover: Optional[float] = None
    visibility: Optional[float] = None
    uv_index: Optional[float] = None
    weather_code: Optional[int] = None
    weather_description: Optional[str] = None
    precipitation_probability: Optional[float] = None
    source: str = "open-meteo"
    model: Optional[str] = None


class WeatherForecastCreate(WeatherForecastBase):
    location_id: int


class WeatherForecastResponse(WeatherForecastBase):
    id: int
    location_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WeatherPredictionBase(BaseModel):
    valid_time: datetime
    horizon_hours: int
    prediction_type: str  # "temperature" or "rain"
    predicted_value: float
    confidence: Optional[float] = None
    model_version: Optional[str] = None
    features_used: Optional[Dict[str, Any]] = None


class WeatherPredictionCreate(WeatherPredictionBase):
    location_id: int


class WeatherPredictionResponse(WeatherPredictionBase):
    id: int
    location_id: int
    prediction_timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class WeatherAlertBase(BaseModel):
    alert_type: str
    severity: AlertSeverity
    title: str
    description: Optional[str] = None
    issued_at: datetime
    expires_at: datetime
    source: str = "imd"
    source_id: Optional[str] = None
    areas_affected: Optional[List[Dict[str, Any]]] = None
    recommended_actions: Optional[List[str]] = None


class WeatherAlertCreate(WeatherAlertBase):
    location_id: int


class WeatherAlertResponse(WeatherAlertBase):
    id: int
    location_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HistoricalWeatherBase(BaseModel):
    date: datetime
    year: int
    month: int
    day: int
    avg_temperature: Optional[float] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    total_rainfall: Optional[float] = None
    avg_humidity: Optional[float] = None
    avg_wind_speed: Optional[float] = None
    source: str = "open-meteo-archive"


class HistoricalWeatherCreate(HistoricalWeatherBase):
    location_id: int


class HistoricalWeatherResponse(HistoricalWeatherBase):
    id: int
    location_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    language: str = "en"


class ChatResponse(BaseModel):
    response: str
    intent: IntentType
    entities: Dict[str, Any]
    weather_data: Optional[Dict[str, Any]] = None
    predictions: Optional[Dict[str, Any]] = None
    alerts: Optional[List[WeatherAlertResponse]] = None
    session_id: str
    response_time_ms: int


class CurrentWeatherResponse(BaseModel):
    location: LocationResponse
    observation: WeatherObservationResponse
    forecast: List[WeatherForecastResponse]
    alerts: List[WeatherAlertResponse]
    predictions: Dict[str, Any]


class ForecastResponse(BaseModel):
    location: LocationResponse
    hourly: List[WeatherForecastResponse]
    daily: List[WeatherForecastResponse]
    alerts: List[WeatherAlertResponse]


class HistoricalAnalysisResponse(BaseModel):
    location: LocationResponse
    temperature_trend: List[HistoricalWeatherResponse]
    rainfall_trend: List[HistoricalWeatherResponse]
    statistics: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    timestamp: datetime


# Authentication Schemas
class UserBase(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, pattern=r"^[^@]+@[^@]+\.[^@]+$")
    preferences: Optional[Dict[str, Any]] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    is_verified: bool
    preferences: Dict[str, Any]
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, max_length=128)


# User Location Schemas
class UserLocationBase(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    country: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    timezone: str = "UTC"
    is_default: bool = False


class UserLocationCreate(UserLocationBase):
    pass


class UserLocationUpdate(BaseModel):
    location_name: Optional[str] = None
    is_default: Optional[bool] = None


class UserLocationResponse(UserLocationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Chat Session Schemas
class ChatSessionBase(BaseModel):
    title: Optional[str] = None


class ChatSessionCreate(ChatSessionBase):
    session_id: str


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None


class ChatSessionResponse(ChatSessionBase):
    id: int
    user_id: int
    session_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    role: str
    content: str
    weather_data: Optional[Dict[str, Any]] = None
    predictions: Optional[Dict[str, Any]] = None
    alerts: Optional[List[Dict[str, Any]]] = None
    intent: Optional[str] = None
    entities: Optional[Dict[str, Any]] = None


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionWithMessages(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []


# Search History Schemas
class SearchHistoryBase(BaseModel):
    query: str
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SearchHistoryCreate(SearchHistoryBase):
    pass


class SearchHistoryResponse(SearchHistoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# User Preferences
class UserPreferences(BaseModel):
    temperature_unit: str = "c"  # c or f
    wind_unit: str = "kmh"  # kmh or mph
    default_location_id: Optional[int] = None
    default_forecast_view: str = "daily"  # daily or hourly
    notifications_enabled: bool = True
    language: str = "en"