#!/usr/bin/env python3
"""
ML Model Training Script for WeatherGPT

This script trains XGBoost models for temperature and rain prediction
using historical weather data from the database.
"""

import asyncio
import os
import sys
import logging
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, '/app')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from backend.models import WeatherObservation, Location
from backend.services.ml_service import ModelTrainer
from backend.config import settings
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fetch_training_data(engine, location_id: int = None, days: int = 365 * 2):
    """Fetch historical weather data for training."""
    async with AsyncSession(engine) as session:
        # Build query
        query = select(WeatherObservation).order_by(WeatherObservation.timestamp)
        
        if location_id:
            query = query.where(WeatherObservation.location_id == location_id)
        
        # Limit to last N days
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.where(WeatherObservation.timestamp >= cutoff)
        
        result = await session.execute(query)
        observations = result.scalars().all()
        
        # Convert to list of dicts
        data = []
        for obs in observations:
            data.append({
                "temperature": obs.temperature,
                "humidity": obs.humidity,
                "pressure": obs.pressure,
                "wind_speed": obs.wind_speed,
                "wind_direction": obs.wind_direction,
                "cloud_cover": obs.cloud_cover,
                "rainfall": obs.rainfall,
                "visibility": obs.visibility,
                "timestamp": obs.timestamp.isoformat(),
            })
        
        return data


async def main():
    """Main training function."""
    logger.info("Starting ML model training...")
    
    # Create database engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
    )
    
    try:
        # Fetch training data
        logger.info("Fetching training data from database...")
        training_data = await fetch_training_data(engine)
        
        if len(training_data) < 100:
            logger.warning(f"Insufficient training data: {len(training_data)} records. Need at least 100.")
            logger.info("Generating synthetic data for demo...")
            training_data = generate_synthetic_data(1000)
        
        logger.info(f"Training on {len(training_data)} records")
        
        # Prepare data for different horizons
        horizons = [1, 3, 6, 12, 24]
        
        best_temp_model = None
        best_rain_model = None
        best_temp_metrics = {"mae": float('inf')}
        best_rain_metrics = {"f1": 0}
        
        for horizon in horizons:
            logger.info(f"Training models for {horizon}h horizon...")
            
            X_train, X_test, y_temp_train, y_temp_test, y_rain_train, y_rain_test = \
                ModelTrainer.prepare_training_data(training_data, horizon)
            
            # Train temperature model
            temp_model, temp_metrics = ModelTrainer.train_temperature_model(
                X_train, y_temp_train, X_test, y_temp_test
            )
            
            # Train rain model
            rain_model, rain_metrics = ModelTrainer.train_rain_model(
                X_train, y_rain_train, X_test, y_rain_test
            )
            
            # Keep best models
            if temp_metrics["mae"] < best_temp_metrics["mae"]:
                best_temp_model = temp_model
                best_temp_metrics = temp_metrics
                logger.info(f"New best temperature model (horizon={horizon}h): MAE={temp_metrics['mae']:.2f}")
            
            if rain_metrics["f1"] > best_rain_metrics["f1"]:
                best_rain_model = rain_model
                best_rain_metrics = rain_metrics
                logger.info(f"New best rain model (horizon={horizon}h): F1={rain_metrics['f1']:.3f}")
        
        # Save best models
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        
        temp_path = os.path.join(settings.MODEL_DIR, settings.TEMPERATURE_MODEL_PATH)
        rain_path = os.path.join(settings.MODEL_DIR, settings.RAIN_MODEL_PATH)
        
        joblib.dump(best_temp_model, temp_path)
        joblib.dump(best_rain_model, rain_path)
        
        logger.info(f"Models saved:")
        logger.info(f"  Temperature: {temp_path} (MAE: {best_temp_metrics['mae']:.2f})")
        logger.info(f"  Rain: {rain_path} (F1: {best_rain_metrics['f1']:.3f})")
        
        # Save metrics
        metrics = {
            "temperature": best_temp_metrics,
            "rain": best_rain_metrics,
            "trained_at": datetime.utcnow().isoformat(),
            "training_samples": len(training_data),
        }
        
        import json
        metrics_path = os.path.join(settings.MODEL_DIR, "metrics.json")
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info("Training completed successfully!")
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)
    finally:
        await engine.dispose()


def generate_synthetic_data(n_samples: int = 1000):
    """Generate synthetic weather data for demo purposes."""
    import numpy as np
    import pandas as pd
    
    np.random.seed(42)
    
    base_time = datetime.utcnow() - timedelta(days=n_samples // 24)
    timestamps = [base_time + timedelta(hours=i) for i in range(n_samples)]
    
    data = []
    for i, ts in enumerate(timestamps):
        # Seasonal patterns
        day_of_year = ts.timetuple().tm_yday
        hour = ts.hour
        
        # Temperature with daily and yearly cycles
        yearly_cycle = 10 * np.sin(2 * np.pi * day_of_year / 365)
        daily_cycle = 5 * np.sin(2 * np.pi * (hour - 6) / 24)
        temp_base = 25 + yearly_cycle + daily_cycle + np.random.normal(0, 2)
        
        # Humidity (inverse to temperature roughly)
        humidity = np.clip(80 - 0.5 * (temp_base - 20) + np.random.normal(0, 10), 20, 100)
        
        # Pressure
        pressure = 1013 + np.random.normal(0, 5)
        
        # Wind
        wind_speed = np.abs(np.random.normal(5, 3))
        wind_direction = np.random.uniform(0, 360)
        
        # Cloud cover related to humidity
        cloud_cover = np.clip(humidity * 0.8 + np.random.normal(0, 15), 0, 100)
        
        # Rainfall - higher when humid and cloudy
        rain_prob = (humidity / 100) * (cloud_cover / 100) * 0.3
        rainfall = np.random.exponential(2) if np.random.random() < rain_prob else 0
        
        # Visibility
        visibility = np.clip(10000 - cloud_cover * 50 - rainfall * 100 + np.random.normal(0, 1000), 100, 10000)
        
        data.append({
            "temperature": round(temp_base, 1),
            "humidity": round(humidity, 1),
            "pressure": round(pressure, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "cloud_cover": round(cloud_cover, 1),
            "rainfall": round(rainfall, 2),
            "visibility": round(visibility, 1),
            "timestamp": ts.isoformat(),
        })
    
    return data


if __name__ == "__main__":
    asyncio.run(main())