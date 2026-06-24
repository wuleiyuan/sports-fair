"""
Fix corrupted moving_time for fast-outlier Run activities.
These entries have average_speed (km/h) which is reliable, but moving_time is corrupt.
Recover correct moving_time from distance / average_speed.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "src/static/activities.json"

def seconds_to_hms(sec: int) -> str:
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def main():
    with open(JSON_PATH) as f:
        activities = json.load(f)

    fixed = 0
    for act in activities:
        anomaly = act.get("anomaly")
        if not anomaly or anomaly.get("type") != "pace":
            continue
        if "threshold" not in anomaly.get("detail", ""):
            continue  # only fast outliers, not 3σ slow

        avg_speed = act.get("average_speed")
        dist_m = act.get("distance", 0)
        if not avg_speed or avg_speed <= 0 or dist_m <= 0:
            continue  # can't fix without avg_speed

        dist_km = dist_m / 1000.0
        correct_sec = int(dist_km / avg_speed * 3600)
        if correct_sec <= 60:
            continue  # sanity: at least 1 minute

        old_mt = act.get("moving_time", "")
        new_mt = seconds_to_hms(correct_sec)
        act["moving_time"] = new_mt
        del act["anomaly"]  # remove flag — data is fixed

        fixed += 1
        print(f"  Fixed: {act['start_date_local'][:16]}  {old_mt:>8s} → {new_mt:>8s}  ({dist_km:.1f}km @ {avg_speed:.1f}km/h)")

    with open(JSON_PATH, "w") as f:
        json.dump(activities, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Fixed {fixed} activities (recovered moving_time from average_speed)")
    print(f"   Remaining anomaly entries: {sum(1 for a in activities if a.get('anomaly'))} (3σ slow outliers)")


if __name__ == "__main__":
    main()
