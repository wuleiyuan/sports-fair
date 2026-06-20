#!/usr/bin/env python3
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEALTH_PATH = os.path.join(ROOT, "src", "static", "health_stats.json")
OUTPUT_PATH = os.path.join(ROOT, "src", "static", "health_trends.json")

with open(HEALTH_PATH) as f:
    health = json.load(f)

daily = health.get("daily", {})
series = {"hr": [], "rhr": [], "hrv": [], "sleep": [], "steps": []}

for date in sorted(daily.keys()):
    day = daily[date]
    if "hr" in day and "mean" in day["hr"]:
        series["hr"].append({"date": date, "value": round(day["hr"]["mean"], 1)})
    if "rhr" in day and "mean" in day["rhr"]:
        series["rhr"].append({"date": date, "value": round(day["rhr"]["mean"], 1)})
    if "hrv" in day and "mean" in day["hrv"]:
        series["hrv"].append({"date": date, "value": round(day["hrv"]["mean"], 1)})
    if "sleep" in day and "total_hours" in day["sleep"]:
        series["sleep"].append({"date": date, "value": round(day["sleep"]["total_hours"], 2)})
    if "steps" in day and "total" in day["steps"]:
        series["steps"].append({"date": date, "value": day["steps"]["total"]})

output = {
    "generated_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    **series,
}

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

counts = {k: len(v) for k, v in series.items()}
print(f"[health_trends] wrote {OUTPUT_PATH}")
print(f"  series: {counts}")
sys.exit(0)
