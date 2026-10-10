#!/usr/bin/env python3
"""
gen_favicon.py — 生成 sports-fair 网站 favicon + apple-touch-icon

设计:徒步路线风格
- 圆角橙色背景 (#f59e0b → #f97316 渐变,符合网站 Run 主色)
- 底部山形剪影 (绿色 #16a34a,符合 Hiking 色)
- 蜿蜒白色轨迹线 (从左下到右上)
- 起点: 红色圆点 (运动开始)
- 终点: 白色五角星 (完成/成就)

输出:
- public/favicon.png (256x256)
- public/apple-touch-icon.png (180x180)
"""
from pathlib import Path
import math
import random

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("需要 pillow: pip install pillow")
    raise

# sports-fair 现有主题色（从 src/components/Stat 颜色推断,跟 Hiking 联动）
BG_TOP = (245, 158, 11)        # #f59e0b amber-500
BG_BOTTOM = (234, 88, 12)      # #ea580c orange-600
MOUNTAIN = (22, 163, 74)       # #16a34a green-600 (Hiking)
TRACK = (255, 255, 255)        # 白色轨迹线
START = (220, 38, 38)          # #dc2626 red-600 (起点强调)
STAR = (255, 255, 255)         # 白色终点星


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    """生成垂直渐变背景"""
    img = Image.new("RGB", size, top)
    pixels = img.load()
    w, h = size
    for y in range(h):
        ratio = y / max(h - 1, 1)
        r = int(top[0] * (1 - ratio) + bottom[0] * ratio)
        g = int(top[1] * (1 - ratio) + bottom[1] * ratio)
        b = int(top[2] * (1 - ratio) + bottom[2] * ratio)
        for x in range(w):
            pixels[x, y] = (r, g, b)
    return img


def rounded_rectangle_mask(size: tuple[int, int], radius: int) -> Image.Image:
    """生成圆角矩形 alpha mask (白色 = 透明? — 实际是白色可见)"""
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask


def draw_mountains(draw: ImageDraw.ImageDraw, size: tuple[int, int]) -> None:
    """画底部山形"""
    w, h = size
    # 主峰 1 - 左中
    p1 = [(0, h * 0.78), (w * 0.30, h * 0.42), (w * 0.55, h * 0.72), (w * 0.45, h * 0.72), (0, h * 0.72)]
    # 主峰 2 - 中右
    p2 = [(w * 0.35, h * 0.70), (w * 0.65, h * 0.35), (w * 0.92, h * 0.68), (w * 0.92, h), (w * 0.35, h)]
    # 远山 - 浅色,做层次
    p3 = [(0, h * 0.88), (w * 0.18, h * 0.62), (w * 0.40, h * 0.88)]
    p4 = [(w * 0.55, h * 0.88), (w * 0.80, h * 0.58), (w, h * 0.85), (w, h), (w * 0.55, h)]
    draw.polygon(p3, fill=(132, 204, 22))  # green-400 远山
    draw.polygon(p4, fill=(132, 204, 22))
    draw.polygon(p1, fill=MOUNTAIN)
    draw.polygon(p2, fill=MOUNTAIN)


def draw_track(draw: ImageDraw.ImageDraw, size: tuple[int, int], seed: int = 42) -> None:
    """画蜿蜒轨迹线(从左下到右上,带自然的曲率)"""
    w, h = size
    rng = random.Random(seed)
    # 起点(左下)到终点(右上)
    p0 = (w * 0.10, h * 0.75)
    p1 = (w * 0.92, h * 0.22)
    n = 40
    pts = []
    for i in range(n + 1):
        t = i / n
        # 直线插值
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        # 加正弦扰动
        amp = 0.10 * w * (1 - 0.7 * abs(2 * t - 1))  # 中间幅度大,两端小
        offset = math.sin(t * math.pi * 2.5) * amp
        x += offset * 0.6
        y += offset * 0.4
        # 微微随机扰动
        x += rng.uniform(-2, 2)
        y += rng.uniform(-2, 2)
        pts.append((x, y))
    # 主轨迹线
    line_w = max(4, int(w / 64))
    draw.line(pts, fill=TRACK, width=line_w, joint="curve")
    # 描边(深色)— 让白色在橙色背景上更立体
    draw.line(pts, fill=(0, 0, 0, 80), width=line_w + 2, joint="curve")  # alpha 80 在 RGBA 模式下失效,需换法


def draw_track_with_shadow(draw_main, draw_shadow, size, seed=42):
    """带阴影的轨迹线"""
    import math, random
    w, h = size
    rng = random.Random(seed)
    p0 = (w * 0.10, h * 0.75)
    p1 = (w * 0.92, h * 0.22)
    n = 40
    pts = []
    for i in range(n + 1):
        t = i / n
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        amp = 0.10 * w * (1 - 0.7 * abs(2 * t - 1))
        offset = math.sin(t * math.pi * 2.5) * amp
        x += offset * 0.6
        y += offset * 0.4
        x += rng.uniform(-2, 2)
        y += rng.uniform(-2, 2)
        pts.append((x, y))
    line_w = max(4, int(w / 64))
    # 先画阴影(粗一点的半透明)
    draw_shadow.line(pts, fill=(120, 53, 15, 180), width=line_w + 2, joint="curve")
    # 再画主轨迹
    draw_main.line(pts, fill=TRACK, width=line_w, joint="curve")


def draw_start_marker(draw: ImageDraw.ImageDraw, size: tuple[int, int]) -> None:
    """起点圆点(左下)"""
    w, h = size
    r = max(8, int(w / 28))
    cx, cy = w * 0.10, h * 0.75
    # 白色描边
    draw.ellipse([(cx - r - 2, cy - r - 2), (cx + r + 2, cy + r + 2)], fill=TRACK)
    draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=START)


def draw_end_star(draw: ImageDraw.ImageDraw, size: tuple[int, int]) -> None:
    """终点五角星(右上)"""
    w, h = size
    cx, cy = w * 0.92, h * 0.22
    r_outer = max(12, int(w / 18))
    r_inner = r_outer * 0.45
    # 计算 5 个外点 + 5 个内点
    pts = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5  # 从顶部开始
        r = r_outer if i % 2 == 0 else r_inner
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        pts.append((x, y))
    # 描边(深色) + 主色(白色)
    # 用 polygon 画阴影
    shadow_pts = [(p[0] + 2, p[1] + 2) for p in pts]
    draw.polygon(shadow_pts, fill=(120, 53, 15))
    draw.polygon(pts, fill=STAR)
    # 中心高亮
    draw.ellipse([(cx - 3, cy - 3), (cx + 3, cy + 3)], fill=(245, 158, 11))


def generate_favicon(size: tuple[int, int], out_path: Path) -> None:
    w, h = size
    radius = int(min(w, h) * 0.18)

    # 1. 渐变背景
    bg = vertical_gradient(size, BG_TOP, BG_BOTTOM)
    # 2. 应用圆角 mask
    mask = rounded_rectangle_mask(size, radius)
    rounded = Image.new("RGBA", size, (0, 0, 0, 0))
    rounded.paste(bg.convert("RGBA"), (0, 0), mask)

    # 3. 在主图层上画
    draw = ImageDraw.Draw(rounded)
    draw_mountains(draw, size)
    draw_track_with_shadow(draw, draw, size, seed=42)
    draw_start_marker(draw, size)
    draw_end_star(draw, size)

    # 4. 保存
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rounded.save(out_path, "PNG", optimize=True)
    print(f"✓ {out_path}  {size[0]}x{size[1]}")


def main():
    repo = Path(__file__).resolve().parent.parent
    public = repo / "public"
    generate_favicon((256, 256), public / "favicon.png")
    generate_favicon((180, 180), public / "apple-touch-icon.png")


if __name__ == "__main__":
    main()