import requests

url = "http://127.0.0.1:8000/api/weather/historical?latitude=19.0760&longitude=72.8777"
r = requests.get(url)
data = r.json()
print("Keys:", data.keys())
print("Trend length:", len(data.get("temperature_trend", [])))
if len(data.get("temperature_trend", [])) > 0:
    print("First item:", data["temperature_trend"][0])
