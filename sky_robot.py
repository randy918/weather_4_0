#!/usr/bin/env python3
"""
=============================================================================
🤖 SKY ROBOT - Backend Automation Script
=============================================================================
Description:
Fetches weather, UV, and solar flare data to maintain the db.json database.

Changelog / Metadata:
- 2026-10-09: Added 30-day passive auto-backup feature for db.json.
- [Prior]: Initial script creation; OpenWeather & NOAA API integrations.
=============================================================================
"""

import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta
try:
    import zoneinfo
except ImportError:
    zoneinfo = None

def get_central_now():
    try:
        if zoneinfo:
            return datetime.now(zoneinfo.ZoneInfo("America/Chicago"))
    except Exception:
        pass
    # Fallback for old servers or servers missing tzdata: UTC minus 5 hours
    return datetime.now(timezone.utc) - timedelta(hours=5)

current_time_str = get_central_now().strftime('%Y-%m-%d %I:%M:%S %p')
print(f"\\n--- RUN TIMESTAMP: {current_time_str} Central ---")
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

# Fetch NOAA X-ray Flux for Solar Flares and Radio Blackouts
print("🤖 SKY ROBOT: Reaching out to NOAA SWPC for Solar Flares...")
NOAA_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json"
real_flux = 0.0
real_flare_str = "A1.0"
r_cls = "R0"
r_val = 0.1

try:
    req_noaa = urllib.request.urlopen(NOAA_URL)
    noaa_data = json.loads(req_noaa.read())
    primary_readings = [d for d in noaa_data if d.get("energy") == "0.1-0.8nm" and isinstance(d.get("flux"), float)]
    if primary_readings:
        real_flux = primary_readings[-1]["flux"]
        
        # Calculate Flare Class
        if real_flux < 1e-7:
            flare_cls, flare_val = "A", real_flux / 1e-8
        elif real_flux < 1e-6:
            flare_cls, flare_val = "B", real_flux / 1e-7
        elif real_flux < 1e-5:
            flare_cls, flare_val = "C", real_flux / 1e-6
        elif real_flux < 1e-4:
            flare_cls, flare_val = "M", real_flux / 1e-5
        else:
            flare_cls, flare_val = "X", real_flux / 1e-4
        real_flare_str = f"{flare_cls}{flare_val:.1f}"
        
        # Calculate Radio Blackout Class
        if real_flux < 1e-5:
            r_cls, r_val = "R0", max(0.1, min(0.9, (real_flux / 1e-5) * 0.8 + 0.1))
        elif real_flux < 5e-5:
            r_cls, r_val = "R1", 1.0 + ((real_flux - 1e-5) / 4e-5) * 1.5
        elif real_flux < 1e-4:
            r_cls, r_val = "R2", 2.5 + ((real_flux - 5e-5) / 5e-5) * 2.5
        elif real_flux < 1e-3:
            r_cls, r_val = "R3", 5.0 + ((real_flux - 1e-4) / 9e-4) * 10.0
        elif real_flux < 2e-3:
            r_cls, r_val = "R4", 15.0 + ((real_flux - 1e-3) / 1e-3) * 10.0
        else:
            r_cls, r_val = "R5", 25.0 + min(15.0, ((real_flux - 2e-3) / 1e-3) * 10.0)
            
        print(f"🤖 SKY ROBOT: Current Flux is {real_flux}. Flare: {real_flare_str}, Radio Blackout: {r_cls} ({r_val:.1f})")
except Exception as e:
    print(f"🤖 SKY ROBOT: Failed to fetch from NOAA (X-ray): {e}")

# Fetch NOAA Planetary K-index for Geomagnetic Storms (G-Scale)
print("🤖 SKY ROBOT: Reaching out to NOAA SWPC for Geomagnetic Storms...")
NOAA_KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
real_kp = 0.0
g_cls = "G0"

try:
    req_kp = urllib.request.urlopen(NOAA_KP_URL)
    kp_data = json.loads(req_kp.read())
    # data is [["time_tag", "Kp_index", ...], ...]
    if isinstance(kp_data, list) and len(kp_data) > 1:
        latest = kp_data[-1]
        if len(latest) >= 2:
            real_kp = float(latest[1])
            
            # Calculate Geomagnetic Storm Class
            if real_kp < 5:
                g_cls = "G0"
            elif real_kp < 6:
                g_cls = "G1"
            elif real_kp < 7:
                g_cls = "G2"
            elif real_kp < 8:
                g_cls = "G3"
            elif real_kp < 9:
                g_cls = "G4"
            else:
                g_cls = "G5"
            print(f"🤖 SKY ROBOT: Current Kp Index is {real_kp:.1f}. Geomagnetic Storm: {g_cls}")
except Exception as e:
    print(f"🤖 SKY ROBOT: Failed to fetch from NOAA (Kp-index): {e}")

# 2. Open our Database (or create it if it doesn't exist yet!)
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, "data", "db.json")

print(f"🤖 SKY ROBOT: My script directory is {script_dir}")
print(f"🤖 SKY ROBOT: I will try to save the database to {db_path}")

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
        "pk_flr_cls": "A1.0",
        "pk_r_cls": "R0",
        "pk_r_val": 0.1,
        "pk_g_cls": "G0",
        "pk_g_val": 0.0,
        "pk_xray_flux": 0.0,
        "pk_kp_index": 0.0,
        "av_wnd_mph": 0.0,
        "is_rain_day": False
    }
    database["data_records"].append(today_record)

# 5. Check if the current UV broke the daily record!
if real_uv > today_record.get("pk_uv_val", 0.0):
    print(f"🤖 SKY ROBOT: New UV Peak! {real_uv} is higher than the old peak of {today_record.get('pk_uv_val', 0.0)}")
    today_record["pk_uv_val"] = real_uv
else:
    print(f"🤖 SKY ROBOT: UV Peak remains at {today_record.get('pk_uv_val', 0.0)}")

# 5b. Check if the current X-ray flux broke the daily record!
if real_flux > today_record.get("pk_xray_flux", 0.0):
    print(f"🤖 SKY ROBOT: New Solar Flare Peak! {real_flare_str} broke the old record.")
    today_record["pk_xray_flux"] = real_flux
    today_record["pk_flr_cls"] = real_flare_str
    today_record["pk_r_cls"] = r_cls
    today_record["pk_r_val"] = round(r_val, 1)
else:
    print(f"🤖 SKY ROBOT: Solar Flare Peak remains at {today_record.get('pk_flr_cls', 'Unknown')}")

# 5c. Check if the current Kp index broke the daily record!
if real_kp > today_record.get("pk_kp_index", 0.0):
    print(f"🤖 SKY ROBOT: New Geomagnetic Peak! {g_cls} ({real_kp:.1f} Kp) broke the old record.")
    today_record["pk_kp_index"] = real_kp
    today_record["pk_g_cls"] = g_cls
    today_record["pk_g_val"] = round(real_kp, 1)
else:
    print(f"🤖 SKY ROBOT: Geomagnetic Peak remains at {today_record.get('pk_g_cls', 'G0')} ({today_record.get('pk_kp_index', 0.0):.1f} Kp)")

# 6. Update the system timestamp and save it perfectly formatted for Earth
database["sys_last_upd"] = get_central_now().strftime("%Y-%m-%d %I:%M %p")
with open(db_path, "w") as file:
    json.dump(database, file, indent=3)

# 7. Passively create a daily backup and clean up files older than 30 days
backup_dir = os.path.join(os.path.dirname(db_path), "backup-json")
os.makedirs(backup_dir, exist_ok=True)
backup_path = os.path.join(backup_dir, f"db_{today_str}.json")

with open(backup_path, "w") as b_file:
    json.dump(database, b_file, indent=3)

thirty_days_ago = get_central_now() - timedelta(days=30)
for filename in os.listdir(backup_dir):
    if filename.startswith("db_") and filename.endswith(".json"):
        date_str = filename.replace("db_", "").replace(".json", "")
        try:
            file_date = datetime.strptime(date_str, "%Y-%m-%d")
            if file_date.date() < thirty_days_ago.date():
                os.remove(os.path.join(backup_dir, filename))
                print(f"🤖 SKY ROBOT: Erased old backup {filename}")
        except ValueError:
            pass

print("🤖 SKY ROBOT: I have updated db.json and created a daily backup. Going back to sleep!")
