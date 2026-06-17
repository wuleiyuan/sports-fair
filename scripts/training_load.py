#!/usr/bin/env python3
"""
training_load.json — v2.2.8

从 activities.json + health_stats.json 提炼训练负荷指标，供前端"训练看板"使用。

输出字段:
  - acwr: 7/28 急慢性训练负荷比 (Gabbett 公式)
  - hr_zones: 5 区心率分布 (Karvonen HRR 公式)
  - cadence: 步频分析 (v2.2.8 = null, 需先在 sync 源里加字段)
  - data_window: 数据窗口

设计原则:
  - HRmax = health_stats.top_stats.hr.max_ever (用户实测, 不用 220-age 公式)
  - HRrest = health_stats.top_stats.rhr.median (用户实测中位, 更稳)
  - 7d acute = 最近 7 天 TRIMP 总和
  - 28d chronic = 最近 28 天日均 TRIMP × 7
  - 阈值: 0.8-1.3 sweet spot, > 1.5 高危
  - 纯 stdlib, 无外部依赖

用法:
  python3 scripts/training_load.py
  # 写 src/static/training_load.json

历史:
  - 2026-06-17 v2.2.8: 初版
    - ACWR 7/28 (Gabbett)
    - 5 区心率分布 (Karvonen)
    - cadence 字段占位 (等 v2.2.9 在 sync 源里加字段)
"""
import json
import math
import os
import sys
from collections import Counter
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACTIVITIES_PATH = os.path.join(ROOT, "src", "static", "activities.json")
HEALTH_STATS_PATH = os.path.join(ROOT, "src", "static", "health_stats.json")
OUTPUT_PATH = os.path.join(ROOT, "src", "static", "training_load.json")

# ACWR 阈值 (Gabbett 1998 + 后续验证)
ACWR_UNDER = 0.8
ACWR_SWEET_LOW = 0.8
ACWR_SWEET_HIGH = 1.3
ACWR_CAUTION = 1.5

# Karvonen 5 区 (HRR 百分比)
# Z1: < 60% (recovery)
# Z2: 60-70% (aerobic base / 燃脂)
# Z3: 70-80% (aerobic)
# Z4: 80-90% (threshold)
# Z5: 90-100%+ (anaerobic)
ZONE_BOUNDS = [
    (1, 0.0, 0.6),
    (2, 0.6, 0.7),
    (3, 0.7, 0.8),
    (4, 0.8, 0.9),
    (5, 0.9, float("inf")),
]

# 7d / 28d 窗口
ACUTE_DAYS = 7
CHRONIC_DAYS = 28


def parse_iso_datetime(s):
    """解析 '1970-01-01 01:13:03' / '2026-06-09 08:30:55' 格式"""
    if not s:
        return None
    s = str(s).split(".")[0]
    try:
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def parse_local_date(s):
    """start_date_local 取日期部分"""
    dt = parse_iso_datetime(s)
    return dt.date() if dt else None


def parse_duration_minutes(s):
    """'1970-01-01 01:13:03' → 73.05 分钟 (datetime 里的时间部分)"""
    if not s or " " not in str(s):
        return None
    parts = str(s).split(" ", 1)
    if len(parts) < 2:
        return None
    time_part = parts[1].split(".")[0]
    try:
        h, m, sec = time_part.split(":")
        return int(h) * 60 + int(m) + int(sec) / 60
    except (ValueError, IndexError):
        return None


def load_activities():
    if not os.path.exists(ACTIVITIES_PATH):
        print(f"[training_load] missing: {ACTIVITIES_PATH}", file=sys.stderr)
        return []
    with open(ACTIVITIES_PATH) as f:
        return json.load(f)


def load_health_stats():
    if not os.path.exists(HEALTH_STATS_PATH):
        return {}
    with open(HEALTH_STATS_PATH) as f:
        return json.load(f)


def compute_trimp(hr_avg, duration_min, hr_rest, hr_max):
    """
    Banister TRIMP (1991) — HR-based training impulse.

    TRIMP = duration_min * ΔHR * 0.64 * exp(1.92 * y)
    where y = (HRavg - HRrest) / (HRmax - HRrest)  (HRR 比例 0-1)

    特点: 高强度训练权重指数级增长 (Z4-Z5 加成大)
    """
    if not hr_avg or not duration_min or not hr_rest or not hr_max:
        return 0
    if hr_max <= hr_rest:
        return 0
    hrr_ratio = (hr_avg - hr_rest) / (hr_max - hr_rest)
    if hrr_ratio <= 0:
        return 0
    delta_hr = hr_avg - hr_rest
    trimp = duration_min * delta_hr * 0.64 * math.exp(1.92 * hrr_ratio)
    return round(trimp, 2)


def classify_acwr(ratio):
    if ratio is None:
        return "unknown"
    if ratio < ACWR_UNDER:
        return "undertraining"
    if ratio < ACWR_SWEET_HIGH:
        return "sweet_spot"
    if ratio < ACWR_CAUTION:
        return "caution"
    return "high_risk"


def bucket_hr_zone(hr_avg, hr_rest, hr_max):
    """HRR 百分比 → 5 区编号 1-5"""
    if not hr_avg or not hr_rest or not hr_max or hr_max <= hr_rest:
        return None
    hrr = (hr_avg - hr_rest) / (hr_max - hr_rest)
    for zone, lo, hi in ZONE_BOUNDS:
        if lo <= hrr < hi:
            return zone
    return 5


def compute_acwr(activities, hr_rest, hr_max, today):
    """7d acute TRIMP / 28d chronic daily TRIMP × 7"""
    if today is None:
        return _empty_acwr()
    daily_trimp = Counter()
    cutoff_28 = today - timedelta(days=CHRONIC_DAYS)
    cutoff_7 = today - timedelta(days=ACUTE_DAYS)

    for a in activities:
        d = parse_local_date(a.get("start_date_local", ""))
        if not d or d > today or d < cutoff_28:
            continue
        hr_avg = a.get("average_heartrate")
        dur = parse_duration_minutes(a.get("elapsed_time", ""))
        if not hr_avg or not dur:
            continue
        t = compute_trimp(hr_avg, dur, hr_rest, hr_max)
        if t > 0:
            daily_trimp[d] += t

    # 7d acute
    acute = sum(daily_trimp[d] for d in daily_trimp if d >= cutoff_7)

    # 28d chronic: 日均 × 7 (匹配 Gabbett)
    chronic_28d_total = sum(daily_trimp.values())
    chronic_daily_avg = chronic_28d_total / CHRONIC_DAYS if CHRONIC_DAYS > 0 else 0
    chronic_28d = chronic_daily_avg * 7

    ratio = round(acute / chronic_28d, 2) if chronic_28d > 0 else None

    return {
        "acute_7d_trimp": round(acute, 1),
        "chronic_28d_trimp": round(chronic_28d, 1),
        "acute_days_with_data": sum(1 for d in daily_trimp if d >= cutoff_7),
        "chronic_days_with_data": len(daily_trimp),
        "ratio": ratio,
        "status": classify_acwr(ratio),
        "warning": (
            "ACWR > 1.5 属高危伤病风险, 建议安排 1-2 天全休或极轻松交叉训练"
            if ratio and ratio >= ACWR_CAUTION
            else (
                "ACWR < 0.8 训练不足, 可逐步加量"
                if ratio and ratio < ACWR_UNDER
                else None
            )
        ),
    }


def compute_hr_zones(activities, hr_rest, hr_max, window_days=90):
    """最近 N 天心率时间加权 5 区分布 (按 duration_min 加权)"""
    if not activities:
        return _empty_zones()
    valid_dates = [
        d for d in (parse_local_date(a.get("start_date_local", "")) for a in activities) if d is not None
    ]
    if not valid_dates:
        return _empty_zones()
    latest_dt = max(valid_dates)
    cutoff = latest_dt - timedelta(days=window_days)

    zone_minutes = {z: 0.0 for z in range(1, 6)}
    total_min = 0.0
    activities_with_hr = 0

    for a in activities:
        d = parse_local_date(a.get("start_date_local", ""))
        if not d or d < cutoff:
            continue
        hr_avg = a.get("average_heartrate")
        dur = parse_duration_minutes(a.get("elapsed_time", ""))
        if not hr_avg or not dur or dur <= 0:
            continue
        z = bucket_hr_zone(hr_avg, hr_rest, hr_max)
        if z is None:
            continue
        zone_minutes[z] += dur
        total_min += dur
        activities_with_hr += 1

    if total_min <= 0:
        return _empty_zones()

    pct = {z: round(zone_minutes[z] / total_min * 100, 1) for z in range(1, 6)}
    dominant = max(pct, key=pct.get)
    # Polarized: Z1+Z2 (aerobic base) — polarized training model 80/20
    polarized_pct = round(pct[1] + pct[2], 1)

    return {
        "z1_recovery": pct[1],
        "z2_aerobic_base": pct[2],
        "z3_aerobic": pct[3],
        "z4_threshold": pct[4],
        "z5_anaerobic": pct[5],
        "dominant_zone": f"z{dominant}",
        "z2_pct": pct[2],
        "polarized_pct": polarized_pct,
        "activities_with_hr": activities_with_hr,
        "window_days": window_days,
    }


def _empty_zones():
    return {
        "z1_recovery": 0,
        "z2_aerobic_base": 0,
        "z3_aerobic": 0,
        "z4_threshold": 0,
        "z5_anaerobic": 0,
        "dominant_zone": "n/a",
        "z2_pct": 0,
        "polarized_pct": 0,
        "activities_with_hr": 0,
        "window_days": 0,
    }


def _empty_acwr():
    return {
        "acute_7d_trimp": 0,
        "chronic_28d_trimp": 0,
        "acute_days_with_data": 0,
        "chronic_days_with_data": 0,
        "ratio": None,
        "status": "unknown",
        "warning": None,
    }


def compute_cadence(activities):
    """步频分析 — v2.2.8 占位"""
    return None


def main():
    activities = load_activities()
    health_stats = load_health_stats()

    if not activities:
        print("[training_load] no activities, skip", file=sys.stderr)
        return 1

    # 提取用户实测的 HRmax / HRrest
    hr_max = (health_stats.get("top_stats", {}).get("hr", {}) or {}).get("max_ever")
    hr_rest = (health_stats.get("top_stats", {}).get("rhr", {}) or {}).get("median")
    if not hr_max or not hr_rest:
        print(
            f"[training_load] missing hr_max={hr_max} or hr_rest={hr_rest} from health_stats.json",
            file=sys.stderr,
        )
        return 1

    # 用 activities 最新日期做 today (避免 timezone 漂移)
    valid_dates = [
        d for d in (parse_local_date(a.get("start_date_local", "")) for a in activities) if d is not None
    ]
    if not valid_dates:
        print("[training_load] no valid dates in activities", file=sys.stderr)
        return 1
    today = max(valid_dates)

    acwr = compute_acwr(activities, hr_rest, hr_max, today)
    hr_zones = compute_hr_zones(activities, hr_rest, hr_max, window_days=90)
    cadence = compute_cadence(activities)

    output = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "config": {
            "hr_max": hr_max,
            "hr_rest": hr_rest,
            "method_hr_zones": "Karvonen HRR (5 区)",
            "method_load": "Banister TRIMP (1991)",
            "method_acwr": "Gabbett 7d/28d (1998)",
            "thresholds": {
                "acwr_under": ACWR_UNDER,
                "acwr_sweet_spot": [ACWR_SWEET_LOW, ACWR_SWEET_HIGH],
                "acwr_caution": ACWR_CAUTION,
            },
        },
        "acwr": acwr,
        "hr_zones": hr_zones,
        "cadence": cadence,
        "cadence_note": (
            "v2.2.8 占位: activities.json 无 cadence 字段. "
            "v2.2.9+ 需在 sync 源 (keep_sync / apple_health / gpx_sync) 加 cadence 字段后才能分析. "
            "目标: 平均步频 175-180 spm, 长期 < 170 需注意."
        ),
        "data_window": {
            "earliest": min(
                (d.isoformat() for d in valid_dates),
                default=None,
            ),
            "latest": today.isoformat(),
            "total_activities": len(activities),
        },
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[training_load] ✅ wrote {OUTPUT_PATH}")
    print(f"  ACWR: {acwr['ratio']} ({acwr['status']})")
    print(f"  7d acute: {acwr['acute_7d_trimp']} TRIMP")
    print(f"  28d chronic: {acwr['chronic_28d_trimp']} TRIMP")
    print(f"  HR zones: dominant={hr_zones['dominant_zone']}, z2={hr_zones['z2_pct']}%, polarized={hr_zones['polarized_pct']}%")
    print(f"  Cadence: not available (v2.2.8 placeholder)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
