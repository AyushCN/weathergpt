from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
from backend.database import get_db
from backend.services.weather_service import WeatherService, get_weather_description
from backend.services.database_service import DatabaseService
from backend.services.ml_service import MLService
from backend.schemas import (
    CurrentWeatherResponse,
    ForecastResponse,
    LocationResponse,
    WeatherObservationResponse,
    WeatherForecastResponse,
    WeatherAlertResponse,
    WeatherPredictionResponse,
    HistoricalAnalysisResponse,
)
from backend.models import Location, WeatherObservation, WeatherForecast, WeatherAlert, WeatherPrediction

router = APIRouter(prefix="/weather", tags=["weather"])

# Initialize services
weather_service = WeatherService()
ml_service = MLService()


@router.get("/current", response_model=CurrentWeatherResponse)
async def get_current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    location_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get current weather for a location."""
    db_service = DatabaseService(db)
    
    # Get or create location
    location = await db_service.get_or_create_location(
        name=location_name or f"{latitude:.4f},{longitude:.4f}",
        latitude=latitude,
        longitude=longitude,
    )
    
    # Fetch from API
    weather_data = await weather_service.get_current_weather(latitude, longitude)
    
    if not weather_data:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    
    current = weather_data.get("current", {})
    code = current.get("weather_code", 0)
    weather_code, weather_desc = get_weather_description(code)
    
    # Save observation
    obs_data = {
        "location_id": location.id,
        "timestamp": datetime.fromisoformat(current.get("time", datetime.utcnow().isoformat())),
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "pressure": current.get("pressure_msl"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "rainfall": current.get("rain", 0),
        "cloud_cover": current.get("cloud_cover"),
        "visibility": current.get("visibility"),
        "uv_index": current.get("uv_index"),
        "weather_code": code,
        "weather_description": weather_desc,
        "source": "open-meteo",
        "raw_data": current,
    }
    
    observation = await db_service.save_observation(obs_data)
    
    # Get forecast
    forecast_data = await weather_service.get_forecast(latitude, longitude, days=7)
    forecasts = []
    
    if forecast_data:
        hourly = forecast_data.get("hourly", {})
        times = hourly.get("time", [])
        
        for i, t in enumerate(times[:48]):  # Next 48 hours
            code = hourly.get("weather_code", [0])[i]
            w_code, w_desc = get_weather_description(code)
            
            fcst_data = {
                "location_id": location.id,
                "forecast_timestamp": datetime.utcnow(),
                "valid_time": datetime.fromisoformat(t),
                "horizon_hours": i + 1,
                "temperature": hourly.get("temperature_2m", [None])[i],
                "humidity": hourly.get("relative_humidity_2m", [None])[i],
                "pressure": hourly.get("pressure_msl", [None])[i],
                "wind_speed": hourly.get("wind_speed_10m", [None])[i],
                "wind_direction": hourly.get("wind_direction_10m", [None])[i],
                "rainfall": hourly.get("rain", [None])[i],
                "cloud_cover": hourly.get("cloud_cover", [None])[i],
                "visibility": hourly.get("visibility", [None])[i],
                "uv_index": hourly.get("uv_index", [None])[i],
                "weather_code": code,
                "weather_description": w_desc,
                "precipitation_probability": hourly.get("precipitation_probability", [None])[i],
                "source": "open-meteo",
                "model": "ecmwf_ifs",
                "raw_data": {k: v[i] if isinstance(v, list) else v for k, v in hourly.items()},
            }
            forecasts.append(await db_service.save_forecast(fcst_data))
    
    # Get ML predictions
    recent_obs = await db_service.get_recent_observations(location.id, hours=24)
    hist_data = [
        {
            "temperature": o.temperature,
            "humidity": o.humidity,
            "pressure": o.pressure,
            "wind_speed": o.wind_speed,
            "wind_direction": o.wind_direction,
            "cloud_cover": o.cloud_cover,
            "rainfall": o.rainfall,
            "visibility": o.visibility,
            "timestamp": o.timestamp.isoformat(),
        }
        for o in recent_obs
    ]
    
    current_weather_dict = {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "pressure": current.get("pressure_msl"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "cloud_cover": current.get("cloud_cover"),
        "rainfall": current.get("rain", 0),
        "visibility": current.get("visibility"),
    }
    
    predictions = ml_service.get_predictions_for_horizons(current_weather_dict, hist_data)
    
    # Save predictions
    for pred_type, horizons in predictions.items():
        if pred_type == "generated_at":
            continue
        for horizon_key, pred in horizons.items():
            if pred.get("predicted_value") is not None or pred.get("probability") is not None:
                h = int(horizon_key.replace("h", ""))
                pred_data = {
                    "location_id": location.id,
                    "valid_time": datetime.utcnow() + timedelta(hours=h),
                    "horizon_hours": h,
                    "prediction_type": pred_type,
                    "predicted_value": pred.get("predicted_value") or pred.get("probability", 0),
                    "confidence": pred.get("confidence"),
                    "model_version": pred.get("model_version"),
                    "features_used": pred.get("features_used"),
                }
                await db_service.save_prediction(pred_data)
    
    # Get alerts
    alerts = await db_service.get_active_alerts(location.id)
    
    return CurrentWeatherResponse(
        location=LocationResponse.model_validate(location),
        observation=WeatherObservationResponse.model_validate(observation),
        forecast=[WeatherForecastResponse.model_validate(f) for f in forecasts],
        alerts=[WeatherAlertResponse.model_validate(a) for a in alerts],
        predictions=predictions,
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    location_name: Optional[str] = None,
    days: int = Query(7, ge=1, le=14),
    db: AsyncSession = Depends(get_db),
):
    """Get weather forecast for a location."""
    db_service = DatabaseService(db)
    
    location = await db_service.get_or_create_location(
        name=location_name or f"{latitude:.4f},{longitude:.4f}",
        latitude=latitude,
        longitude=longitude,
    )
    
    forecast_data = await weather_service.get_forecast(latitude, longitude, days=days)
    
    if not forecast_data:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    
    hourly = forecast_data.get("hourly", {})
    daily = forecast_data.get("daily", {})
    
    hourly_forecasts = []
    times = hourly.get("time", [])
    
    for i, t in enumerate(times[:days * 24]):
        code = hourly.get("weather_code", [0])[i]
        w_code, w_desc = get_weather_description(code)
        
        fcst_data = {
            "location_id": location.id,
            "forecast_timestamp": datetime.utcnow(),
            "valid_time": datetime.fromisoformat(t),
            "horizon_hours": i + 1,
            "temperature": hourly.get("temperature_2m", [None])[i],
            "humidity": hourly.get("relative_humidity_2m", [None])[i],
            "pressure": hourly.get("pressure_msl", [None])[i],
            "wind_speed": hourly.get("wind_speed_10m", [None])[i],
            "wind_direction": hourly.get("wind_direction_10m", [None])[i],
            "rainfall": hourly.get("rain", [None])[i],
            "cloud_cover": hourly.get("cloud_cover", [None])[i],
            "visibility": hourly.get("visibility", [None])[i],
            "uv_index": hourly.get("uv_index", [None])[i],
            "weather_code": code,
            "weather_description": w_desc,
            "precipitation_probability": hourly.get("precipitation_probability", [None])[i],
            "source": "open-meteo",
            "model": "ecmwf_ifs",
        }
        hourly_forecasts.append(await db_service.save_forecast(fcst_data))
    
    daily_forecasts = []
    daily_times = daily.get("time", [])
    
    for i, t in enumerate(daily_times):
        code = daily.get("weather_code", [0])[i]
        w_code, w_desc = get_weather_description(code)
        
        fcst_data = {
            "location_id": location.id,
            "forecast_timestamp": datetime.utcnow(),
            "valid_time": datetime.fromisoformat(t),
            "horizon_hours": (i + 1) * 24,
            "temperature": (daily.get("temperature_2m_max", [None])[i] + daily.get("temperature_2m_min", [None])[i]) / 2 if daily.get("temperature_2m_max", [None])[i] and daily.get("temperature_2m_min", [None])[i] else None,
            "humidity": None,
            "pressure": None,
            "wind_speed": daily.get("wind_speed_10m_max", [None])[i],
            "wind_direction": daily.get("wind_direction_10m_dominant", [None])[i],
            "rainfall": daily.get("rain_sum", [None])[i],
            "cloud_cover": None,
            "visibility": None,
            "uv_index": daily.get("uv_index_max", [None])[i],
            "weather_code": code,
            "weather_description": w_desc,
            "precipitation_probability": daily.get("precipitation_probability_max", [None])[i],
            "source": "open-meteo",
            "model": "ecmwf_ifs",
        }
        daily_forecasts.append(await db_service.save_forecast(fcst_data))
    
    alerts = await db_service.get_active_alerts(location.id)
    
    return ForecastResponse(
        location=LocationResponse.model_validate(location),
        hourly=[WeatherForecastResponse.model_validate(f) for f in hourly_forecasts],
        daily=[WeatherForecastResponse.model_validate(f) for f in daily_forecasts],
        alerts=[WeatherAlertResponse.model_validate(a) for a in alerts],
    )


@router.get("/historical", response_model=HistoricalAnalysisResponse)
async def get_historical_analysis(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    location_name: Optional[str] = None,
    years: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Get historical weather analysis for a location."""
    db_service = DatabaseService(db)
    
    location = await db_service.get_or_create_location(
        name=location_name or f"{latitude:.4f},{longitude:.4f}",
        latitude=latitude,
        longitude=longitude,
    )
    
    # Try to get from database first
    stats = await db_service.get_historical_statistics(location.id, years)
    
    # If not enough data, fetch from API
    if not stats:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=years * 365)).strftime("%Y-%m-%d")
        
        historical_data = await weather_service.get_historical_weather(
            latitude, longitude, start_date, end_date
        )
        
        if historical_data:
            daily = historical_data.get("daily", {})
            dates = daily.get("time", [])
            
            historical_records = []
            for i, d in enumerate(dates):
                hist_data = {
                    "location_id": location.id,
                    "date": datetime.fromisoformat(d),
                    "year": datetime.fromisoformat(d).year,
                    "month": datetime.fromisoformat(d).month,
                    "day": datetime.fromisoformat(d).day,
                    "avg_temperature": daily.get("temperature_2m_mean", [None])[i],
                    "min_temperature": daily.get("temperature_2m_min", [None])[i],
                    "max_temperature": daily.get("temperature_2m_max", [None])[i],
                    "total_rainfall": daily.get("precipitation_sum", [None])[i],
                    "avg_humidity": daily.get("relative_humidity_2m_mean", [None])[i],
                    "avg_wind_speed": daily.get("wind_speed_10m_max", [None])[i],
                    "source": "open-meteo-archive",
                }
                historical_records.append(await db_service.save_historical(hist_data))
            
            # Recalculate stats
            stats = await db_service.get_historical_statistics(location.id, years)
    
    # Get historical records for response
    hist_records = await db_service.get_historical_range(
        location.id,
        datetime.now().year - years,
        datetime.now().year
    )
    
    return HistoricalAnalysisResponse(
        location=LocationResponse.model_validate(location),
        temperature_trend=[HistoricalWeatherResponse.model_validate(h) for h in hist_records],
        rainfall_trend=[HistoricalWeatherResponse.model_validate(h) for h in hist_records],
        statistics=stats,
    )


@router.get("/alerts", response_model=List[WeatherAlertResponse])
async def get_alerts(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    db: AsyncSession = Depends(get_db),
):
    """Get active weather alerts for a location."""
    db_service = DatabaseService(db)
    
    location = await db_service.get_or_create_location(
        name=f"{latitude:.4f},{longitude:.4f}",
        latitude=latitude,
        longitude=longitude,
    )
    
    alerts = await db_service.get_active_alerts(location.id)
    return [WeatherAlertResponse.model_validate(a) for a in alerts]


@router.get("/locations/search")
async def search_locations(
    query: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search for locations by name."""
    db_service = DatabaseService(db)
    
    # First search local database
    locations = await db_service.search_locations(query)
    
    if locations:
        return [LocationResponse.model_validate(loc) for loc in locations]
    
    # If not found, search via Open-Meteo geocoding
    weather_service = WeatherService()
    results = await weather_service.geocode(query)
    await weather_service.close()
    
    return [
        {
            "name": r.get("name"),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "country": r.get("country"),
            "state": r.get("admin1"),
            "district": r.get("admin2"),
        }
        for r in results
    ]


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "weather"}