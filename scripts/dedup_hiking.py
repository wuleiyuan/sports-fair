#!/usr/bin/env python3
"""同日徒步去重：一天只留一条，距离取最长，且**一个字段都不丢**。

背景
----
同一天常常有两条 Hiking 记录（来源不同）：
  - 早期从 Keep App 同步的：有距离 / 心率，但**没有 GPS 轨迹**、爬升为 0；
  - 从 Apple Watch GPX 生成的：有**完整轨迹和爬升**，但没有心率。
若简单"同一天取距离最长"，胜出的往往是没有轨迹的那条 → 轨迹 / 爬升就丢了。
所以这里做的是 **合并**：

规则
----
  1. 按日期（start_date_local 前 10 位）分组，同一天的 Hiking 只保留一条；
  2. 距离最长的那条做"基底"——它的 name / distance / moving_time /
     elapsed_time / start_* 优先；
  3. 基底里缺失或为 0 的字段，从同日其它条目里按"数据更全优先"的顺序补齐：
     summary_polyline（轨迹）、elevation_gain（爬升）、average_heartrate（心率）、
     average_speed、subtype。

用法
----
    python scripts/dedup_hiking.py            # 就地重写 src/static/activities.json
    python scripts/dedup_hiking.py --dry-run  # 只打印结果，不写文件
    python scripts/dedup_hiking.py --json-path /tmp/x.json
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON = PROJECT_ROOT / "src" / "static" / "activities.json"

SPORT = "Hiking"

# 需要"补齐"的字段（基底为空时，从同日其它条目取）
FILL_FIELDS = [
    "summary_polyline",
    "elevation_gain",
    "average_heartrate",
    "average_speed",
    "subtype",
]

# 时长字段：基底是坏值（空 / 0 / 1970 哨兵）时才补
TIME_FIELDS = ["moving_time", "elapsed_time"]


def _is_bad(value) -> bool:
    """判断字段是否算"空"——需要从别的条目补齐。

    注意：ORM 会把 timedelta 存成 `1970-01-01 HH:MM:SS` 的哨兵字符串，
    这不是坏值——它编码的就是真实时长（前端 convertMovingTime2Sec 也认这个格式）。
    只有哨兵里时间是 00:00:00 才算空。
    """
    if value is None:
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return value == 0
    if isinstance(value, str):
        s = value.strip()
        if s == "" or s == "0" or s == "0.0":
            return True
        if s.startswith("1970-01-01") or s.startswith("0001-01-01"):
            m = re.match(r"\d{4}-\d{2}-\d{2} (\d+):(\d+):(\d+)", s)
            if m:
                h, mi, sec = (int(g) for g in m.groups())
                return h == 0 and mi == 0 and sec == 0
            return True
    return False


def _distance(act) -> float:
    try:
        return float(act.get("distance") or 0)
    except (TypeError, ValueError):
        return 0.0


def _richness(act) -> int:
    """有多少个可补齐字段是有效的 —— 用来决定从谁那里补。"""
    return sum(1 for f in FILL_FIELDS if not _is_bad(act.get(f)))


def _day(act) -> str:
    for key in ("start_date_local", "start_date"):
        v = act.get(key)
        if isinstance(v, str) and len(v) >= 10:
            return v[:10]
    return "????-??-??"


def dedup(activities: list[dict], verbose: bool = True) -> tuple[list[dict], int]:
    """就地返回 (新列表, 移除条数)。"""
    groups: dict[str, list[int]] = defaultdict(list)
    for i, a in enumerate(activities):
        if a.get("type") == SPORT:
            groups[_day(a)].append(i)

    remove: set[int] = set()
    merged_count = 0

    for day, idxs in sorted(groups.items()):
        if len(idxs) <= 1:
            continue

        # 基底 = 距离最长
        base_i = max(idxs, key=lambda i: _distance(activities[i]))
        base = activities[base_i]

        # 其它条目按"数据更全"优先排序，用来补空
        others = sorted(
            (i for i in idxs if i != base_i),
            key=lambda i: _richness(activities[i]),
            reverse=True,
        )

        merged = dict(base)
        filled: list[str] = []

        for field in FILL_FIELDS + TIME_FIELDS:
            if not _is_bad(merged.get(field)):
                continue
            for j in others:
                candidate = activities[j].get(field)
                if not _is_bad(candidate):
                    merged[field] = candidate
                    filled.append(field)
                    break

        activities[base_i] = merged
        for i in idxs:
            if i != base_i:
                remove.add(i)

        merged_count += 1
        if verbose:
            kept = f"{_distance(merged) / 1000:.2f}km"
            src = base.get("name", "?")
            extra = f"  补齐: {', '.join(filled)}" if filled else "  (无需补齐)"
            print(f"  {day}  共 {len(idxs)} 条 → 保留「{src}」{kept}{extra}")

    new_list = [a for i, a in enumerate(activities) if i not in remove]
    return new_list, len(remove)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="同日徒步去重（保最长距离 + 不丢字段）")
    p.add_argument("--json-path", type=Path, default=DEFAULT_JSON)
    p.add_argument("--dry-run", action="store_true", help="只打印，不写文件")
    args = p.parse_args(argv)

    if not args.json_path.exists():
        print(f"❌ 找不到 {args.json_path}", file=sys.stderr)
        return 1

    activities = json.loads(args.json_path.read_text(encoding="utf-8"))
    before = len(activities)

    hiking_before = sum(1 for a in activities if a.get("type") == SPORT)
    print(f"📂 {args.json_path}")
    print(f"   活动总数 {before}｜徒步 {hiking_before} 条")
    print("   同日徒步合并：")

    activities, removed = dedup(activities)

    hiking_after = sum(1 for a in activities if a.get("type") == SPORT)
    if removed == 0:
        print("   （没有同日重复，无需处理）")

    print(
        f"\n   徒步 {hiking_before} → {hiking_after} 条"
        f"（移除 {removed} 条重复，字段已合并保留）"
    )
    print(f"   活动总数 {before} → {len(activities)}")

    if args.dry_run:
        print("\n[dry-run] 未写入文件")
        return 0

    args.json_path.write_text(
        json.dumps(activities, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"\n✅ 已重写 {args.json_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
