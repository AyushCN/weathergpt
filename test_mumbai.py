import asyncio
from backend.services.weather_service import WeatherService

async def main():
    ws = WeatherService()
    res = await ws.get_historical_weather(19.0760, 72.8777, "2016-01-01", "2026-01-01")
    print(res)

asyncio.run(main())
