#!/usr/bin/env python3
"""
gen_favicon.py — 生成 sports-fair 网站 favicon + apple-touch-icon (v2)

设计:多元素运动 + 户外 + 数据
- 圆角橙色渐变背景 (#f59e0b → #ea580c, Run 主色)
- 白色蜿蜒轨迹线 (从左下到右上)
- 起点: 红色圆点 + 旁边小跑步人剪影 (运动)
- 终点: 白色五角星 (成就)
- 山形 (缩小, Hiking 色)
- 天空: 2 朵白云 (户外)
- 山脚: 3 棵三角小树 (户外)
- 左侧: 心率波纹图标 (数据)
- 右上: 指南针指针 (数据 / 户外)

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

# sports-fair 现有主题色
BG_TOP = (245, 158, 11)        # #f59e0b amber-500
BG_BOTTOM = (234, 88, 12)      # #ea580c orange-600
MOUNTAIN = (22, 163, 74)       # #16a34a green-600
MOUNTAIN_FAR = (132, 204, 22)  # #84cc16 green-400 远山
TREE_DARK = (20, 83, 45)       # #14532d dark green
TRACK = (255, 255, 255)        # 白色轨迹线
START = (220, 38, 38)          # #dc2626 red-600
STAR = (255, 255, 255)         # 白色终点星
CLOUD = (255, 255, 255)         # 白色云
CLOUD_SHADOW = (255, 247, 230)  # 微黄云底
HEART = (244, 63, 94)          # #f43f5e rose-500 心率
RUNNER = (255, 255, 255)        # 白色跑步人
TREE_TRUNK = (101, 67, 33)      # 棕色树干


def vertical_gradient(size, top, bottom):
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


def rounded_rectangle_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask


def draw_mountains(draw, size):
    w, h = size
    # 远山 (浅绿,层次感)
    far_left = [(0, h * 0.80), (w * 0.22, h * 0.55), (w * 0.42, h * 0.78), (w * 0.30, h * 0.78), (0, h * 0.78)]
    far_right = [(w * 0.55, h * 0.78), (w * 0.78, h * 0.50), (w, h * 0.75), (w, h), (w * 0.55, h)]
    draw.polygon(far_left, fill=MOUNTAIN_FAR)
    draw.polygon(far_right, fill=MOUNTAIN_FAR)
    # 主山 (深绿)
    main_left = [(0, h * 0.92), (w * 0.28, h * 0.50), (w * 0.55, h * 0.88), (0, h * 0.88)]
    main_right = [(w * 0.40, h * 0.88), (w * 0.68, h * 0.42), (w * 0.95, h * 0.82), (w * 0.95, h), (w * 0.40, h)]
    draw.polygon(main_left, fill=MOUNTAIN)
    draw.polygon(main_right, fill=MOUNTAIN)


def draw_track(draw_main, draw_shadow, size, seed=42):
    w, h = size
    rng = random.Random(seed)
    p0 = (w * 0.12, h * 0.78)
    p1 = (w * 0.88, h * 0.20)
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
    draw_shadow.line(pts, fill=(120, 53, 15, 220), width=line_w + 3, joint="curve")
    draw_main.line(pts, fill=TRACK, width=line_w, joint="curve")
    return pts


def draw_clouds(draw, size):
    w, h = size
    # 云 1 - 左上
    c1_cx, c1_cy = w * 0.25, h * 0.18
    cr1 = w * 0.06
    for cx_off, cy_off, r in [
        (-0.8, 0.0, 0.7),
        (-0.2, 0.3, 0.9),
        (0.5, 0.2, 0.8),
        (0.9, 0.0, 0.6),
    ]:
        cx = c1_cx + cx_off * cr1
        cy = c1_cy + cy_off * cr1
        r = r * cr1
        draw.ellipse([(cx - r + 2, cy - r + 2), (cx + r + 2, cy + r + 2)], fill=CLOUD_SHADOW)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=CLOUD)
    # 云 2 - 右上偏下
    c2_cx, c2_cy = w * 0.70, h * 0.32
    cr2 = w * 0.04
    for cx_off, cy_off, r in [
        (-0.8, 0.0, 0.7),
        (0.0, 0.4, 0.8),
        (0.8, 0.1, 0.7),
    ]:
        cx = c2_cx + cx_off * cr2
        cy = c2_cy + cy_off * cr2
        r = r * cr2
        draw.ellipse([(cx - r + 1, cy - r + 1), (cx + r + 1, cy + r + 1)], fill=CLOUD_SHADOW)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=CLOUD)


def draw_trees(draw, size):
    w, h = size
    for tx, ty, scale in [(w * 0.10, h * 0.85, 1.0),
                          (w * 0.78, h * 0.82, 0.8),
                          (w * 0.93, h * 0.88, 0.7)]:
        trunk_w = max(2, int(w / 80 * scale))
        tree_h = h * 0.10 * scale
        tree_w = w * 0.05 * scale
        # 树冠 (三角)
        draw.polygon([
            (tx, ty - tree_h),
            (tx - tree_w, ty),
            (tx + tree_w, ty),
        ], fill=TREE_DARK)
        # 树干
        draw.rectangle([
            (tx - trunk_w, ty),
            (tx + trunk_w, ty + tree_h * 0.2),
        ], fill=TREE_TRUNK)


def draw_heart_icon(draw, size):
    w, h = size
    cx, cy = w * 0.15, h * 0.55
    r = w * 0.04
    line_w = max(2, int(w / 100))
    pts = [
        (cx - r * 2, cy),
        (cx - r * 1.2, cy),
        (cx - r * 0.8, cy - r * 0.4),
        (cx - r * 0.4, cy + r * 0.6),
        (cx, cy - r * 0.8),
        (cx + r * 0.4, cy + r * 0.4),
        (cx + r * 0.8, cy - r * 0.2),
        (cx + r * 1.2, cy),
        (cx + r * 2, cy),
    ]
    draw.line(pts, fill=HEART, width=line_w, joint="curve")


def draw_compass(draw, size):
    w, h = size
    cx, cy = w * 0.78, h * 0.13
    r_outer = w * 0.04
    r_inner = r_outer * 0.35
    # 外圈
    draw.ellipse([(cx - r_outer, cy - r_outer), (cx + r_outer, cy + r_outer)],
                 outline=TRACK, width=max(1, int(w / 200)))
    # 指针 (北, 白色三角)
    draw.polygon([
        (cx, cy - r_outer * 0.85),
        (cx - r_outer * 0.25, cy),
        (cx + r_outer * 0.25, cy),
    ], fill=TRACK)
    # 指针 (南, 暗红)
    draw.polygon([
        (cx, cy + r_outer * 0.85),
        (cx - r_outer * 0.25, cy),
        (cx + r_outer * 0.25, cy),
    ], fill=START)
    # 中心点
    draw.ellipse([(cx - 2, cy - 2), (cx + 2, cy + 2)], fill=TRACK)


def draw_runner_silhouette(draw, size):
    w, h = size
    cx, cy = w * 0.22, h * 0.78  # 起点圆点右上
    s = w * 0.012
    head_r = s * 1.2
    # 头
    draw.ellipse([(cx - head_r, cy - head_r * 2.2), (cx + head_r, cy - head_r * 0.4)],
                 fill=RUNNER)
    # 身体 (向前倾)
    body_top = (cx, cy - head_r * 0.4)
    body_bot = (cx + s * 0.3, cy + s * 0.5)
    draw.line([body_top, body_bot], fill=RUNNER, width=max(2, int(s * 0.5)))
    # 前腿 (迈出)
    draw.line([body_bot, (cx + s * 2, cy + s * 2.5)], fill=RUNNER, width=max(2, int(s * 0.5)))
    # 后腿 (推地)
    draw.line([body_bot, (cx - s * 0.8, cy + s * 1.8)], fill=RUNNER, width=max(2, int(s * 0.5)))
    # 前臂 (摆)
    draw.line([(cx, cy), (cx + s * 1.5, cy - s * 0.5)], fill=RUNNER, width=max(2, int(s * 0.5)))
    # 后臂
    draw.line([(cx, cy), (cx - s * 0.8, cy + s * 0.3)], fill=RUNNER, width=max(2, int(s * 0.5)))


def draw_start_marker(draw, size):
    w, h = size
    r = max(8, int(w / 28))
    cx, cy = w * 0.12, h * 0.78
    draw.ellipse([(cx - r - 2, cy - r - 2), (cx + r + 2, cy + r + 2)], fill=TRACK)
    draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=START)


def draw_end_star(draw, size):
    w, h = size
    cx, cy = w * 0.88, h * 0.20
    r_outer = max(12, int(w / 18))
    r_inner = r_outer * 0.45
    pts = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5
        r = r_outer if i % 2 == 0 else r_inner
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        pts.append((x, y))
    shadow_pts = [(p[0] + 2, p[1] + 2) for p in pts]
    draw.polygon(shadow_pts, fill=(120, 53, 15))
    draw.polygon(pts, fill=STAR)


def generate_favicon(size, out_path):
    w, h = size
    radius = int(min(w, h) * 0.18)

    bg = vertical_gradient(size, BG_TOP, BG_BOTTOM)
    mask = rounded_rectangle_mask(size, radius)
    rounded = Image.new("RGBA", size, (0, 0, 0, 0))
    rounded.paste(bg.convert("RGBA"), (0, 0), mask)

    shadow_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_shadow = ImageDraw.Draw(shadow_layer)
    draw = ImageDraw.Draw(rounded)

    # 后画的在上面
    draw_clouds(draw, size)
    draw_compass(draw, size)
    draw_heart_icon(draw, size)
    draw_mountains(draw, size)
    draw_trees(draw, size)
    draw_track(draw, draw_shadow, size)
    draw_start_marker(draw, size)
    draw_runner_silhouette(draw, size)
    draw_end_star(draw, size)

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