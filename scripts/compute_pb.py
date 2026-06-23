"""
Compute personal bests (PB) for standard running distances from activities.json
Output: src/static/pb.json
"""
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = PROJECT_ROOT / "src/static/activities.json"
PB_PATH = PROJECT_ROOT / "src/static/pb.json"

PB_DISTANCES = [
    (1.0, "1km"),
    (5.0, "5km"),
    (10.0, "10km"),
    (21.0975, "半马"),
    (42.195, "全马"),
]


def moving_time_to_seconds(mt_str: str) -> int | None:
    try:
        s = mt_str.split()[-1] if " " in str(mt_str) else str(mt_str)
        parts = s.split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(float(parts[2]))
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError, AttributeError):
        return None
    return None


def main():
    with open(JSON_PATH) as f:
        activities = json.load(f)

    pbs: dict[str, dict] = {}
    for act in activities:
        if act.get("type") != "Run":
            continue
        if act.get("anomaly"):
            continue
        d_km = act.get("distance", 0) / 1000.0
        mt_str = act.get("moving_time", "")
        mt_sec = moving_time_to_seconds(mt_str)
        if d_km <= 0 or not mt_sec or mt_sec <= 0:
            continue
        pace_s_per_km = mt_sec / d_km
        for target_km, label in PB_DISTANCES:
            ratio = d_km / target_km
            if not (0.95 <= ratio <= 1.05):
                continue
            # 配速合理性：< 3'30"/km（任何距离都太快，GPS 异常）or > 8'00"/km（误触发步行）
            if pace_s_per_km < 210 or pace_s_per_km > 480:
                continue
            key = str(target_km)
            if key not in pbs or mt_sec < pbs[key]["time_sec"]:
                pbs[key] = {
                    "label": label,
                    "time_sec": mt_sec,
                    "pace_s_per_km": round(pace_s_per_km, 1),
                    "date": act.get("start_date_local", ""),
                    "distance_km": round(d_km, 2),
                    "pace_str": f"{int(pace_s_per_km//60)}\'{int(pace_s_per_km%60):02d}\"/km",
                }

    # sort by distance
    result = [pbs[k] for k in sorted(pbs.keys(), key=float)]
    with open(PB_PATH, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ PB saved to {PB_PATH}")
    for r in result:
        mm = r["time_sec"] // 60
        ss = r["time_sec"] % 60
        pace_m = int(r["pace_s_per_km"] // 60)
        pace_s = int(r["pace_s_per_km"] % 60)
        print(f"  {r['label']:4s}  {mm}:{ss:02d}  ({pace_m}\'{pace_s:02d}\"/km)  {r['date'][:10]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
