#!/usr/bin/env python3
"""
Populate weather_observations table with real historical data from Open-Meteo.
Fetches hourly data for the last year for all locations in the database.
"""

import asyncio
import logging
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx

from backend.config import settings
from backend.models import Location, WeatherObservation
from backend.database import Base

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create engine
engine = create_engine(settings.DATABASE_URL, echo=False)


async def fetch_historical_weather(
    client: httpx.AsyncClient,
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    timezone: str = "UTC"
) -> List[Dict[str, Any]]:
    """Fetch historical weather from Open-Meteo Archive API."""
    try:
        response = await client.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "start_date": start_date,
                "end_date": end_date,
                "hourly": "temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover,rain,visibility,uv_index,weather_code",
                "timezone": timezone,
            },
            timeout=60.0
        )
        response.raise_for_status()
        data = response.json()
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        observations = []
        for i, t in enumerate(times):
            obs = {
                "timestamp": t,
                "temperature": hourly.get("temperature_2m", [None])[i],
                "humidity": hourly.get("relative_humidity_2m", [None])[i],
                "pressure": hourly.get("pressure_msl", [None])[i],
                "wind_speed": hourly.get("wind_speed_10m", [None])[i],
                "wind_direction": hourly.get("wind_direction_10m", [None])[i],
                "cloud_cover": hourly.get("cloud_cover", [None])[i],
                "rainfall": hourly.get("rain", [None])[i],
                "visibility": hourly.get("visibility", [None])[i],
                "uv_index": hourly.get("uv_index", [None])[i],
                "weather_code": hourly.get("weather_code", [None])[i],
            }
            observations.append(obs)
        
        return observations
        
    except Exception as e:
        logger.error(f"Error fetching data for ({latitude}, {longitude}): {e}")
        return []


def save_observations(session: Session, location_id: int, observations: List[Dict[str, Any]]) -> int:
    """Save observations to database, avoiding duplicates."""
    saved = 0
    for obs in observations:
        if obs["temperature"] is None:
            continue
            
        # Check if observation already exists
        existing = session.execute(
            select(WeatherObservation).where(
                WeatherObservation.location_id == location_id,
                WeatherObservation.timestamp == datetime.fromisoformat(obs["timestamp"])
            )
        ).first()  # Use first() instead of scalar_one_or_none() to handle potential duplicates
        
        if existing:
            continue
            
        # Map weather code to description - use integer WMO code for weather_code column
        from backend.services.weather_service import WEATHER_CODES
        code = obs.get("weather_code", 0)
        weather_desc = WEATHER_CODES.get(code, ("unknown", "Unknown"))[1]
        
        db_obs = WeatherObservation(
            location_id=location_id,
            timestamp=datetime.fromisoformat(obs["timestamp"]),
            temperature=obs.get("temperature"),
            humidity=obs.get("humidity"),
            pressure=obs.get("pressure"),
            wind_speed=obs.get("wind_speed"),
            wind_direction=obs.get("wind_direction"),
            cloud_cover=obs.get("cloud_cover"),
            rainfall=obs.get("rainfall", 0),
            visibility=obs.get("visibility"),
            uv_index=obs.get("uv_index"),
            weather_code=code,  # Store the integer WMO code
            weather_description=weather_desc,
            source="open-meteo-archive",
        )
        session.add(db_obs)
        saved += 1
    
    session.commit()
    return saved


async def main():
    """Main function to populate historical data."""
    logger.info("Starting historical data population...")
    
    # Get all locations from database
    with Session(engine) as session:
        locations = session.execute(
            select(Location).where(Location.is_active == True)
        ).scalars().all()
        
        if not locations:
            logger.error("No active locations found in database")
            return
        
        logger.info(f"Found {len(locations)} active locations")
        
        # Date range: last 365 days
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=365)
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        logger.info(f"Fetching data from {start_str} to {end_str}")
        
        # Create async HTTP client
        async with httpx.AsyncClient(timeout=60.0) as client:
            for loc in locations:
                logger.info(f"Processing {loc.name} (ID: {loc.id}) - ({loc.latitude}, {loc.longitude})")
                
                # Fetch historical data
                observations = await fetch_historical_weather(
                    client,
                    loc.latitude,
                    loc.longitude,
                    start_str,
                    end_str,
                    loc.timezone or "UTC"
                )
                
                if not observations:
                    logger.warning(f"No data returned for {loc.name}")
                    continue
                
                logger.info(f"Fetched {len(observations)} hourly records for {loc.name}")
                
                # Save to database - use first matching location by name to handle duplicates
                with Session(engine) as save_session:
                    existing_loc = save_session.execute(
                        select(Location).where(Location.name == loc.name)
                    ).scalars().first()
                    if not existing_loc:
                        logger.warning(f"Location {loc.name} not found in DB")
                        continue
                    
                    saved = save_observations(save_session, existing_loc.id, observations)
                    logger.info(f"Saved {saved} new observations for {loc.name} (ID: {existing_loc.id})")
                
                # Be nice to the API
                await asyncio.sleep(1)
        
        logger.info("Historical data population completed!")


if __name__ == "__main__":
    asyncio.run(main())