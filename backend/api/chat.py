from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import uuid
from backend.database import get_db
from backend.services.llm_service import LLMService
from backend.services.weather_service import WeatherService, get_weather_description
from backend.services.database_service import DatabaseService
from backend.services.ml_service import MLService
from backend.schemas import (
    ChatRequest,
    ChatResponse,
    IntentType,
    WeatherAlertResponse,
)
from backend.models import Location, UserQuery

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize services
llm_service = LLMService()
weather_service = WeatherService()
ml_service = MLService()


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Process a chat message and return weather-aware response."""
    start_time = datetime.now()
    session_id = request.session_id or str(uuid.uuid4())
    db_service = DatabaseService(db)
    
    # Save user query
    query = await db_service.save_query(
        session_id=session_id,
        user_message=request.message,
        latitude=request.latitude,
        longitude=request.longitude,
        language=request.language,
    )
    
    # Extract intent and entities using LLM
    extracted = await llm_service.extract_intent_and_entities(
        request.message,
        request.language
    )
    
    intent = IntentType(extracted.get("intent", "unknown"))
    location_info = extracted.get("location")
    time_ref = extracted.get("time_reference", "today")
    parameters = extracted.get("parameters", [])
    
    # Determine location
    lat = request.latitude
    lon = request.longitude
    location_name = request.location_name
    
    if location_info and location_info.get("lat") and location_info.get("lon"):
        lat = location_info["lat"]
        lon = location_info["lon"]
        location_name = location_info.get("name", location_name)
    
    # If no location provided, try to get from recent queries or use a default
    if lat is None or lon is None:
        # For demo, use a default location (Bangalore)
        lat = 12.9716
        lon = 77.5946
        location_name = location_name or "Bangalore"
    
    # Get or create location
    location = await db_service.get_or_create_location(
        name=location_name or f"{lat:.4f},{lon:.4f}",
        latitude=lat,
        longitude=lon,
    )
    
    # Update query with location
    query.location_id = location.id
    await db_service.db.flush()
    
    # Fetch weather data based on intent
    weather_data = {}
    predictions = {}
    alerts = []
    
    # Always get current weather
    current = await weather_service.get_current_weather(lat, lon)
    if current:
        weather_data["current"] = current.get("current", {})
    
    # Get forecast if needed
    if intent in [IntentType.FORECAST, IntentType.RAIN_PROBABILITY, IntentType.GENERAL]:
        forecast = await weather_service.get_forecast(lat, lon, days=7)
        if forecast:
            weather_data["forecast"] = forecast.get("hourly", {})
    
    # Get historical if needed
    if intent == IntentType.HISTORICAL:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now().replace(year=datetime.now().year - 1)).strftime("%Y-%m-%d")
        historical = await weather_service.get_historical_weather(lat, lon, start_date, end_date)
        if historical:
            weather_data["historical"] = historical.get("daily", {})
    
    # Get alerts
    alerts = await db_service.get_active_alerts(location.id)
    
    # Get ML predictions
    if current:
        current_weather = weather_data.get("current", {})
        current_weather_dict = {
            "temperature": current_weather.get("temperature_2m"),
            "humidity": current_weather.get("relative_humidity_2m"),
            "pressure": current_weather.get("pressure_msl"),
            "wind_speed": current_weather.get("wind_speed_10m"),
            "wind_direction": current_weather.get("wind_direction_10m"),
            "cloud_cover": current_weather.get("cloud_cover"),
            "rainfall": current_weather.get("rain", 0),
            "visibility": current_weather.get("visibility"),
        }
        
        # Get recent observations for historical features
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
        
        predictions = ml_service.get_predictions_for_horizons(current_weather_dict, hist_data)
    
    # Generate response using LLM
    response_text = await llm_service.generate_weather_response(
        user_message=request.message,
        weather_data=weather_data,
        predictions=predictions,
        alerts=[WeatherAlertResponse.model_validate(a).model_dump() for a in alerts],
        intent=intent,
        language=request.language,
    )
    
    response_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    
    # Update query with response
    await db_service.update_query_response(
        query_id=query.id,
        ai_response=response_text,
        intent=intent.value,
        entities=extracted,
        response_time_ms=response_time_ms,
    )
    
    return ChatResponse(
        response=response_text,
        intent=intent,
        entities=extracted,
        weather_data=weather_data,
        predictions=predictions,
        alerts=[WeatherAlertResponse.model_validate(a) for a in alerts],
        session_id=session_id,
        response_time_ms=response_time_ms,
    )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    db_service = DatabaseService(db)
    
    from sqlalchemy import select, desc
    stmt = (
        select(UserQuery)
        .where(UserQuery.session_id == session_id)
        .order_by(desc(UserQuery.created_at))
        .limit(limit)
    )
    result = await db_service.db.execute(stmt)
    queries = list(result.scalars().all())
    
    return [
        {
            "id": q.id,
            "user_message": q.user_message,
            "ai_response": q.ai_response,
            "intent": q.intent,
            "entities": q.extracted_entities,
            "created_at": q.created_at.isoformat(),
        }
        for q in reversed(queries)
    ]