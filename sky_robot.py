import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta
try:
    import zoneinfo
except ImportError:
    zoneinfo = None

def get_central_now():
    if zoneinfo:
        return datetime.now(zoneinfo.ZoneInfo("America/Chicago"))
    # Fallback for old servers: UTC minus 5 hours (Central Daylight Time)
    return datetime.now(timezone.utc) - timedelta(hours=5)

print("🤖 SKY ROBOT: Waking up...")

API_KEY = "d1a7fcdb2d6f38c6b216b37322444de9"
LAT = 36.10336
LON = -95.92734
WEATHER_URL = f"https://api.openweathermap.org/data/3.0/onecall?lat={LAT}&lon={LON}&appid={API_KEY}&exclude=minutely,hourly,alerts&units=imperial"

# 1. Fetch REAL data from the internet
print("🤖 SKY ROBOT: Reaching out to OpenWeather API...")
req = urllib.request.urlopen(WEATHER_URL)
live_data = json.loads(req.read())

real_uv = live_data.get("current", {}).get("uvi", 0.0)
print(f"🤖 SKY ROBOT: OpenWeather says the current UV is {real_uv}")

# 2. Open our Database (or create it if it doesn't exist yet!)
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, "data", "db.json")

# Make sure the folder exists
os.makedirs(os.path.dirname(db_path), exist_ok=True)

if not os.path.exists(db_path):
    print("🤖 SKY ROBOT: No database found! Creating a brand new one from scratch...")
    database = {"data_records": []}
else:
    with open(db_path, "r") as file:
        database = json.load(file)

# 3. Figure out what "Today" is in Central Time
today_str = get_central_now().strftime("%Y-%m-%d")

# 4. Search for Today's record, or create it if it's a new day
today_record = None
for record in database["data_records"]:
    if record["dt_record"] == today_str:
        today_record = record
        break

if not today_record:
    print(f"🤖 SKY ROBOT: Creating a brand new record for {today_str}!")
    today_record = {
        "dt_record": today_str,
        "pk_uv_val": 0.0,
        "pk_flr_cls": "C1.0",
        "av_wnd_mph": 0.0,
        "is_rain_day": False
    }
    database["data_records"].append(today_record)

# 5. Check if the current UV broke the daily record!
if real_uv > today_record["pk_uv_val"]:
    print(f"🤖 SKY ROBOT: New UV Peak! {real_uv} is higher than the old peak of {today_record['pk_uv_val']}")
    today_record["pk_uv_val"] = real_uv
else:
    print(f"🤖 SKY ROBOT: UV Peak remains at {today_record['pk_uv_val']}")

# 6. Update the system timestamp and save it perfectly formatted for Earth
database["sys_last_upd"] = get_central_now().strftime("%Y-%m-%d %I:%M %p")
with open(db_path, "w") as file:
    json.dump(database, file, indent=3)

print("🤖 SKY ROBOT: I have updated db.json with real data. Going back to sleep!")
