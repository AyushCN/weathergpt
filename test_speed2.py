import time
import requests

start = time.time()
url = 'http://127.0.0.1:8000/api/weather/historical?latitude=28.7041&longitude=77.1025' # Delhi
try:
    r = requests.get(url)
    end = time.time()
    print(f"Status: {r.status_code}")
    print(f"Time taken: {end - start:.2f}s")
except Exception as e:
    print(f"Error: {e}")
