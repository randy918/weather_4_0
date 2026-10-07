import json
import time
import os

print("🤖 SKY ROBOT: Waking up...")
time.sleep(1)

print("🤖 SKY ROBOT: Fetching 5-minute data from NOAA (Pretend)...")
time.sleep(1)

# Path to the Earth's database
db_path = "public/data/db.json"

# 1. Read the current database
with open(db_path, "r") as file:
    database = json.load(file)

print("🤖 SKY ROBOT: Whoa! NOAA just reported a massive X9.9 Flare!")
time.sleep(1)

# 2. Update the peak in the database
database["data_records"][0]["pk_flr_cls"] = "X9.9"

# 3. Save it perfectly formatted for Earth
with open(db_path, "w") as file:
    json.dump(database, file, indent=3)

print("🤖 SKY ROBOT: I have overwritten db.json with the new peak. Going back to sleep!")
