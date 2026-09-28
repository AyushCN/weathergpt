import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
from backend.config import settings

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(self):
        self.base_url = settings.OPEN_METEO_BASE_URL
        self.geocoding_url = settings.OPEN_METEO_GEOCODING_URL
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def geocode(self, query: str) -> List[Dict[str, Any]]:
        """Search for locations by name."""
        try:
            response = await self.client.get(
                f"{self.geocoding_url}/search",
                params={"name": query, "count": 10, "language": "en", "format": "json"}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return []

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """Get location name from coordinates."""
        try:
            response = await self.client.get(
                f"{self.geocoding_url}/reverse",
                params={"latitude": latitude, "longitude": longitude, "language": "en", "format": "json"}
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            return results[0] if results else None
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            return None

    async def get_current_weather(
        self,
        latitude: float,
        longitude: float,
        timezone: str = "UTC"
    ) -> Optional[Dict[str, Any]]:
        """Get current weather from Open-Meteo."""
        try:
            response = await self.client.get(
                f"{self.base_url}/forecast",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility",
                    "timezone": timezone,
                    "forecast_days": 1,
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Current weather error: {e}")
            return None

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        timezone: str = "UTC",
        days: int = 7,
        hourly_hours: int = 168
    ) -> Optional[Dict[str, Any]]:
        """Get weather forecast from Open-Meteo."""
        try:
            response = await self.client.get(
                f"{self.base_url}/forecast",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant",
                    "timezone": timezone,
                    "forecast_days": days,
                    "past_days": 0,
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Forecast error: {e}")
            return None

    async def get_historical_weather(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        timezone: str = "UTC"
    ) -> Optional[Dict[str, Any]]:
        """Get historical weather from Open-Meteo Archive API."""
        try:
            response = await self.client.get(
                "https://archive-api.open-meteo.com/v1/archive",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "start_date": start_date,
                    "end_date": end_date,
                    "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum,relative_humidity_2m_mean,wind_speed_10m_max",
                    "timezone": timezone,
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Historical weather error: {e}")
            return None

    async def get_climate_normals(
        self,
        latitude: float,
        longitude: float,
        start_date: str = "1991-01-01",
        end_date: str = "2020-12-31",
        timezone: str = "UTC"
    ) -> Optional[Dict[str, Any]]:
        """Get climate normals from Open-Meteo Climate API."""
        try:
            response = await self.client.get(
                "https://climate-api.open-meteo.com/v1/climate",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "start_date": start_date,
                    "end_date": end_date,
                    "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum",
                    "timezone": timezone,
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Climate normals error: {e}")
            return None


class IMDAlertService:
    """Service for fetching IMD weather alerts for India."""
    
    def __init__(self):
        self.base_url = "https://api.imd.gov.in"  # Placeholder - IMD API endpoint
        self.client = httpx.AsyncClient(timeout=30.0)
        self.api_key = settings.IMD_API_KEY

    async def close(self):
        await self.client.aclose()

    async def get_alerts_for_location(
        self,
        latitude: float,
        longitude: float,
        radius_km: int = 50
    ) -> List[Dict[str, Any]]:
        """Get IMD alerts for a location. This is a placeholder - real implementation would use IMD API."""
        # TODO: Implement actual IMD API integration
        # For now, return empty list - can be extended with actual IMD API
        if not self.api_key:
            return []
        
        try:
            # This would be the actual IMD API call
            # response = await self.client.get(...)
            return []
        except Exception as e:
            logger.error(f"IMD alerts error: {e}")
            return []

    async def get_all_india_alerts(self) -> List[Dict[str, Any]]:
        """Get all active IMD alerts across India."""
        if not self.api_key:
            return []
        
        try:
            # This would be the actual IMD API call
            return []
        except Exception as e:
            logger.error(f"IMD all alerts error: {e}")
            return []


# Weather code mapping from WMO codes to descriptions
WEATHER_CODES = {
    0: ("clear", "Clear sky"),
    1: ("mainly_clear", "Mainly clear"),
    2: ("partly_cloudy", "Partly cloudy"),
    3: ("overcast", "Overcast"),
    45: ("fog", "Fog"),
    48: ("fog", "Depositing rime fog"),
    51: ("drizzle", "Light drizzle"),
    53: ("drizzle", "Moderate drizzle"),
    55: ("drizzle", "Dense drizzle"),
    56: ("drizzle", "Light freezing drizzle"),
    57: ("drizzle", "Dense freezing drizzle"),
    61: ("rain", "Slight rain"),
    63: ("rain", "Moderate rain"),
    65: ("rain", "Heavy rain"),
    66: ("rain", "Light freezing rain"),
    67: ("rain", "Heavy freezing rain"),
    71: ("snow", "Slight snow fall"),
    73: ("snow", "Moderate snow fall"),
    75: ("snow", "Heavy snow fall"),
    77: ("snow", "Snow grains"),
    80: ("rain", "Slight rain showers"),
    81: ("rain", "Moderate rain showers"),
    82: ("rain", "Violent rain showers"),
    85: ("snow", "Slight snow showers"),
    86: ("snow", "Heavy snow showers"),
    95: ("thunderstorm", "Thunderstorm"),
    96: ("thunderstorm", "Thunderstorm with slight hail"),
    99: ("thunderstorm", "Thunderstorm with heavy hail"),
}


def get_weather_description(code: int) -> tuple:
    """Get weather code category and description from WMO code."""
    return WEATHER_CODES.get(code, ("unknown", "Unknown"))


def determine_alert_severity(alert_type: str, value: float) -> str:
    """Determine alert severity based on type and value."""
    thresholds = {
        "heavy_rain": {"moderate": 50, "severe": 100, "extreme": 200},  # mm/day
        "storm": {"moderate": 60, "severe": 90, "extreme": 120},  # km/h wind
        "heat_wave": {"moderate": 40, "severe": 45, "extreme": 48},  # °C
        "cold_wave": {"moderate": 5, "severe": 0, "extreme": -5},  # °C
        "cyclone": {"moderate": 60, "severe": 90, "extreme": 120},  # km/h
    }
    
    if alert_type not in thresholds:
        return "minor"
    
    t = thresholds[alert_type]
    if value >= t["extreme"]:
        return "extreme"
    elif value >= t["severe"]:
        return "severe"
    elif value >= t["moderate"]:
        return "moderate"
    return "minor"