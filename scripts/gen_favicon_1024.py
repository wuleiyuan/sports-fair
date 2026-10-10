#!/usr/bin/env python3
"""
gen_favicon_1024.py — 从 src/static/icons/favicon.png (256x256) 上采样到 1024x1024
v2.5.26 — 补完"集市彩条"Logo A 的 1024x1024 主图

策略:
  - LANCZOS 高质量上采样 (Pillow 默认最佳算法)
  - 输出到 src/static/icons/favicon-1024.png (git tracked)
  - copy-icons.js 同步: favicon-1024.png → dist/images/favicon.png
    (替换原来的 192x192, 让 site-metadata 的 logo 升级到 1024)

用法:
  python3 scripts/gen_favicon_1024.py
"""
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "src" / "static" / "icons" / "favicon.png"
OUT = REPO / "src" / "static" / "icons" / "favicon-1024.png"


def main():
    if not SRC.exists():
        raise SystemExit(f"源文件不存在: {SRC}")
    img = Image.open(SRC)
    print(f"源: {SRC.name}  {img.size}  {img.mode}")
    # LANCZOS 上采样到 1024x1024
    big = img.resize((1024, 1024), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    big.save(OUT, "PNG", optimize=True)
    print(f"✓ {OUT.name}  1024x1024  ({OUT.stat().st_size} B)")


if __name__ == "__main__":
    main()
