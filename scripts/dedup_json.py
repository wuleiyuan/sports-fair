#!/usr/bin/env python3
"""Deduplicate activities.json by date+elapsed_time, keep longer distance.

Run after Keep sync, before training load computation.
"""
import json
import sys
from collections import defaultdict

JSON_PATH = 'src/static/activities.json'

def main():
    with open(JSON_PATH) as f:
        activities = json.load(f)

    if not activities:
        print("activities.json is empty, nothing to dedup")
        return

    before = len(activities)

    # Group by date + moving_time
    groups = defaultdict(list)
    for i, a in enumerate(activities):
        key = (a.get('start_date', '')[:10], str(a.get('moving_time', '')))
        groups[key].append(i)

    # For each group, keep only the one with max distance
    remove_indices = set()
    for key, indices in groups.items():
        if len(indices) <= 1:
            continue
        # Keep the one with largest distance
        best = max(indices, key=lambda i: activities[i].get('distance', 0) or 0)
        for i in indices:
            if i != best:
                remove_indices.add(i)

    if not remove_indices:
        print(f"No duplicates found ({before} entries)")
        return

    # Remove from end to start to keep indices valid
    activities = [a for i, a in enumerate(activities) if i not in remove_indices]
    after = len(activities)

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(activities, f, indent=0, ensure_ascii=False)

    print(f"Removed {len(remove_indices)} duplicate(s): {before} → {after} entries")
    for i in sorted(remove_indices):
        a = activities[i] if i < after else None
        # Can't print removed entries easily after rebuild, so print summary
    print("Dedup complete.")


if __name__ == '__main__':
    main()
