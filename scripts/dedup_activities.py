#!/usr/bin/env python3
"""Deduplicate activities: same date + same duration, keep the longer distance.

Run: python3 scripts/dedup_activities.py
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'run_page', 'data.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Find duplicates: same start_date (date only) + same elapsed_time
    cur.execute("""
        SELECT date(a.start_date) as dt,
               a.elapsed_time,
               COUNT(*) as cnt,
               GROUP_CONCAT(a.run_id) as ids,
               GROUP_CONCAT(ROUND(a.distance/1000,2)) as kms,
               GROUP_CONCAT(a.name) as names,
               GROUP_CONCAT(a.type) as types
        FROM activities a
        GROUP BY date(a.start_date), a.elapsed_time
        HAVING cnt > 1
        ORDER BY dt
    """)
    duplicates = cur.fetchall()

    if not duplicates:
        print("No duplicates found.")
        return

    total_removed = 0
    for dup in duplicates:
        ids = [int(x) for x in dup['ids'].split(',')]
        kms = [float(x) for x in dup['kms'].split(',')]

        # Find the id with max distance
        max_km = max(kms)
        keep_id = ids[kms.index(max_km)]
        remove_ids = [i for i in ids if i != keep_id]

        print(f"  {dup['dt']}  elapsed={dup['elapsed_time']}")
        print(f"    keep  id={keep_id}  {max_km}km")
        for rid in remove_ids:
            cur.execute(
                "SELECT name, type, ROUND(distance/1000,2) as km FROM activities WHERE run_id=?",
                (rid,)
            )
            row = cur.fetchone()
            if row:
                print(f"    DEL   id={rid}  {row['name']}  ({row['type']})  {row['km']}km")
                cur.execute("DELETE FROM activities WHERE run_id=?", (rid,))
                total_removed += 1

    conn.commit()
    print(f"\nRemoved {total_removed} duplicate(s).")

    conn.close()


if __name__ == '__main__':
    main()
