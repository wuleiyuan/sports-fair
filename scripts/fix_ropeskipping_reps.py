"""
只修复 RopeSkipping 的 reps（跳绳总跳次）
从 Apple Health export.xml 提取 StepCount → RopeSkipping.reps
只改 activities.json，不动其他运动
"""
import datetime as dt
import json
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

XML_PATH = PROJECT_ROOT / "export.xml"
JSON_PATH = PROJECT_ROOT / "src/static/activities.json"

XML_TYPE_MAP = {
    "HKWorkoutActivityTypeJumpRope": "RopeSkipping",
    "HKWorkoutActivityTypeRopeSkipping": "RopeSkipping",
}


def parse_iso(s: str) -> dt.datetime | None:
    for fmt in [
        "%Y-%m-%d %H:%M:%S %z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
    ]:
        try:
            return dt.datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return None


def main():
    if not XML_PATH.exists():
        print(f"❌ 找不到 {XML_PATH}，请把 export.xml 放到项目根目录")
        return 1

    if not JSON_PATH.exists():
        print(f"❌ 找不到 {JSON_PATH}")
        return 1

    print(f"📂 扫描 {XML_PATH} 收集 RopeSkipping workout ...")

    # Pass 1: 收集所有 RopeSkipping workout
    workouts: list[dict] = []
    for event, elem in ET.iterparse(str(XML_PATH), events=("end",)):
        if elem.tag == "Workout":
            attrs = elem.attrib
            activity_type = attrs.get("workoutActivityType", "")
            if activity_type in XML_TYPE_MAP:
                start_dt = parse_iso(attrs.get("startDate", ""))
                end_dt = parse_iso(attrs.get("endDate", ""))
                if start_dt and end_dt:
                    # 去掉时区信息，和 activities.json 的 offset-naive 匹配
                    if start_dt.tzinfo is not None:
                        start_dt = start_dt.replace(tzinfo=None)
                    if end_dt.tzinfo is not None:
                        end_dt = end_dt.replace(tzinfo=None)
                    workouts.append({
                        "start_dt": start_dt,
                        "end_dt": end_dt,
                        "reps": 0,
                    })
            elem.clear()

    print(f"📊 找到 {len(workouts)} 个 RopeSkipping workout")

    if not workouts:
        print("❌ 没有找到跳绳记录")
        return 1

    # Pass 2: 聚合 StepCount
    matched = 0
    for event, elem in ET.iterparse(str(XML_PATH), events=("end",)):
        if elem.tag == "Record":
            rec_type = elem.attrib.get("type", "")
            if rec_type != "HKQuantityTypeIdentifierStepCount":
                elem.clear()
                continue
            rec_start = parse_iso(elem.attrib.get("startDate", ""))
            rec_end = parse_iso(elem.attrib.get("endDate", ""))
            value = float(elem.attrib.get("value", "0") or 0)
            if not rec_start or value <= 0:
                elem.clear()
                continue
            for w in workouts:
                if w["start_dt"] <= rec_start.replace(tzinfo=None) and rec_end.replace(tzinfo=None) <= w["end_dt"]:
                    w["reps"] += int(value)
                    matched += 1
                    break
            elem.clear()

    print(f"📊 匹配到 {matched} 个 StepCount Record → RopeSkipping 跳绳次数")

    # 读取现有 activities.json
    with open(JSON_PATH, "r") as f:
        activities = json.load(f)

    updated = 0
    for act in activities:
        if act.get("type") != "RopeSkipping":
            continue
        # 先读回 start_date_local 做时间窗口匹配
        act_start = parse_iso(act.get("start_date_local", ""))
        if not act_start:
            continue

        # 估算运动时长（moving_time 格式：1970-01-01 HH:MM:SS.microseconds）
        moving_time_str = act.get("moving_time", "")
        try:
            parts = moving_time_str.split(" ")[-1].split(":")
            if len(parts) == 3:
                h, m, s = parts
                secs = int(h) * 3600 + int(m) * 60 + int(float(s))
            else:
                continue
        except (ValueError, IndexError):
            continue

        act_end = act_start + dt.timedelta(seconds=secs)

        # 找匹配的 XML workout（时间窗口覆盖 act 的 90% 以上）
        for w in workouts:
            overlap_start = max(act_start, w["start_dt"])
            overlap_end = min(act_end, w["end_dt"])
            overlap_secs = (overlap_end - overlap_start).total_seconds()
            if overlap_secs <= 0:
                continue
            # 重叠度
            act_coverage = overlap_secs / secs
            if act_coverage >= 0.9 and w["reps"] > 0:
                # 只更新 reps
                old_reps = act.get("reps", 0)
                act["reps"] = w["reps"]
                if old_reps != w["reps"]:
                    updated += 1
                    w["reps"] = -1  # 避免重复匹配
                break

    print(f"🔄 更新了 {updated} 条 RopeSkipping 的 reps")

    if updated > 0:
        with open(JSON_PATH, "w") as f:
            json.dump(activities, f, ensure_ascii=False, indent=2)
        print(f"✅ 已写回 {JSON_PATH}")

        # 同时更新 data.db
        from run_page.config import SQL_FILE
        db_path = PROJECT_ROOT / SQL_FILE
        if db_path.exists():
            conn = sqlite3.connect(str(db_path))
            cur = conn.cursor()
            db_updated = 0
            for act in activities:
                if act.get("type") == "RopeSkipping" and act.get("reps"):
                    cur.execute(
                        "UPDATE activities SET reps = ? WHERE run_id = ?",
                        (act["reps"], act.get("run_id")),
                    )
                    db_updated += cur.rowcount
            conn.commit()
            conn.close()
            print(f"✅ 已更新 data.db ({db_updated} 条)")
    else:
        print("⚠️ 没有需要更新的数据（可能已有正确的 reps）")

    return 0


if __name__ == "__main__":
    exit(main())
