#!/usr/bin/env python3
"""
hiking_sync.py — 把 hiking-tools 筛过的徒步 GPX 写进 sports-fair 的 SQLite 数据库

背景：
    keep_sync.py 从 Keep App 拉数据写 SQL，Generator.load() 从 SQL 读全部 → 写
    activities.json。如果直接改 activities.json 会被下次 sync 完全覆盖。
    正确做法：让 Hiking 数据也进 SQL。

    本脚本**独立实现**——不 import generator 包（重依赖 geopy/strava 等），
    直接读 SQLite schema，用 raw SQL 构造 Activity 行 upsert 到同一张表。
    字段定义对齐 generator/db.py 的 Activity 模型。

用法：
    python run_page/hiking_sync.py                       # 默认 hiking-tools/output/2bulu/hikes/
    python run_page/hiking_sync.py --hikes-dir /path     # 自定义
    python run_page/hiking_sync.py --db /path/to/data.db # 自定义 db
    python run_page/hiking_sync.py --dry-run             # 只显示，不写
    python run_page/hiking_sync.py --rewrite-json        # 写完 SQL 后重写 activities.json

依赖：gpxpy haversine polyline（标准库 sqlite3 hashlib）
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

import gpxpy
import polyline as poly_module
from haversine import Unit, haversine

# 默认路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_HIKES_DIR = Path("/Users/wuleiyuan/WorkBuddy/hiking-tools/output/2bulu/hikes")
DEFAULT_DB = PROJECT_ROOT / "run_page" / "data.db"
DEFAULT_JSON = PROJECT_ROOT / "src" / "static" / "activities.json"

# 北京时区
CN_TZ = dt.timezone(dt.timedelta(hours=8))

# 运动类型
SPORT_TYPE = "Hiking"
SPORT_SUBTYPE = "Hiking"

# 数据库表里实际存在的列（data.db.bootstrap 的 schema）
# 注意：generator/db.py 的 Activity ORM 模型有 `reps` 列，但 bootstrap 表里没有。
# 用 INSERT 列名白名单避免 schema 不匹配。
ACTIVITY_COLUMNS = (
    "run_id", "name", "distance", "moving_time", "elapsed_time",
    "type", "subtype", "start_date", "start_date_local", "location_country",
    "summary_polyline", "average_heartrate", "average_speed", "elevation_gain",
)


# ─────────────────────────────────────────────────────────────
# GPX 解析
# ─────────────────────────────────────────────────────────────

def parse_gpx(path: Path) -> dict | None:
    """解析 GPX，返回必要字段"""
    try:
        with path.open("r", encoding="utf-8") as f:
            gpx = gpxpy.parse(f)
    except Exception as e:
        print(f"  ⚠️  解析失败 {path.name}: {e}", file=sys.stderr)
        return None

    pts: list[tuple[float, float, float, dt.datetime]] = []
    name = ""
    for trk in gpx.tracks:
        if trk.name and not name:
            name = trk.name
        for seg in trk.segments:
            for p in seg.points:
                if p.time is None:
                    continue
                pts.append((p.latitude, p.longitude, p.elevation or 0.0, p.time))

    if len(pts) < 10:
        return None

    pts.sort(key=lambda x: x[3])
    start_utc = pts[0][3]
    end_utc = pts[-1][3]

    # 距离
    dist_m = 0.0
    for a, b in zip(pts, pts[1:]):
        dist_m += haversine(
            (a[0], a[1]), (b[0], b[1]), unit=Unit.METERS
        )

    # 时长
    dur_sec = (end_utc - start_utc).total_seconds()
    avg_speed_mps = (dist_m / dur_sec) if dur_sec > 0 else 0.0

    # 爬升（去噪）
    smooth_window = 5
    min_step = 3.0
    half = smooth_window // 2
    eles = [p[2] for p in pts]
    smoothed = []
    for i in range(len(eles)):
        lo = max(0, i - half)
        hi = min(len(eles), i + half + 1)
        smoothed.append(sum(eles[lo:hi]) / (hi - lo))
    gain = 0.0
    for a, b in zip(smoothed, smoothed[1:]):
        diff = b - a
        if abs(diff) >= min_step and diff > 0:
            gain += diff

    # polyline
    coords = [(p[0], p[1]) for p in pts]
    encoded = poly_module.encode(coords, precision=5)

    return {
        "name": name or path.stem,
        "start_utc": start_utc,
        "end_utc": end_utc,
        "distance_m": dist_m,
        "duration_s": dur_sec,
        "avg_speed_mps": avg_speed_mps,
        "elev_gain": gain,
        "summary_polyline": encoded,
        "point_count": len(pts),
    }


def make_run_id(path: Path) -> int:
    """用 file path + size + mtime 哈希成 64 位正整数 run_id，避免冲突"""
    s = f"{path.name}:{path.stat().st_size}:{int(path.stat().st_mtime)}"
    h = hashlib.sha256(s.encode()).digest()
    val = int.from_bytes(h[:8], "big") & 0x7FFFFFFFFFFFFFFF
    return val


# ─────────────────────────────────────────────────────────────
# Sync
# ─────────────────────────────────────────────────────────────

def sync_hikes(hikes_dir: Path, db_path: Path, dry_run: bool = False) -> int:
    """把 hikes/ 里的 GPX 写进 SQLite"""
    if not db_path.exists():
        print(f"❌ 数据库不存在: {db_path}", file=sys.stderr)
        print("   先跑 keep_sync.py 创建数据库", file=sys.stderr)
        return 0

    if not hikes_dir.is_dir():
        print(f"❌ hikes 目录不存在: {hikes_dir}", file=sys.stderr)
        return 0

    gpx_files = sorted(hikes_dir.glob("*.gpx"))
    if not gpx_files:
        print(f"❌ hikes 目录里没 GPX: {hikes_dir}", file=sys.stderr)
        return 0

    print(f"📂 hikes 目录: {hikes_dir}")
    print(f"📂 数据库: {db_path}")
    print(f"📊 GPX 文件: {len(gpx_files)} 个")
    print()

    if dry_run:
        for p in gpx_files:
            print(f"  [dry-run] would sync {p.name}")
        return 0

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    added = 0
    skipped = 0
    failed = 0

    insert_sql = (
        f"INSERT OR REPLACE INTO activities ({', '.join(ACTIVITY_COLUMNS)}) "
        f"VALUES ({', '.join('?' * len(ACTIVITY_COLUMNS))})"
    )

    for gpx_path in gpx_files:
        stats = parse_gpx(gpx_path)
        if stats is None:
            failed += 1
            continue

        run_id = make_run_id(gpx_path)
        start_local = stats["start_utc"].astimezone(CN_TZ)

        try:
            cur.execute("SELECT 1 FROM activities WHERE run_id = ?", (run_id,))
            if cur.fetchone():
                skipped += 1
                print(f"  = {gpx_path.name}  (已存在，run_id={run_id})")
                continue

            mt_sec = int(stats["duration_s"])
            values = (
                run_id,
                stats["name"],
                stats["distance_m"],
                mt_sec,
                mt_sec,
                SPORT_TYPE,
                SPORT_SUBTYPE,
                stats["start_utc"].strftime("%Y-%m-%d %H:%M:%S"),
                start_local.strftime("%Y-%m-%d %H:%M:%S"),
                "",
                stats["summary_polyline"],
                None,
                stats["avg_speed_mps"],
                stats["elev_gain"] if stats["elev_gain"] else None,
            )
            cur.execute(insert_sql, values)
            added += 1
            km = stats["distance_m"] / 1000
            h = stats["duration_s"] / 3600
            print(f"  + {gpx_path.name[:34]:34s}  {km:>6.2f} km  {h:>5.2f} h  run_id={run_id}")
        except Exception as e:
            failed += 1
            print(f"  ✗ {gpx_path.name}: {e}", file=sys.stderr)

    if added > 0:
        try:
            conn.commit()
        except Exception as e:
            print(f"❌ commit 失败: {e}", file=sys.stderr)
            conn.rollback()
            return 0

    conn.close()

    print()
    print(f"   新增: {added}")
    print(f"   跳过（已存在）: {skipped}")
    print(f"   失败: {failed}")
    print()
    print("💡 下一步：跑 --rewrite-json 从 SQL 重写 activities.json")
    print(f"   python run_page/hiking_sync.py --rewrite-json")
    return added


def rewrite_activities_json(db_path: Path, json_path: Path) -> int:
    """从 SQLite 数据库读取所有活动，写到 activities.json

    模仿 generator.load() 的逻辑（distance > 0.1 过滤等）。
    """
    if not db_path.exists():
        print(f"❌ 数据库不存在: {db_path}", file=sys.stderr)
        return 0

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.execute("SELECT * FROM activities ORDER BY start_date_local ASC")

    activities: list[dict] = []
    for row in cur:
        r = dict(row)
        for k in ("moving_time", "elapsed_time"):
            if r.get(k) is not None:
                r[k] = str(r[k])

        distance = r.get("distance")
        act_type = r.get("type")
        if distance is None or distance <= 0.1:
            if act_type not in ("StairStepper", "RopeSkipping"):
                continue

        activities.append(r)

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps(activities, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    conn.close()

    print(f"✅ 重写 {json_path}")
    print(f"   总活动: {len(activities)}")
    types = Counter(a.get("type", "?") for a in activities)
    print(f"   类型分布: {dict(types)}")
    return len(activities)


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="hiking_sync.py",
        description="把 hiking-tools 筛过的徒步 GPX 写进 sports-fair 的 SQLite 数据库",
    )
    p.add_argument(
        "--hikes-dir", type=Path, default=DEFAULT_HIKES_DIR,
        help=f"徒步 GPX 目录（filter_hikes.py 产物）。默认 {DEFAULT_HIKES_DIR}",
    )
    p.add_argument(
        "--db", type=Path, default=DEFAULT_DB,
        help=f"SQLite 数据库路径。默认 {DEFAULT_DB}",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="只显示会同步什么，不写数据库",
    )
    p.add_argument(
        "--rewrite-json", action="store_true",
        help="写完 SQL 后，从 SQLite 重写 activities.json（不做增量）",
    )
    p.add_argument(
        "--json-path", type=Path, default=DEFAULT_JSON,
        help=f"activities.json 路径。默认 {DEFAULT_JSON}",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    added = sync_hikes(args.hikes_dir, args.db, args.dry_run)
    if args.rewrite_json:
        print()
        print("━━━ 重写 activities.json ━━━")
        rewrite_activities_json(args.db, args.json_path)
    return added


if __name__ == "__main__":
    sys.exit(main())