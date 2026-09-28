import google.generativeai as genai
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from .config import settings
from .schemas import IntentType

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            self.model = None
            logger.warning("Gemini API key not configured")

    async def extract_intent_and_entities(
        self,
        user_message: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Extract intent, location, time, and other entities from user message."""
        
        if not self.model:
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
            response = await self.model.generate_content_async(
                f"{system_prompt}\n\nUser message: {user_message}\n\nLanguage: {language}"
            )
            
            # Parse JSON response
            text = response.text.strip()
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
        
        if not self.model:
            return self._fallback_response(user_message, weather_data, intent)
        
        system_prompt = f"""You are WeatherGPT, a friendly and knowledgeable weather assistant. 
Generate a natural, conversational response to the user's weather question using the provided data.

Guidelines:
- Be conversational and helpful
- Use the weather data provided - NEVER make up weather information
- If data is missing, say so honestly
- Include relevant predictions from ML models if available
- Include alerts if any
- Respond in the user's language: {language}
- Keep responses concise but informative
- Use emojis appropriately for weather conditions

User asked: "{user_message}"
Intent: {intent.value}

Current weather data: {json.dumps(weather_data.get('current', {}), default=str)}
Forecast data: {json.dumps(weather_data.get('forecast', []), default=str)[:2000]}
ML Predictions: {json.dumps(predictions, default=str) if predictions else 'None'}
Alerts: {json.dumps(alerts, default=str) if alerts else 'None'}

Provide a natural language response:"""

        try:
            response = await self.model.generate_content_async(system_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"LLM response generation error: {e}")
            return self._fallback_response(user_message, weather_data, intent)

    def _fallback_response(
        self,
        user_message: str,
        weather_data: Dict[str, Any],
        intent: IntentType
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
            return f"Currently it's {temp}°C with {desc}. Humidity: {humidity}%, Wind: {wind} km/h."
        
        if intent == IntentType.RAIN_PROBABILITY:
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
            return f"Current temperature is {temp}°C."
        
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
        
        if not self.model:
            return self._fallback_advisory(weather_data, alerts)
        
        system_prompt = f"""You are WeatherGPT providing practical weather advisories.
Generate helpful, actionable advice based on the weather conditions.

Weather data: {json.dumps(weather_data, default=str)[:2000]}
Predictions: {json.dumps(predictions, default=str) if predictions else 'None'}
Alerts: {json.dumps(alerts, default=str) if alerts else 'None'}
User context: {json.dumps(user_context, default=str) if user_context else 'None'}

Provide practical advice (carry umbrella, avoid travel, irrigation timing, etc.) in {language}:"""

        try:
            response = await self.model.generate_content_async(system_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"LLM advisory error: {e}")
            return self._fallback_advisory(weather_data, alerts)

    def _fallback_advisory(
        self,
        weather_data: Dict[str, Any],
        alerts: Optional[List[Dict[str, Any]]]
    ) -> str:
        """Fallback advisory."""
        advice = []
        current = weather_data.get("current", {})
        
        if current.get("rainfall", 0) > 0 or current.get("precipitation", 0) > 0:
            advice.append("Carry an umbrella - it's raining.")
        
        temp = current.get("temperature")
        if temp and temp > 35:
            advice.append("Stay hydrated and avoid prolonged sun exposure - very hot.")
        elif temp and temp < 10:
            advice.append("Dress warmly - it's quite cold.")
        
        if alerts:
            advice.append(f"Weather alert active: {alerts[0].get('title', 'Check details')}")
        
        return " ".join(advice) if advice else "Weather looks fine for normal activities."