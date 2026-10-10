#!/usr/bin/env python3
"""
compute_hiking_pb.py — 从 activities.json 计算徒步 PB，写到 src/static/hiking_pb.json

PB 三个指标：
  - 最长距离（单次徒步距离最长）
  - 最长时长（单次徒步时长最长）
  - 最快配速（单次徒步均速最快）

输出格式对齐 pb.json（跑步 PB）的结构，方便前端组件统一渲染。

用法：
    python scripts/compute_hiking_pb.py
    python scripts/compute_hiking_pb.py --activities src/static/activities.json \
                                          --output src/static/hiking_pb.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 默认路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ACTIVITIES = PROJECT_ROOT / "src" / "static" / "activities.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "src" / "static" / "hiking_pb.json"

# 同步时刻 hiking_sync.py 也要能跑：HIKING_GPXS/ 在 sports-fair repo 根目录
DEFAULT_HIKING_GPX_DIR = PROJECT_ROOT / "HIKING_GPXS"

CN_TZ = timedelta(hours=8)


# ─────────────────────────────────────────────────────────────
# 时间解析（对齐 src/utils/utils.ts 的 convertMovingTime2Sec）
# ─────────────────────────────────────────────────────────────

def parse_moving_time_to_seconds(s) -> int:
    """解析 moving_time 字段到秒数"""
    if s is None or s == "":
        return 0
    if isinstance(s, (int, float)):
        return int(s)
    if not isinstance(s, str):
        return 0

    # "1970-01-01 HH:MM:SS" 格式（Apple Watch）
    m = re.match(r"1970-01-01 (\d+):(\d+):(\d+)", s)
    if m:
        h, mn, sec = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return h * 3600 + mn * 60 + sec

    # 纯秒数（hiking_sync.py 早期版本会写成 str(整数)，例如 "22764"）
    # 不加这个分支，"22764".split(":") 只有 1 段 → 下面解包直接 ValueError
    if ":" not in s:
        try:
            return int(float(s))
        except ValueError:
            return 0

    # "X days, H:MM:SS" / "H:MM:SS" 格式（Keep）
    parts = s.split(", ")
    days = 0
    if len(parts) == 2:
        days = int(parts[0])
        time_str = parts[1]
    else:
        time_str = parts[0]
    h, mn, sec = (int(x) for x in time_str.split(":"))
    return ((days * 24 + h) * 60 + mn) * 60 + sec


def fmt_duration(seconds: int) -> str:
    """秒 → 'H:MM:SS' 格式"""
    h, rem = divmod(int(seconds), 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}"


# ─────────────────────────────────────────────────────────────
# PB 计算
# ─────────────────────────────────────────────────────────────

def compute_hiking_pb(activities_path: Path) -> list[dict]:
    """从 activities.json 算徒步 PB"""
    if not activities_path.exists():
        print(f"❌ 不存在 {activities_path}", file=sys.stderr)
        return []

    data = json.loads(activities_path.read_text(encoding="utf-8"))
    print(f"📂 总活动: {len(data)}")

    hikes = [a for a in data if a.get("type") == "Hiking"]
    print(f"📊 Hiking 活动: {len(hikes)}")
    if not hikes:
        return []

    # 提取统一字段
    records = []
    for a in hikes:
        dist_m = float(a.get("distance") or 0)
        duration_sec = parse_moving_time_to_seconds(a.get("moving_time"))
        elev_gain = float(a.get("elevation_gain") or 0) if a.get("elevation_gain") else 0.0
        speed_kmh = (dist_m / 1000) / (duration_sec / 3600) if duration_sec > 0 else 0

        # 起点日期（北京时间）
        start_local = a.get("start_date_local") or a.get("start_date") or ""

        records.append({
            "name": a.get("name", ""),
            "activity_id": a.get("run_id"),
            "date": start_local[:10],
            "distance_m": dist_m,
            "duration_sec": duration_sec,
            "elev_gain": elev_gain,
            "speed_kmh": speed_kmh,
        })

    # 三项 PB（按用户原话："最长时间、最长距离、最快配速"）
    pb_longest_dist = max(records, key=lambda r: r["distance_m"])
    pb_longest_dur = max(records, key=lambda r: r["duration_sec"])
    # 最快配速 = speed_kmh 最大，但 speed_kmh > 0 才有效
    # 实际上"最快"是配速最短 → min(sec/km)
    # 用 speed_kmh 倒数求 min(sec/km)
    pb_fastest = max(records, key=lambda r: r["speed_kmh"]) if any(r["speed_kmh"] > 0 for r in records) else None

    pbs = []

    # 1. 最长距离
    pbs.append({
        "label": "最长距离",
        "distance_km": round(pb_longest_dist["distance_m"] / 1000, 2),
        "moving_time": fmt_duration(pb_longest_dist["duration_sec"]),
        "pace_str": f"{pb_longest_dist['speed_kmh']:.2f} km/h",
        "date": pb_longest_dist["date"],
            "activity_id": pb_longest_dist["activity_id"],
            "activity_name": pb_longest_dist["name"],
            "elev_gain": round(pb_longest_dist["elev_gain"]),
        })

    # 2. 最长时长
    pbs.append({
        "label": "最长时长",
        "distance_km": round(pb_longest_dur["distance_m"] / 1000, 2),
        "moving_time": fmt_duration(pb_longest_dur["duration_sec"]),
        "pace_str": f"{pb_longest_dur['speed_kmh']:.2f} km/h",
        "date": pb_longest_dur["date"],
            "activity_id": pb_longest_dur["activity_id"],
            "activity_name": pb_longest_dur["name"],
            "elev_gain": round(pb_longest_dur["elev_gain"]),
        })

    # 3. 最快配速（速度最大）
    if pb_fastest:
        pbs.append({
            "label": "最快配速",
            "distance_km": round(pb_fastest["distance_m"] / 1000, 2),
            "moving_time": fmt_duration(pb_fastest["duration_sec"]),
            "pace_str": f"{pb_fastest['speed_kmh']:.2f} km/h",
            "date": pb_fastest["date"],
            "activity_id": pb_fastest["activity_id"],
            "activity_name": pb_fastest["name"],
            "elev_gain": round(pb_fastest["elev_gain"]),
        })

    return pbs


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="compute_hiking_pb.py",
        description="从 activities.json 计算徒步 PB（最长距离/最长时长/最快配速）",
    )
    p.add_argument(
        "--activities", type=Path, default=DEFAULT_ACTIVITIES,
        help=f"activities.json 路径。默认 {DEFAULT_ACTIVITIES}",
    )
    p.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT,
        help=f"输出 JSON 路径。默认 {DEFAULT_OUTPUT}",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    pbs = compute_hiking_pb(args.activities)
    if not pbs:
        print("❌ 没找到 Hiking 活动", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(pbs, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print()
    print(f"✅ 写入 {args.output}")
    print()
    for pb in pbs:
        print(
            f"   {pb['label']:6s}  "
            f"{pb['distance_km']:>6.2f} km  "
            f"{pb['moving_time']:>9s}  "
            f"{pb['pace_str']:>14s}  "
            f"{pb['date']}  "
            f"({pb['activity_name'][:30]})"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())