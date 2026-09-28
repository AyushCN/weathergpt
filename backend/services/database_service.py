from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd

from .models import (
    Location,
    WeatherObservation,
    WeatherForecast,
    WeatherPrediction,
    WeatherAlert,
    UserQuery,
    HistoricalWeather,
)
from .schemas import (
    LocationCreate,
    WeatherObservationCreate,
    WeatherForecastCreate,
    WeatherPredictionCreate,
    WeatherAlertCreate,
    HistoricalWeatherCreate,
)


class DatabaseService:
    def __init__(self, db: Session):
        self.db = db

    # Location operations
    def get_or_create_location(
        self,
        name: str,
        latitude: float,
        longitude: float,
        **kwargs
    ) -> Location:
        """Get existing location or create new one."""
        # Try to find existing location within 0.01 degrees (~1km)
        stmt = select(Location).where(
            and_(
                func.abs(Location.latitude - latitude) < 0.01,
                func.abs(Location.longitude - longitude) < 0.01,
            )
        )
        result = self.db.execute(stmt)
        location = result.scalar_one_or_none()
        
        if location:
            return location
        
        # Create new location
        location = Location(
            name=name,
            latitude=latitude,
            longitude=longitude,
            **kwargs
        )
        self.db.add(location)
        self.db.flush()
        return location

    def get_location_by_id(self, location_id: int) -> Optional[Location]:
        stmt = select(Location).where(Location.id == location_id)
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()

    def search_locations(self, query: str, limit: int = 10) -> List[Location]:
        stmt = (
            select(Location)
            .where(Location.name.ilike(f"%{query}%"))
            .where(Location.is_active == True)
            .limit(limit)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    # Weather Observation operations
    def save_observation(self, obs: WeatherObservationCreate) -> WeatherObservation:
        db_obs = WeatherObservation(**obs.model_dump())
        self.db.add(db_obs)
        self.db.flush()
        return db_obs

    def get_latest_observation(self, location_id: int) -> Optional[WeatherObservation]:
        stmt = (
            select(WeatherObservation)
            .where(WeatherObservation.location_id == location_id)
            .order_by(desc(WeatherObservation.timestamp))
            .limit(1)
        )
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()

    def get_observations_range(
        self,
        location_id: int,
        start: datetime,
        end: datetime
    ) -> List[WeatherObservation]:
        stmt = (
            select(WeatherObservation)
            .where(
                and_(
                    WeatherObservation.location_id == location_id,
                    WeatherObservation.timestamp >= start,
                    WeatherObservation.timestamp <= end,
                )
            )
            .order_by(WeatherObservation.timestamp)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_recent_observations(
        self,
        location_id: int,
        hours: int = 24
    ) -> List[WeatherObservation]:
        start = datetime.utcnow() - timedelta(hours=hours)
        return self.get_observations_range(location_id, start, datetime.utcnow())

    # Weather Forecast operations
    def save_forecast(self, forecast: WeatherForecastCreate) -> WeatherForecast:
        db_fcst = WeatherForecast(**forecast.model_dump())
        self.db.add(db_fcst)
        self.db.flush()
        return db_fcst

    def bulk_save_forecasts(self, forecasts: List[WeatherForecastCreate]) -> List[WeatherForecast]:
        db_fcsts = [WeatherForecast(**f.model_dump()) for f in forecasts]
        self.db.add_all(db_fcsts)
        self.db.flush()
        return db_fcsts

    def get_forecasts(
        self,
        location_id: int,
        start: datetime,
        end: datetime
    ) -> List[WeatherForecast]:
        stmt = (
            select(WeatherForecast)
            .where(
                and_(
                    WeatherForecast.location_id == location_id,
                    WeatherForecast.valid_time >= start,
                    WeatherForecast.valid_time <= end,
                )
            )
            .order_by(WeatherForecast.valid_time)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_latest_forecast_run(self, location_id: int) -> Optional[WeatherForecast]:
        stmt = (
            select(WeatherForecast)
            .where(WeatherForecast.location_id == location_id)
            .order_by(desc(WeatherForecast.forecast_timestamp))
            .limit(1)
        )
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()

    # Weather Prediction operations
    def save_prediction(self, pred: WeatherPredictionCreate) -> WeatherPrediction:
        db_pred = WeatherPrediction(**pred.model_dump())
        self.db.add(db_pred)
        self.db.flush()
        return db_pred

    def bulk_save_predictions(self, predictions: List[WeatherPredictionCreate]) -> List[WeatherPrediction]:
        db_preds = [WeatherPrediction(**p.model_dump()) for p in predictions]
        self.db.add_all(db_preds)
        self.db.flush()
        return db_preds

    def get_predictions(
        self,
        location_id: int,
        prediction_type: str,
        start: datetime,
        end: datetime
    ) -> List[WeatherPrediction]:
        stmt = (
            select(WeatherPrediction)
            .where(
                and_(
                    WeatherPrediction.location_id == location_id,
                    WeatherPrediction.prediction_type == prediction_type,
                    WeatherPrediction.valid_time >= start,
                    WeatherPrediction.valid_time <= end,
                )
            )
            .order_by(WeatherPrediction.valid_time)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    # Weather Alert operations
    def save_alert(self, alert: WeatherAlertCreate) -> WeatherAlert:
        # Check if similar alert already exists
        stmt = select(WeatherAlert).where(
            and_(
                WeatherAlert.location_id == alert.location_id,
                WeatherAlert.alert_type == alert.alert_type,
                WeatherAlert.source_id == alert.source_id,
            )
        )
        result = self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing
            for key, value in alert.model_dump().items():
                setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            self.db.flush()
            return existing
        
        db_alert = WeatherAlert(**alert.model_dump())
        self.db.add(db_alert)
        self.db.flush()
        return db_alert

    def bulk_save_alerts(self, alerts: List[WeatherAlertCreate]) -> List[WeatherAlert]:
        saved = []
        for alert in alerts:
            saved.append(self.save_alert(alert))
        return saved

    def get_active_alerts(self, location_id: int) -> List[WeatherAlert]:
        now = datetime.utcnow()
        stmt = (
            select(WeatherAlert)
            .where(
                and_(
                    WeatherAlert.location_id == location_id,
                    WeatherAlert.is_active == True,
                    WeatherAlert.issued_at <= now,
                    WeatherAlert.expires_at >= now,
                )
            )
            .order_by(desc(WeatherAlert.severity), desc(WeatherAlert.issued_at))
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_all_active_alerts(self) -> List[WeatherAlert]:
        now = datetime.utcnow()
        stmt = (
            select(WeatherAlert)
            .where(
                and_(
                    WeatherAlert.is_active == True,
                    WeatherAlert.issued_at <= now,
                    WeatherAlert.expires_at >= now,
                )
            )
            .order_by(desc(WeatherAlert.severity), desc(WeatherAlert.issued_at))
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    # User Query operations
    def save_query(self, session_id: str, user_message: str, **kwargs) -> UserQuery:
        query = UserQuery(
            session_id=session_id,
            user_message=user_message,
            **kwargs
        )
        self.db.add(query)
        self.db.flush()
        return query

    def update_query_response(
        self,
        query_id: int,
        ai_response: str,
        intent: str,
        entities: Dict[str, Any],
        response_time_ms: int
    ) -> Optional[UserQuery]:
        stmt = select(UserQuery).where(UserQuery.id == query_id)
        result = self.db.execute(stmt)
        query = result.scalar_one_or_none()
        
        if query:
            query.ai_response = ai_response
            query.intent = intent
            query.extracted_entities = entities
            query.response_time_ms = response_time_ms
            self.db.flush()
        
        return query

    # Historical Weather operations
    def save_historical(self, hist: HistoricalWeatherCreate) -> HistoricalWeather:
        db_hist = HistoricalWeather(**hist.model_dump())
        self.db.add(db_hist)
        self.db.flush()
        return db_hist

    def bulk_save_historical(self, historical: List[HistoricalWeatherCreate]) -> List[HistoricalWeather]:
        db_hists = [HistoricalWeather(**h.model_dump()) for h in historical]
        self.db.add_all(db_hists)
        self.db.flush()
        return db_hists

    def get_historical_range(
        self,
        location_id: int,
        start_year: int,
        end_year: int
    ) -> List[HistoricalWeather]:
        stmt = (
            select(HistoricalWeather)
            .where(
                and_(
                    HistoricalWeather.location_id == location_id,
                    HistoricalWeather.year >= start_year,
                    HistoricalWeather.year <= end_year,
                )
            )
            .order_by(HistoricalWeather.date)
        )
        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_historical_statistics(
        self,
        location_id: int,
        years: int = 10
    ) -> Dict[str, Any]:
        """Get statistical summary of historical data."""
        end_year = datetime.now().year
        start_year = end_year - years
        
        hist_data = self.get_historical_range(location_id, start_year, end_year)
        
        if not hist_data:
            return {}
        
        df = pd.DataFrame([
            {
                "year": h.year,
                "month": h.month,
                "avg_temp": h.avg_temperature,
                "min_temp": h.min_temperature,
                "max_temp": h.max_temperature,
                "rainfall": h.total_rainfall,
                "humidity": h.avg_humidity,
                "wind": h.avg_wind_speed,
            }
            for h in hist_data
        ])
        
        return {
            "temperature": {
                "mean": df["avg_temp"].mean(),
                "min": df["min_temp"].min(),
                "max": df["max_temp"].max(),
                "std": df["avg_temp"].std(),
                "yearly_trend": df.groupby("year")["avg_temp"].mean().to_dict(),
            },
            "rainfall": {
                "mean": df["rainfall"].mean(),
                "total": df["rainfall"].sum(),
                "max": df["rainfall"].max(),
                "yearly_trend": df.groupby("year")["rainfall"].sum().to_dict(),
            },
            "monthly_avg_temp": df.groupby("month")["avg_temp"].mean().to_dict(),
            "monthly_avg_rain": df.groupby("month")["rainfall"].mean().to_dict(),
        }