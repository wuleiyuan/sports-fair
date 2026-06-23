"""
Backfill anomaly detection on existing activities.json
Combines 3σ slow-outlier detection + pace-sanity fast-outlier check.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "src/static/activities.json"

# Any Run pace faster than this (s/km) is flagged as corrupt data
FAST_PACE_THRESHOLD_S_KM = 270  # 4'30"/km


def moving_time_to_seconds(mt_str) -> int | None:
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


def get_run_metrics(activities):
    """Extract (idx, pace_s_km, distance_km) for valid Run activities."""
    result = []
    for idx, act in enumerate(activities):
        if act.get("type") != "Run":
            continue
        d_km = act.get("distance", 0) / 1000.0
        mt_sec = moving_time_to_seconds(act.get("moving_time"))
        if d_km > 0 and mt_sec and mt_sec > 60:
            pace = mt_sec / d_km
            if 60 < pace < 3600:
                result.append((idx, pace, d_km))
    return result


def main():
    with open(JSON_PATH) as f:
        activities = json.load(f)

    # Clear existing anomaly fields for Run
    for act in activities:
        if act.get("type") == "Run" and "anomaly" in act:
            del act["anomaly"]

    run_data = get_run_metrics(activities)

    # === Phase 1: Fast-pace sanity check (same threshold as PB filter) ===
    fast_anomalies = []
    for idx, pace, d_km in run_data:
        if pace < FAST_PACE_THRESHOLD_S_KM:
            fast_anomalies.append((idx, pace, d_km))

    for idx, pace, d_km in fast_anomalies:
        activities[idx]["anomaly"] = {
            "type": "pace",
            "detail": f"pace {pace/60:.1f}\"/km (faster than {FAST_PACE_THRESHOLD_S_KM//60}\'{FAST_PACE_THRESHOLD_S_KM%60:02d}\"/km threshold)"
        }

    # === Phase 2: 3σ slow-outlier detection (same as generator) ===
    indices = set(idx for idx, _, _ in run_data)
    # Remove fast-anomaly indices from 3σ pool
    fast_idx_set = {idx for idx, _, _ in fast_anomalies}
    indices -= fast_idx_set

    for _ in range(10):
        valid = [(idx, p) for idx, p, _ in run_data if idx in indices]
        if len(valid) < 3:
            break
        paces = [p for _, p in valid]
        mean = statistics.mean(paces)
        std = statistics.stdev(paces)
        lo, hi = mean - 3 * std, mean + 3 * std
        kept = {idx for idx, pace in valid if lo <= pace <= hi}
        n_removed = len(indices) - len(kept)
        indices = kept
        if n_removed == 0:
            break

    slow_anomaly_count = 0
    for idx, pace, _ in run_data:
        if idx not in indices and idx not in fast_idx_set:  # don't double-flag
            activities[idx]["anomaly"] = {
                "type": "pace",
                "detail": f"pace {pace/60:.1f}\"/km (3σ outlier vs mean={mean/60:.1f}\"/km)"
            }
            slow_anomaly_count += 1

    total = len(fast_anomalies) + slow_anomaly_count
    print(f"Fast outliers (pace<{FAST_PACE_THRESHOLD_S_KM//60}\'{FAST_PACE_THRESHOLD_S_KM%60:02d}\"/km): {len(fast_anomalies)}")
    print(f"3σ slow outliers:                         {slow_anomaly_count}")
    print(f"Total Run anomalies flagged:              {total}")

    with open(JSON_PATH, "w") as f:
        json.dump(activities, f, ensure_ascii=False, indent=2)

    print(f"✅ Updated {JSON_PATH}")


if __name__ == "__main__":
    main()
