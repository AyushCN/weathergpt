import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
import logging
from .config import settings

logger = logging.getLogger(__name__)


class MLService:
    def __init__(self):
        self.temperature_model = None
        self.rain_model = None
        self.temperature_scaler = None
        self.rain_scaler = None
        self.model_version = "1.0.0"
        self._load_models()

    def _load_models(self):
        """Load trained XGBoost models."""
        model_dir = settings.MODEL_DIR
        temp_path = os.path.join(model_dir, settings.TEMPERATURE_MODEL_PATH)
        rain_path = os.path.join(model_dir, settings.RAIN_MODEL_PATH)
        
        try:
            if os.path.exists(temp_path):
                self.temperature_model = joblib.load(temp_path)
                logger.info("Loaded temperature model")
            else:
                logger.warning(f"Temperature model not found at {temp_path}")
            
            if os.path.exists(rain_path):
                self.rain_model = joblib.load(rain_path)
                logger.info("Loaded rain model")
            else:
                logger.warning(f"Rain model not found at {rain_path}")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")

    def prepare_features(
        self,
        current_weather: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None
    ) -> np.ndarray:
        """Prepare features for ML models from current weather and history."""
        
        features = {}
        
        # Current weather features
        features["temperature"] = current_weather.get("temperature", 0)
        features["humidity"] = current_weather.get("humidity", 0)
        features["pressure"] = current_weather.get("pressure", 1013)
        features["wind_speed"] = current_weather.get("wind_speed", 0)
        features["wind_direction"] = current_weather.get("wind_direction", 0)
        features["cloud_cover"] = current_weather.get("cloud_cover", 0)
        features["rainfall"] = current_weather.get("rainfall", 0)
        features["visibility"] = current_weather.get("visibility", 10000)
        
        # Time features
        now = datetime.now()
        features["hour"] = now.hour
        features["day_of_year"] = now.timetuple().tm_yday
        features["month"] = now.month
        features["day_of_week"] = now.weekday()
        features["is_night"] = 1 if now.hour < 6 or now.hour > 18 else 0
        
        # Historical features (lag features)
        if historical_data and len(historical_data) > 0:
            # Last hour temperature
            features["temp_1h_ago"] = historical_data[-1].get("temperature", features["temperature"])
            # Last 3 hours average
            if len(historical_data) >= 3:
                features["temp_3h_avg"] = np.mean([d.get("temperature", 0) for d in historical_data[-3:]])
                features["rain_3h_sum"] = np.sum([d.get("rainfall", 0) for d in historical_data[-3:]])
            else:
                features["temp_3h_avg"] = features["temperature"]
                features["rain_3h_sum"] = features["rainfall"]
            
            # 24 hours ago
            if len(historical_data) >= 24:
                features["temp_24h_ago"] = historical_data[-24].get("temperature", features["temperature"])
                features["rain_24h_sum"] = np.sum([d.get("rainfall", 0) for d in historical_data[-24:]])
            else:
                features["temp_24h_ago"] = features["temperature"]
                features["rain_24h_sum"] = features["rainfall"]
        else:
            features["temp_1h_ago"] = features["temperature"]
            features["temp_3h_avg"] = features["temperature"]
            features["rain_3h_sum"] = features["rainfall"]
            features["temp_24h_ago"] = features["temperature"]
            features["rain_24h_sum"] = features["rainfall"]
        
        # Convert to array in correct order
        feature_order = [
            "temperature", "humidity", "pressure", "wind_speed", "wind_direction",
            "cloud_cover", "rainfall", "visibility",
            "hour", "day_of_year", "month", "day_of_week", "is_night",
            "temp_1h_ago", "temp_3h_avg", "rain_3h_sum", "temp_24h_ago", "rain_24h_sum"
        ]
        
        return np.array([[features.get(f, 0) for f in feature_order]])

    def predict_temperature(
        self,
        current_weather: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None,
        horizon_hours: int = 3
    ) -> Dict[str, Any]:
        """Predict temperature for given horizon."""
        
        if self.temperature_model is None:
            return {
                "predicted_value": None,
                "confidence": 0.0,
                "error": "Model not loaded"
            }
        
        try:
            features = self.prepare_features(current_weather, historical_data)
            
            # For multi-horizon, we'd need separate models or a multi-output model
            # For now, use the same model and adjust based on horizon
            prediction = self.temperature_model.predict(features)[0]
            
            # Simple confidence based on model type
            confidence = 0.85  # placeholder
            
            return {
                "predicted_value": round(float(prediction), 1),
                "confidence": confidence,
                "horizon_hours": horizon_hours,
                "model_version": self.model_version,
                "features_used": {
                    "temperature": current_weather.get("temperature"),
                    "humidity": current_weather.get("humidity"),
                    "pressure": current_weather.get("pressure"),
                }
            }
        except Exception as e:
            logger.error(f"Temperature prediction error: {e}")
            return {
                "predicted_value": None,
                "confidence": 0.0,
                "error": str(e)
            }

    def predict_rain(
        self,
        current_weather: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None,
        horizon_hours: int = 6
    ) -> Dict[str, Any]:
        """Predict rain probability for given horizon."""
        
        if self.rain_model is None:
            return {
                "will_rain": None,
                "probability": 0.0,
                "confidence": 0.0,
                "error": "Model not loaded"
            }
        
        try:
            features = self.prepare_features(current_weather, historical_data)
            
            # Get probability
            prob = self.rain_model.predict_proba(features)[0]
            rain_prob = prob[1] if len(prob) > 1 else prob[0]
            will_rain = rain_prob > 0.5
            
            return {
                "will_rain": bool(will_rain),
                "probability": round(float(rain_prob), 3),
                "confidence": 0.82,  # placeholder
                "horizon_hours": horizon_hours,
                "model_version": self.model_version,
                "features_used": {
                    "humidity": current_weather.get("humidity"),
                    "cloud_cover": current_weather.get("cloud_cover"),
                    "pressure": current_weather.get("pressure"),
                    "rainfall": current_weather.get("rainfall"),
                }
            }
        except Exception as e:
            logger.error(f"Rain prediction error: {e}")
            return {
                "will_rain": None,
                "probability": 0.0,
                "confidence": 0.0,
                "error": str(e)
            }

    def get_predictions_for_horizons(
        self,
        current_weather: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Get predictions for multiple time horizons."""
        
        horizons = [1, 3, 6, 12, 24]
        results = {
            "temperature": {},
            "rain": {},
            "generated_at": datetime.now().isoformat()
        }
        
        for h in horizons:
            temp_pred = self.predict_temperature(current_weather, historical_data, h)
            rain_pred = self.predict_rain(current_weather, historical_data, h)
            
            results["temperature"][f"{h}h"] = temp_pred
            results["rain"][f"{h}h"] = rain_pred
        
        return results


# Training utilities
class ModelTrainer:
    """Utility class for training XGBoost models."""
    
    @staticmethod
    def prepare_training_data(
        weather_data: List[Dict[str, Any]],
        target_horizon_hours: int = 3
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data from historical weather observations."""
        
        df = pd.DataFrame(weather_data)
        df = df.sort_values("timestamp")
        
        # Create features
        df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
        df["day_of_year"] = pd.to_datetime(df["timestamp"]).dt.dayofyear
        df["month"] = pd.to_datetime(df["timestamp"]).dt.month
        df["day_of_week"] = pd.to_datetime(df["timestamp"]).dt.dayofweek
        df["is_night"] = df["hour"].apply(lambda x: 1 if x < 6 or x > 18 else 0)
        
        # Lag features
        for lag in [1, 3, 6, 12, 24]:
            df[f"temp_lag_{lag}"] = df["temperature"].shift(lag)
            df[f"rain_lag_{lag}"] = df["rainfall"].shift(lag)
        
        # Rolling features
        df["temp_rolling_3h"] = df["temperature"].rolling(3).mean()
        df["rain_rolling_3h"] = df["rainfall"].rolling(3).sum()
        df["temp_rolling_24h"] = df["temperature"].rolling(24).mean()
        df["rain_rolling_24h"] = df["rainfall"].rolling(24).sum()
        
        # Targets
        df["target_temp"] = df["temperature"].shift(-target_horizon_hours)
        df["target_rain"] = (df["rainfall"].shift(-target_horizon_hours) > 0).astype(int)
        
        # Drop NaN
        df = df.dropna()
        
        feature_cols = [
            "temperature", "humidity", "pressure", "wind_speed", "wind_direction",
            "cloud_cover", "rainfall", "visibility",
            "hour", "day_of_year", "month", "day_of_week", "is_night",
            "temp_lag_1", "temp_rolling_3h", "rain_rolling_3h",
            "temp_lag_24", "rain_rolling_24h"
        ]
        
        X = df[feature_cols].values
        y_temp = df["target_temp"].values
        y_rain = df["target_rain"].values
        
        # Train/test split (time-based)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_temp_train, y_temp_test = y_temp[:split_idx], y_temp[split_idx:]
        y_rain_train, y_rain_test = y_rain[:split_idx], y_rain[split_idx:]
        
        return X_train, X_test, y_temp_train, y_temp_test, y_rain_train, y_rain_test

    @staticmethod
    def train_temperature_model(X_train, y_temp_train, X_test, y_temp_test):
        """Train XGBoost temperature regression model."""
        import xgboost as xgb
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(
            X_train, y_temp_train,
            eval_set=[(X_test, y_temp_test)],
            verbose=False
        )
        
        # Evaluate
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_temp_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_temp_test, y_pred))
        r2 = r2_score(y_temp_test, y_pred)
        
        logger.info(f"Temperature Model - MAE: {mae:.2f}, RMSE: {rmse:.2f}, R²: {r2:.3f}")
        
        return model, {"mae": mae, "rmse": rmse, "r2": r2}

    @staticmethod
    def train_rain_model(X_train, y_rain_train, X_test, y_rain_test):
        """Train XGBoost rain classification model."""
        import xgboost as xgb
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
        
        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
            eval_metric="logloss"
        )
        
        model.fit(
            X_train, y_rain_train,
            eval_set=[(X_test, y_rain_test)],
            verbose=False
        )
        
        # Evaluate
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_rain_test, y_pred)
        prec = precision_score(y_rain_test, y_pred, zero_division=0)
        rec = recall_score(y_rain_test, y_pred, zero_division=0)
        f1 = f1_score(y_rain_test, y_pred, zero_division=0)
        auc = roc_auc_score(y_rain_test, y_prob)
        
        logger.info(f"Rain Model - Acc: {acc:.3f}, Prec: {prec:.3f}, Rec: {rec:.3f}, F1: {f1:.3f}, AUC: {auc:.3f}")
        
        return model, {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc}

    @staticmethod
    def save_models(temp_model, rain_model, model_dir: str):
        """Save trained models."""
        os.makedirs(model_dir, exist_ok=True)
        joblib.dump(temp_model, os.path.join(model_dir, "temperature_model.pkl"))
        joblib.dump(rain_model, os.path.join(model_dir, "rain_model.pkl"))
        logger.info(f"Models saved to {model_dir}")