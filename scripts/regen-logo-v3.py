"""
v2.5.23 logo 资产批量重生成
输入: public/favicon.png (256x256, 来自 WorkBuddy 新设计)
输出: 3 张新图 + 1 张删除
- public/images/favicon.png  (192x192, manifest 192/shortcut 用)
- public/images/logo-512.png  (512x512, manifest 512 用)
- public/images/og-image.png  (1200x630, og:image 分享卡)
删除:
- public/og-image.png         (重复 47KB, index.html 不再引用)
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "/Users/wuleiyuan/WorkBuddy/sports-fair"
SRC = f"{ROOT}/public/favicon.png"
OUT_FAV = f"{ROOT}/public/images/favicon.png"
OUT_512 = f"{ROOT}/public/images/logo-512.png"
OUT_OG = f"{ROOT}/public/images/og-image.png"
DEL = f"{ROOT}/public/og-image.png"

# 读取源图 (256x256 RGBA)
src = Image.open(SRC).convert("RGBA")
print(f"[OK] source: {SRC}  size={src.size}  mode={src.mode}")

# 1) /images/favicon.png 192x192 (用于 manifest 192 + shortcuts + Header)
fav = src.resize((192, 192), Image.LANCZOS)
fav.save(OUT_FAV, "PNG", optimize=True)
print(f"[OK] {OUT_FAV}  size={fav.size}  bytes={os.path.getsize(OUT_FAV)}")

# 2) /images/logo-512.png 512x512
logo512 = src.resize((512, 512), Image.LANCZOS)
logo512.save(OUT_512, "PNG", optimize=True)
print(f"[OK] {OUT_512}  size={logo512.size}  bytes={os.path.getsize(OUT_512)}")

# 3) /images/og-image.png 1200x630 — 社交分享卡
#    设计: Apple 浅灰背景 + logo 居左 + 标题居中右
OG_W, OG_H = 1200, 630
og = Image.new("RGB", (OG_W, OG_H), (245, 245, 247))  # Apple #f5f5f7

# logo 缩放到 360x360 放左侧居中
logo_big = src.resize((360, 360), Image.LANCZOS)
# 把 RGBA 合成到 RGB 背景
og.paste(logo_big, (120, (OG_H - 360) // 2), logo_big)

# 文字 — Hiragino Sans GB (PingFang 在 dsh sandbox 不可用, Hiragino 是 macOS 内置)
FONT_REG = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_BOLD = "/System/Library/Fonts/Hiragino Sans GB.ttc"
try:
    f_title = ImageFont.truetype(FONT_BOLD, 96)      # 主标 "运动集市"
    f_sub = ImageFont.truetype(FONT_REG, 48)         # 英文 "Sports Fair"
    f_tag = ImageFont.truetype(FONT_REG, 32)         # 副标 "你的每一次运动"
except Exception as e:
    print(f"[WARN] font load failed: {e}, fallback to default")
    f_title = f_sub = f_tag = ImageFont.load_default()

draw = ImageDraw.Draw(og)

# 文字块: 居中, x 起点 540
text_x = 540
# 主标
draw.text((text_x, 180), "运动集市", fill=(26, 26, 26), font=f_title)
# 英文
draw.text((text_x, 300), "Sports Fair", fill=(110, 110, 115), font=f_sub)
# 副标 (你的每一次运动)
draw.text((text_x, 400), "你的每一次运动", fill=(60, 60, 67), font=f_tag)
# 运动类型小字
draw.text(
    (text_x, 450),
    "跑 · 骑 · 游 · 跳 · 爬 · 徒步 · 球类 · 力量",
    fill=(142, 142, 147),
    font=ImageFont.truetype(FONT_REG, 28),
)

og.save(OUT_OG, "PNG", optimize=True, quality=92)
print(f"[OK] {OUT_OG}  size={og.size}  bytes={os.path.getsize(OUT_OG)}")

# 4) 删除 public/og-image.png (旧版未引用)
if os.path.exists(DEL):
    os.remove(DEL)
    print(f"[OK] deleted {DEL}")
else:
    print(f"[SKIP] {DEL} not found")

print("\n=== DONE ===")
