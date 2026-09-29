import time
import requests

url = 'http://127.0.0.1:8000/api/weather/historical?latitude=12.9716&longitude=77.5946'
print(f"Fetching {url}...")
r = requests.get(url)
print(f"Status: {r.status_code}")
if r.status_code != 200:
    print(r.text)
