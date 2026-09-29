import os
import sys
import httpx
import logging
from datetime import datetime, timedelta

# Add parent directory to path so we can import from backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.services.ml_service import ModelTrainer
from backend.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_historical_data(latitude=12.97, longitude=77.59, days=365):
    """Fetch historical data from Open-Meteo for training."""
    end_date = datetime.now() - timedelta(days=1)
    start_date = end_date - timedelta(days=days)
    
    url = f"https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,rain",
        "timezone": "UTC"
    }
    
    logger.info(f"Fetching {days} days of historical data for lat={latitude}, lon={longitude}...")
    
    try:
        response = httpx.get(url, params=params, timeout=30.0)
        response.raise_for_status()
        data = response.json()
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        weather_data = []
        for i in range(len(times)):
            # Skip rows with None values
            if any(hourly[key][i] is None for key in hourly.keys() if key != "time"):
                continue
                
            weather_data.append({
                "timestamp": times[i],
                "temperature": hourly.get("temperature_2m", [])[i],
                "humidity": hourly.get("relative_humidity_2m", [])[i],
                "pressure": hourly.get("surface_pressure", [])[i],
                "wind_speed": hourly.get("wind_speed_10m", [])[i],
                "wind_direction": hourly.get("wind_direction_10m", [])[i],
                "cloud_cover": hourly.get("cloud_cover", [])[i],
                "rainfall": hourly.get("rain", [])[i],
                "visibility": 10000,
            })
            
        logger.info(f"Successfully fetched {len(weather_data)} hourly records.")
        return weather_data
        
    except Exception as e:
        logger.error(f"Failed to fetch data: {e}")
        return []

def main():
    # Fetch ~2 years of data for training
    weather_data = fetch_historical_data(days=730)
    
    if not weather_data:
        logger.error("No data fetched. Aborting training.")
        return
        
    logger.info("Preparing data...")
    X_train, X_test, y_temp_train, y_temp_test, y_rain_train, y_rain_test = ModelTrainer.prepare_training_data(weather_data)
    
    logger.info(f"Training temperature model (Train shape: {X_train.shape})...")
    temp_model, temp_metrics = ModelTrainer.train_temperature_model(X_train, y_temp_train, X_test, y_temp_test)
    
    logger.info(f"Training rain model (Train shape: {X_train.shape})...")
    rain_model, rain_metrics = ModelTrainer.train_rain_model(X_train, y_rain_train, X_test, y_rain_test)
    
    logger.info("Saving models...")
    ModelTrainer.save_models(temp_model, rain_model, settings.MODEL_DIR)
    
    logger.info("Training complete!")

if __name__ == "__main__":
    main()
