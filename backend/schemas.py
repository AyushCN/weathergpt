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