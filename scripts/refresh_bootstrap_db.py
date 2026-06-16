#!/usr/bin/env python3
"""
2026-06-16 v2.2.7: 从本地完整 db 生成精简的 bootstrap db (仅 activities 表)

为啥需要 bootstrap db:
    run_page/data.db 在 .gitignore 里 → GitHub Actions checkout 后没 db
    → keep_sync 拉新数据后 generator.load() 只产 ~116 条
    → safety check 79% drop → push 阻拦 → sync 永远卡死

解法: 把"只含 activities 表"的精简版 commit 进仓库, workflow 每次 sync 前 cp 它到 data.db。
本地完整 db 含 records 表 (Apple Health 明细, ~136MB) 太大不能直接进仓库,
精简后 ~200KB 完全 OK。

用法:
    python3 scripts/refresh_bootstrap_db.py

每次本地导入新数据后 (apple_health_xml_sync, gpx_sync, keep_sync 等), 跑一次这个脚本,
然后 git add run_page/data.db.bootstrap && git commit && git push, GitHub Actions 下次跑就有完整历史。
"""
import os
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC_DB = REPO / "run_page" / "data.db"
DST_DB = REPO / "run_page" / "data.db.bootstrap"

MIN_ACTIVITIES = 500  # 安全闸: < 500 条直接拒绝, 防止覆盖


def main() -> int:
    if not SRC_DB.exists():
        print(f"❌ 源 db 不存在: {SRC_DB}", file=sys.stderr)
        return 1

    # 1. 验证源 db 有足够 activities
    with sqlite3.connect(SRC_DB) as c:
        try:
            count = c.execute("SELECT COUNT(*) FROM activities").fetchone()[0]
        except sqlite3.OperationalError as e:
            print(f"❌ 读 activities 失败: {e}", file=sys.stderr)
            return 1

    if count < MIN_ACTIVITIES:
        print(
            f"❌ 源 db 只有 {count} 条 activities (< {MIN_ACTIVITIES}), 拒绝生成 bootstrap "
            f"(防止覆盖远端的完整版本)",
            file=sys.stderr,
        )
        return 1

    src_size_mb = SRC_DB.stat().st_size / 1024 / 1024
    print(f"[refresh-bootstrap] 源 db: {SRC_DB.name} = {src_size_mb:.1f} MB / {count} activities")

    # 2. 拷贝到目标位置
    shutil.copy2(SRC_DB, DST_DB)
    print(f"[refresh-bootstrap] 拷贝到: {DST_DB}")

    # 3. drop records 表 + vacuum
    with sqlite3.connect(DST_DB) as c:
        c.execute("DROP TABLE IF EXISTS records")
        c.commit()

    # VACUUM 必须在事务外
    subprocess.run(
        ["sqlite3", str(DST_DB), "VACUUM;"],
        check=True,
        timeout=120,
    )

    # 4. 二次验证
    with sqlite3.connect(DST_DB) as c:
        final_count = c.execute("SELECT COUNT(*) FROM activities").fetchone()[0]
        types = c.execute(
            "SELECT type, COUNT(*) FROM activities GROUP BY type ORDER BY 2 DESC"
        ).fetchall()

    if final_count != count:
        print(
            f"❌ vacuum 后 activities 数 {final_count} ≠ 源 {count}, 中止",
            file=sys.stderr,
        )
        DST_DB.unlink()
        return 1

    dst_size_kb = DST_DB.stat().st_size / 1024
    print(f"[refresh-bootstrap] ✅ bootstrap db: {DST_DB.name} = {dst_size_kb:.1f} KB / {final_count} activities")
    print("[refresh-bootstrap] type 分布:")
    for typ, n in types:
        print(f"  {typ:20s}: {n}")

    print()
    print("[refresh-bootstrap] 下一步:")
    print(f"  git add {DST_DB.relative_to(REPO)}")
    print("  git commit -m 'chore(bootstrap): refresh data.db.bootstrap'")
    print("  git push origin master")
    return 0


if __name__ == "__main__":
    sys.exit(main())
