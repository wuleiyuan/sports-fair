#!/usr/bin/env python3
"""
garmin_overrides.py — 从佳明 Connect 导出的 CSV 提取元数据

为某次活动生成 .meta.json,让 hiking_sync.py 读同名 .gpx + .meta.json
时用 CSV 元数据覆盖 GPX 算出来的字段(距离/海拔/心率/时间)。

输出格式:
{
  "garmin_csv_row": {
    "活动类型": "登山",
    "日期": "2026-07-24 11:02:00",
    "距离_km": 10.36,
    "时间_hms": "05:59:46",
    "时间_sec": 21586,
    "平均心率": 131,
    "最大心率": 184,
    "累计爬升_m": 952,
    "累计下降_m": 955,
    "最低海拔_m": 623,
    "最高海拔_m": 1497,
    "TSS": 0.0
  }
}

用法:
    python scripts/garmin_overrides.py <garmin_csv> <gpx_basename>
    # 例: python scripts/garmin_overrides.py ~/Downloads/Activities.csv route_2026-07-24_4.43pm_2bulu
    # 会在 HIKING_GPXS/ 旁边生成同名 .meta.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

CN_TZ_OFFSET = 8  # 佳明 CSV 里的日期是 UTC,转北京时间 +8h
DEFAULT_HIKING_GPXS = Path("/Users/wuleiyuan/WorkBuddy/sports-fair/HIKING_GPXS")


def parse_hms(s: str) -> int:
    """'H:MM:SS' / 'MM:SS' → 秒"""
    if not s or s == "--":
        return 0
    parts = s.split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return 0


def parse_num(s: str, default: float = 0.0) -> float:
    """'1,833' / '10.36' / '--' → float"""
    if not s or s == "--":
        return default
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return default


def parse_date(s: str) -> str:
    """佳明 CSV '2026-07-24 11:02:00' (已经是本地时间,原样返回)

    注:佳明 Connect 导出的 CSV 时间是设备当地时区(不是 UTC)。
    Apple GPX 时间是 UTC,转北京时间 +8h。
    """
    if not s:
        return ""
    try:
        datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
        return s  # 原样返回,不加时区转换
    except ValueError:
        return s


def find_row_by_date(csv_path: Path, target_date: str) -> dict | None:
    """在 CSV 里找日期匹配的行(YYYY-MM-DD)"""
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d = row.get("日期", "").split(" ")[0]
            if d == target_date:
                return row
    return None


def build_meta(row: dict) -> dict:
    """从佳明 CSV row 构造 meta.json"""
    dist_km = parse_num(row.get("距离"))
    return {
        "source": "garmin_csv",
        "garmin_activity_type": row.get("活动类型"),
        "start_date_local": parse_date(row.get("日期", "")),  # 北京时间
        "start_date_local_raw": row.get("日期", ""),  # 佳明 UTC 原值
        "distance_km": dist_km,
        "moving_time": row.get("时间", ""),  # "H:MM:SS"
        "moving_time_sec": parse_hms(row.get("时间")),
        "avg_heartrate": int(parse_num(row.get("平均心率"))) or None,
        "max_heartrate": int(parse_num(row.get("最大心率"))) or None,
        "avg_speed_kmh": parse_num(row.get("平均速度")),
        "max_speed_kmh": parse_num(row.get("最大速度")),
        "elevation_gain": int(parse_num(row.get("累计爬升"))) or None,
        "elevation_loss": int(parse_num(row.get("累计下降"))) or None,
        "min_elevation": int(parse_num(row.get("最低海拔"))) or None,
        "max_elevation": int(parse_num(row.get("最高海拔"))) or None,
        "calories": int(parse_num(row.get("热量消耗"))) or None,
        "tss": parse_num(row.get("Training Stress Score®")),
        "laps": int(parse_num(row.get("圈数"))) or None,
        "title": row.get("标题", "").strip('"'),
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="garmin_overrides.py",
        description="从佳明 CSV 提取活动元数据,生成 .meta.json 让 hiking_sync.py 覆盖",
    )
    p.add_argument("csv", type=Path, help="佳明 Connect 导出的 Activities.csv")
    p.add_argument(
        "gpx_basename",
        help="HIKING_GPXS/ 里的 GPX 文件 basename (不带 .gpx 后缀)",
    )
    p.add_argument(
        "--date", required=True,
        help="目标日期 YYYY-MM-DD (CSV 里的日期列)",
    )
    p.add_argument(
        "--out-dir", type=Path, default=DEFAULT_HIKING_GPXS,
        help=f"输出 .meta.json 目录。默认 {DEFAULT_HIKING_GPXS}",
    )
    args = p.parse_args(argv)

    if not args.csv.exists():
        print(f"❌ CSV 不存在: {args.csv}", file=sys.stderr)
        return 1

    row = find_row_by_date(args.csv, args.date)
    if not row:
        print(f"❌ CSV 里没找到 {args.date} 的行", file=sys.stderr)
        return 1

    meta = build_meta(row)
    out_path = args.out_dir / f"{args.gpx_basename}.meta.json"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"✅ 写入: {out_path}")
    print()
    print("关键数据:")
    for k in ("source", "garmin_activity_type", "start_date_local",
             "distance_km", "moving_time", "moving_time_sec",
             "avg_heartrate", "elevation_gain", "max_elevation"):
        print(f"  {k:25s} = {meta.get(k)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())