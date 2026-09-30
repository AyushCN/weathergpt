import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from groq import AsyncGroq
import httpx
from backend.config import settings
from backend.schemas import IntentType

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.groq_client = None
        self.ollama_client = None
        self.current_provider = None
        self.model = None
        
        # Initialize providers based on config
        self._init_providers()
    
    def _init_providers(self):
        """Initialize available LLM providers based on config."""
        providers = []
        
        # Check Groq
        if settings.GROQ_API_KEY:
            providers.append(("groq", lambda: setattr(self, 'groq_client', AsyncGroq(api_key=settings.GROQ_API_KEY))))
        
        # Check Ollama
        providers.append(("ollama", lambda: setattr(self, 'ollama_client', httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=60.0))))
        
        # Keyword fallback is always available
        providers.append(("keyword", lambda: None))
        
        # Select primary provider
        primary = settings.LLM_PRIMARY_PROVIDER
        fallback = [p.strip() for p in settings.LLM_FALLBACK_PROVIDERS.split(",")]
        
        if settings.LLM_AUTO_SELECT:
            # Try primary first, then fallbacks
            for provider_name in [primary] + fallback:
                if provider_name == "groq" and settings.GROQ_API_KEY:
                    self.current_provider = "groq"
                    self.model = settings.GROQ_MODEL
                    self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                    logger.info(f"Using Groq as primary LLM provider")
                    break
                elif provider_name == "ollama":
                    self.current_provider = "ollama"
                    self.model = settings.OLLAMA_MODEL
                    self.ollama_client = httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=60.0)
                    logger.info(f"Using Ollama as primary LLM provider")
                    break
                elif provider_name == "keyword":
                    self.current_provider = "keyword"
                    self.model = None
                    logger.info("Using keyword fallback as LLM provider")
                    break
        else:
            # Use specified primary
            if primary == "groq" and settings.GROQ_API_KEY:
                self.current_provider = "groq"
                self.model = settings.GROQ_MODEL
                self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            elif primary == "ollama":
                self.current_provider = "ollama"
                self.model = settings.OLLAMA_MODEL
                self.ollama_client = httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=60.0)
            else:
                self.current_provider = "keyword"
                self.model = None
                logger.warning("No valid LLM provider configured, using keyword fallback")
    
    async def _call_ollama(self, messages: List[Dict], temperature: float = 0.3, max_tokens: int = 800, response_format: Optional[Dict] = None) -> Optional[str]:
        """Call Ollama API."""
        if not self.ollama_client:
            return None
        
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False
            }
            if response_format:
                payload["format"] = response_format.get("type", "json")
            
            response = await self.ollama_client.post("/api/chat", json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "").strip()
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            return None
    
    async def _call_groq(self, messages: List[Dict], temperature: float = 0.3, max_tokens: int = 800, response_format: Optional[Dict] = None) -> Optional[str]:
        """Call Groq API."""
        if not self.groq_client:
            return None
        
        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            if response_format:
                kwargs["response_format"] = response_format
            
            response = await self.groq_client.chat.completions.create(**kwargs)
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return None
    
    async def _call_llm(self, messages: List[Dict], temperature: float = 0.3, max_tokens: int = 800, response_format: Optional[Dict] = None) -> Optional[str]:
        """Call the appropriate LLM based on current provider."""
        if self.current_provider == "groq":
            return await self._call_groq(messages, temperature, max_tokens, response_format)
        elif self.current_provider == "ollama":
            return await self._call_ollama(messages, temperature, max_tokens, response_format)
        return None

    async def extract_intent_and_entities(
        self,
        user_message: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Extract intent, location, time, and other entities from user message."""
        
        if self.current_provider == "keyword":
            return self._fallback_extract(user_message)
        
        system_prompt = f"""You are a weather query understanding system. Analyze the user's message and extract:
1. Intent (what weather information they want)
2. Location (city, coordinates if mentioned)
3. Time reference (today, tomorrow, this evening, specific date, etc.)
4. Specific weather parameters they're asking about

Current date: {datetime.now().strftime('%Y-%m-%d')}

Intent categories:
- current_weather: Current conditions
- forecast: General forecast
- rain_probability: Will it rain?
- temperature: Temperature specific
- humidity: Humidity specific
- wind: Wind specific
- historical: Past weather data
- alerts: Weather warnings/alerts
- comparison: Compare locations or time periods
- general: General weather question
- greeting: Hello/hi
- unknown: Can't determine

Respond in JSON format:
{{
    "intent": "intent_category",
    "location": {{"name": "city name", "lat": float, "lon": float}} or null,
    "time_reference": "today|tomorrow|this_evening|specific_date|next_days|etc",
    "parameters": ["temperature", "rain", "humidity", etc.],
    "language": "language_code"
}}"""

        try:
            response_text = await self._call_llm(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User message: {user_message}\n\nLanguage: {language}"}
                ],
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            if not response_text:
                return self._fallback_extract(user_message)
            
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()
            
            result = json.loads(text)
            return result
            
        except Exception as e:
            logger.error(f"LLM intent extraction error: {e}")
            return self._fallback_extract(user_message)

    def _fallback_extract(self, user_message: str) -> Dict[str, Any]:
        """Fallback keyword-based extraction when LLM is unavailable."""
        message_lower = user_message.lower()
        
        # Determine intent
        intent = IntentType.UNKNOWN
        if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
            intent = IntentType.GREETING
        elif any(word in message_lower for word in ["rain", "rainfall", "precipitation", "shower"]):
            intent = IntentType.RAIN_PROBABILITY
        elif any(word in message_lower for word in ["temperature", "temp", "hot", "cold", "warm"]):
            intent = IntentType.TEMPERATURE
        elif any(word in message_lower for word in ["humidity", "humid", "moisture"]):
            intent = IntentType.HUMIDITY
        elif any(word in message_lower for word in ["wind", "breeze", "gust"]):
            intent = IntentType.WIND
        elif any(word in message_lower for word in ["alert", "warning", "storm", "cyclone", "severe"]):
            intent = IntentType.ALERTS
        elif any(word in message_lower for word in ["history", "historical", "past", "last year", "trend"]):
            intent = IntentType.HISTORICAL
        elif any(word in message_lower for word in ["compare", "comparison", "vs", "versus"]):
            intent = IntentType.COMPARISON
        elif any(word in message_lower for word in ["forecast", "tomorrow", "next", "week", "outlook"]):
            intent = IntentType.FORECAST
        elif any(word in message_lower for word in ["current", "now", "today", "present"]):
            intent = IntentType.CURRENT_WEATHER
        else:
            intent = IntentType.GENERAL
        
        # Extract time reference
        time_ref = "today"
        if "tomorrow" in message_lower:
            time_ref = "tomorrow"
        elif "this evening" in message_lower or "tonight" in message_lower:
            time_ref = "this_evening"
        elif "next week" in message_lower:
            time_ref = "next_week"
        elif "next" in message_lower and "day" in message_lower:
            time_ref = "next_days"
        
        # Extract parameters
        parameters = []
        if "temperature" in message_lower or "temp" in message_lower:
            parameters.append("temperature")
        if "rain" in message_lower or "precipitation" in message_lower:
            parameters.append("rain")
        if "humidity" in message_lower:
            parameters.append("humidity")
        if "wind" in message_lower:
            parameters.append("wind")
        
        return {
            "intent": intent.value,
            "location": None,
            "time_reference": time_ref,
            "parameters": parameters,
            "language": "en"
        }

    def format_predictions_for_llm(self, predictions: Optional[Dict[str, Any]]) -> str:
        """Convert ML predictions to human-readable text for LLM prompt."""
        if not predictions:
            return "No ML predictions available."
        
        parts = []
        
        # Temperature predictions
        if "temperature" in predictions:
            temp_preds = predictions["temperature"]
            temp_strs = []
            for horizon, pred in temp_preds.items():
                if pred.get("predicted_value") is not None:
                    conf = pred.get('confidence', 0)
                    temp_strs.append(f"{horizon}: {pred['predicted_value']:.1f}°C (confidence: {conf:.0%})")
            if temp_strs:
                parts.append(f"Temperature forecasts: {', '.join(temp_strs)}")
        
        # Rain predictions
        if "rain" in predictions:
            rain_preds = predictions["rain"]
            rain_strs = []
            for horizon, pred in rain_preds.items():
                prob = pred.get("probability", 0)
                will_rain = "Yes" if prob > 0.5 else "No"
                conf = pred.get('confidence', 0)
                rain_strs.append(f"{horizon}: {will_rain} ({prob:.0%} chance, confidence: {pred.get('confidence', 0):.0%})")
            if rain_strs:
                parts.append(f"Rain probability: {', '.join(rain_strs)}")
        
        return "\n".join(parts) if parts else "No ML predictions available."
    
    async def generate_weather_response(
        self,
        user_message: str,
        weather_data: Dict[str, Any],
        predictions: Optional[Dict[str, Any]] = None,
        alerts: Optional[List[Dict[str, Any]]] = None,
        intent: IntentType = IntentType.GENERAL,
        language: str = "en"
    ) -> str:
        """Generate natural language weather response using weather data."""
        
        if self.current_provider == "keyword":
            return self._fallback_response(user_message, weather_data, intent, predictions)
        
        formatted_predictions = self.format_predictions_for_llm(predictions)
        
        system_prompt = f"""You are WeatherGPT, a friendly and knowledgeable weather assistant. 
Generate a natural, conversational response to the user's weather question using the provided data.

CRITICAL GUIDELINES:
1. ONLY respond to queries related to: Weather, Agriculture, or Traveling/Trips.
2. If the user asks a vague question, a generic question, or a question unrelated to the topics above (e.g. "hi", "how are you", "what is 2+2", "write code"), DO NOT answer it. Instead, reply EXACTLY with: "I'm a Weather Assistant! I can only help you with questions related to weather, agriculture, and travel."
3. Be conversational and helpful for valid queries.
4. Use the weather data provided - NEVER make up weather information.
5. If data is missing, say so honestly.
6. Include relevant predictions from ML models if available.
7. Include alerts if any.
8. Respond in the user's language: {language}
9. Keep responses concise but informative.
10. Use emojis appropriately for weather conditions.

User asked: "{user_message}"
Intent: {intent.value}

Current weather data: {json.dumps(weather_data.get('current', {}), default=str)}
Forecast data: {json.dumps(weather_data.get('forecast', []), default=str)[:2000]}
ML Predictions: {self.format_predictions_for_llm(predictions) if predictions else 'None'}
Alerts: {json.dumps(alerts, default=str) if alerts else 'None'}

Provide a natural language response:"""

        try:
            response_text = await self._call_llm(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            if not response_text:
                return self._fallback_response(user_message, weather_data, intent, predictions)
            
            return response_text.strip()
            
        except Exception as e:
            logger.error(f"LLM response generation error: {e}")
            return self._fallback_response(user_message, weather_data, intent, predictions)

    def _fallback_response(
        self,
        user_message: str,
        weather_data: Dict[str, Any],
        intent: IntentType,
        predictions: Optional[Dict[str, Any]] = None
    ) -> str:
        """Fallback response when LLM is unavailable."""
        current = weather_data.get("current", {})
        forecast = weather_data.get("forecast", [])
        
        if intent == IntentType.GREETING:
            return "Hello! I'm WeatherGPT. Ask me about the weather anywhere!"
        
        if intent == IntentType.CURRENT_WEATHER:
            temp = current.get("temperature")
            desc = current.get("weather_description", "unknown conditions")
            humidity = current.get("humidity")
            wind = current.get("wind_speed")
            response = f"Currently it's {temp}°C with {desc}. Humidity: {humidity}%, Wind: {wind} km/h."
            # Add ML temperature prediction if available
            if predictions and "temperature" in predictions:
                pred_1h = predictions["temperature"].get("1h", {}).get("predicted_value")
                if pred_1h is not None:
                    response += f" ML model predicts {pred_1h:.1f}°C in 1 hour."
            return response
        
        if intent == IntentType.RAIN_PROBABILITY:
            # Use ML rain predictions if available
            if predictions and "rain" in predictions:
                rain_preds = predictions["rain"]
                prob_1h = rain_preds.get("1h", {}).get("probability")
                if prob_1h is not None:
                    return f"ML model predicts {prob_1h:.0%} chance of rain in the next hour."
            
            # Fallback to forecast API
            rain_chance = None
            for f in forecast[:24]:
                if f.get("precipitation_probability", 0) > 0:
                    rain_chance = f.get("precipitation_probability")
                    break
            if rain_chance:
                return f"There's a {rain_chance}% chance of rain."
            return "No rain expected in the near forecast."
        
        if intent == IntentType.TEMPERATURE:
            temp = current.get("temperature")
            response = f"Current temperature is {temp}°C."
            # Add ML temperature prediction
            if predictions and "temperature" in predictions:
                pred_1h = predictions["temperature"].get("1h", {}).get("predicted_value")
                if pred_1h is not None:
                    response += f" ML predicts {pred_1h:.1f}°C in 1 hour."
            return response
        
        if intent == IntentType.FORECAST:
            if forecast:
                daily = forecast[0] if forecast else {}
                return f"Forecast: High {daily.get('temperature_max', 'N/A')}°C, Low {daily.get('temperature_min', 'N/A')}°C."
            return "Forecast data unavailable."
        
        return "I can help you with weather information. What would you like to know?"

    async def generate_advisory(
        self,
        weather_data: Dict[str, Any],
        predictions: Optional[Dict[str, Any]] = None,
        alerts: Optional[List[Dict[str, Any]]] = None,
        user_context: Optional[Dict[str, Any]] = None,
        language: str = "en"
    ) -> str:
        """Generate weather-based advisory."""
        
        if self.current_provider == "keyword":
            return self._fallback_advisory(weather_data, predictions, alerts)
        
        system_prompt = f"""You are WeatherGPT providing practical weather advisories.
Generate helpful, actionable advice based on the weather conditions.

Weather data: {json.dumps(weather_data, default=str)[:2000]}
ML Predictions: {self.format_predictions_for_llm(predictions) if predictions else 'None'}
Alerts: {json.dumps(alerts, default=str) if alerts else 'None'}
User context: {json.dumps(user_context, default=str) if user_context else 'None'}

Provide practical advice (carry umbrella, avoid travel, irrigation timing, etc.) in {language}:"""

        try:
            response_text = await self._call_llm(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate weather advisory"}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            if not response_text:
                return self._fallback_advisory(weather_data, predictions, alerts)
            
            return response_text.strip()
            
        except Exception as e:
            logger.error(f"LLM advisory error: {e}")
            return self._fallback_advisory(weather_data, predictions, alerts)

    def _fallback_advisory(
        self,
        weather_data: Dict[str, Any],
        predictions: Optional[Dict[str, Any]] = None,
        alerts: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Fallback advisory."""
        advice = []
        current = weather_data.get("current", {})
        
        # Use ML rain predictions for advisory
        if predictions and "rain" in predictions:
            rain_prob = predictions["rain"].get("1h", {}).get("probability", 0)
            if rain_prob > 0.5:
                advice.append(f"High chance of rain ({rain_prob:.0%}) - carry an umbrella.")
            elif rain_prob > 0.2:
                advice.append(f"Possible rain ({rain_prob:.0%}) - consider an umbrella.")
        elif current.get("rainfall", 0) > 0 or current.get("precipitation", 0) > 0:
            advice.append("Carry an umbrella - it's raining.")
        
        # Use ML temperature predictions
        if predictions and "temperature" in predictions:
            pred_temp = predictions["temperature"].get("1h", {}).get("predicted_value")
            if pred_temp is not None:
                if pred_temp > 35:
                    advice.append(f"Temperature rising to {pred_temp:.1f}°C - stay hydrated, avoid sun exposure.")
                elif pred_temp < 5:
                    advice.append(f"Temperature dropping to {pred_temp:.1f}°C - dress warmly.")
        
        # Current temperature fallback
        temp = current.get("temperature")
        if temp and temp > 35 and not (predictions and "temperature" in predictions):
            advice.append("Stay hydrated and avoid prolonged sun exposure - very hot.")
        elif temp and temp < 10 and not (predictions and "temperature" in predictions):
            advice.append("Dress warmly - it's quite cold.")
        
        if alerts:
            advice.append(f"Weather alert active: {alerts[0].get('title', 'Check details')}")
        
        return " ".join(advice) if advice else "Weather looks fine for normal activities."