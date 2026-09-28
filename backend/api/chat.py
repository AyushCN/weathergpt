from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
import uuid
from backend.database import get_db
from backend.services.llm_service import LLMService
from backend.services.weather_service import WeatherService, get_weather_description
from backend.services.database_service import DatabaseService
from backend.services.ml_service import MLService
from backend.services.user_service import UserService
from backend.api.deps import get_optional_user, get_current_active_user
from backend.schemas import (
    ChatRequest,
    ChatResponse,
    IntentType,
    WeatherAlertResponse,
    ChatSessionCreate, ChatMessageCreate,
)
from backend.models import Location, UserQuery, ChatSession, ChatMessage, User

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize services
llm_service = LLMService()
weather_service = WeatherService()
ml_service = MLService()


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Process a chat message and return weather-aware response."""
    start_time = datetime.now()
    
    # Handle session for authenticated users
    session_id = request.session_id
    chat_session = None
    
    if current_user and session_id:
        user_service = UserService(db)
        chat_session = await user_service.get_chat_session_by_session_id(current_user.id, session_id)
        if not chat_session:
            # Create new session
            chat_session = await user_service.create_chat_session(
                current_user.id, 
                ChatSessionCreate(session_id=session_id)
            )
    elif current_user and not session_id:
        # Create new session for authenticated user
        session_id = str(uuid.uuid4())
        user_service = UserService(db)
        chat_session = await user_service.create_chat_session(
            current_user.id,
            ChatSessionCreate(session_id=session_id)
        )
    elif not current_user and not session_id:
        session_id = str(uuid.uuid4())
    
    db_service = DatabaseService(db)
    
    # Save user query
    query = await db_service.save_query(
        session_id=session_id,
        user_message=request.message,
        latitude=request.latitude,
        longitude=request.longitude,
        language=request.language,
        user_id=current_user.id if current_user else None,
    )
    
    # Save chat message for authenticated users
    if current_user and chat_session:
        user_service = UserService(db)
        await user_service.add_chat_message(
            chat_session.id,
            ChatMessageCreate(
                role="user",
                content=request.message,
            )
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
    
    # If no location provided, use user's default location or a default
    if lat is None or lon is None:
        if current_user:
            user_service = UserService(db)
            default_loc = await user_service.get_default_location(current_user.id)
            if default_loc:
                lat = default_loc.latitude
                lon = default_loc.longitude
                location_name = default_loc.location_name
            else:
                lat = 12.9716
                lon = 77.5946
                location_name = location_name or "Bangalore"
        else:
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
    
    # Save assistant response for authenticated users
    if current_user and chat_session:
        user_service = UserService(db)
        await user_service.add_chat_message(
            chat_session.id,
            ChatMessageCreate(
                role="assistant",
                content=response_text,
                weather_data=weather_data,
                predictions=predictions,
                alerts=[WeatherAlertResponse.model_validate(a).model_dump() for a in alerts],
                intent=intent.value,
                entities=extracted,
            )
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
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get chat history for a session."""
    if current_user:
        # Get from user's chat sessions
        user_service = UserService(db)
        chat_session = await user_service.get_chat_session_by_session_id(current_user.id, session_id)
        if not chat_session:
            return []
        
        messages = await user_service.get_chat_messages(chat_session.id, limit)
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "weather_data": m.weather_data,
                "predictions": m.predictions,
                "alerts": m.alerts,
                "intent": m.intent,
                "entities": m.entities,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ]
    else:
        # Fallback to old session-based history
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


@router.get("/sessions", response_model=List[dict])
async def get_user_chat_sessions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all chat sessions for current user."""
    user_service = UserService(db)
    sessions = await user_service.get_user_chat_sessions(current_user.id, limit)
    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]