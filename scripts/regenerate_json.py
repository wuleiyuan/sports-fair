#!/usr/bin/env python3
"""Regenerate activities.json from current data.db with dedup.

Keeps the longer-distance record when same date + same elapsed_time exist.
"""
import json
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'run_page', 'data.db')
JSON_PATH = os.path.join(BASE_DIR, 'src', 'static', 'activities.json')

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT date(start_date) as dt, elapsed_time, COUNT(*) as cnt
        FROM activities
        GROUP BY date(start_date), elapsed_time
        HAVING cnt > 1
        ORDER BY dt
    """)
    dups = cur.fetchall()
    if dups:
        print(f"Found {len(dups)} duplicate group(s) — removing shorter entries...")
        for d in dups:
            cur.execute("""
                SELECT rowid, run_id, name, type, distance
                FROM activities
                WHERE date(start_date)=? AND elapsed_time=?
                ORDER BY distance DESC
            """, (d['dt'], d['elapsed_time']))
            rows = cur.fetchall()
            # Keep first (longest), delete rest
            for r in rows[1:]:
                cur.execute("DELETE FROM activities WHERE rowid=?", (r['rowid'],))
                print(f"  DEL id={r['run_id']}  {r['name']}  ({r['type']})  {r['distance']/1000:.2f}km")
        conn.commit()

    # Now load all activities for JSON
    cur.execute("SELECT * FROM activities ORDER BY start_date DESC")
    activities = [dict(row) for row in cur.fetchall()]
    conn.close()

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(activities, f, indent=0, ensure_ascii=False)

    # Count by type
    from collections import Counter
    types = Counter(a['type'] for a in activities)
    print(f"\nWritten to: {JSON_PATH}")
    print(f"Total: {len(activities)} activities")
    for t, c in types.most_common():
        print(f"  {t}: {c}")


if __name__ == '__main__':
    main()
