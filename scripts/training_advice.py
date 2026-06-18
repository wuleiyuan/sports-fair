#!/usr/bin/env python3
"""
training_advice.json — v2.2.9

从 training_load.json (v2.2.8 输出) 提炼 rule-based 训练建议, 0 LLM 依赖。

输出字段:
  - overall_status / overall_severity / overall_summary: 综合状态
  - advice_items: 排序后的建议列表 (severity: high > medium > low)
  - data_window / config: 来源追溯

5 类建议规则:
  1. ACWR 5 状态: high_risk (>1.5) / caution (1.3-1.5) / sweet_spot (0.8-1.3) /
                  undertraining (<0.8) / unknown
  2. Z2 占比 4 状态: 不足 (<20%) / 偏低 (20-60%) / 合理 (60-80%) / 过多 (>80%)
  3. Polarized 80/20: 偏离 (<70%) / 符合 (≥70%)
  4. 数据完整度: 7d 不足 / 28d 不足
  5. 综合状态: 最高 severity → overall

设计原则:
  - 0 LLM 依赖 (跟 §14.1 选 A 不选 LLM 一致, 避免 6/16 已踩过的 GHA step 复杂度坑)
  - 0 外部依赖 (纯 stdlib, 跟 training_load.py 一致)
  - 每条 advice 附 "为什么这么说" 的 evidence 字段
  - severity 排序, UI 重点展示高 severity
  - insufficient_data 兜底 (不假装有建议)

用法:
  python3 scripts/training_advice.py
  # 写 src/static/training_advice.json

历史:
  - 2026-06-18 v2.2.9: 初版
    - 5 类 rule-based advice (ACWR / Z2 / Polarized / Data / Overall)
    - severity 排序 + overall 综合状态
"""
import json
import os
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAINING_LOAD_PATH = os.path.join(ROOT, "src", "static", "training_load.json")
OUTPUT_PATH = os.path.join(ROOT, "src", "static", "training_advice.json")

# 数据完整度阈值
MIN_ACUTE_DAYS = 3   # 7d 窗口至少 3 天有数据才可信
MIN_CHRONIC_DAYS = 7  # 28d 窗口至少 7 天有数据才可信

# Z2 占比阈值 (polarized training 模型)
Z2_INSUFFICIENT = 20.0   # < 20% 严重不足
Z2_LOW = 60.0            # 20-60% 偏低
Z2_IDEAL_HIGH = 80.0     # 60-80% 合理 / > 80% 过多

# Polarized 80/20 阈值
POLARIZED_THRESHOLD = 70.0  # Z1+Z2 比例 < 70% = polarized 偏离

# Severity 排序权重
SEVERITY_RANK = {"high": 3, "medium": 2, "low": 1, "info": 0}


def load_training_load():
    if not os.path.exists(TRAINING_LOAD_PATH):
        print(f"[training_advice] missing: {TRAINING_LOAD_PATH}", file=sys.stderr)
        return None
    with open(TRAINING_LOAD_PATH) as f:
        return json.load(f)


def advice_acwr(acwr_block):
    """ACWR 风险等级建议"""
    status = acwr_block.get("status", "unknown")
    ratio = acwr_block.get("ratio")
    acute = acwr_block.get("acute_7d_trimp", 0)
    chronic = acwr_block.get("chronic_28d_trimp", 0)
    acute_days = acwr_block.get("acute_days_with_data", 0)
    chronic_days = acwr_block.get("chronic_days_with_data", 0)

    if status == "high_risk":
        return {
            "id": "acwr_high_risk",
            "category": "load",
            "severity": "high",
            "title": "训练负荷激增（伤病高危）",
            "description": (
                f"ACWR {ratio} 超过 1.5 警戒线, 属高危伤病风险窗口。"
                "急/慢性训练负荷比偏离 sweet spot。"
            ),
            "action": (
                "立即安排 1-2 天全休或极轻松交叉训练（散步 / 瑜伽 / 拉伸）。"
                "本周不安排长距离或高强度间歇。"
            ),
            "evidence": (
                f"7d 急性负荷 {acute} TRIMP / 28d 慢性 {chronic} TRIMP "
                f"(7d {acute_days} 天有数据 / 28d {chronic_days} 天有数据)"
            ),
        }
    if status == "caution":
        return {
            "id": "acwr_caution",
            "category": "load",
            "severity": "medium",
            "title": "训练负荷偏高",
            "description": f"ACWR {ratio} 处于 1.3-1.5 caution 区, 接近伤病风险窗口。",
            "action": "本周安排 1 天轻量训练（30 分钟以内轻松跑或交叉训练）。",
            "evidence": f"7d 急性 {acute} TRIMP / 28d 慢性 {chronic} TRIMP",
        }
    if status == "sweet_spot":
        return {
            "id": "acwr_sweet_spot",
            "category": "load",
            "severity": "low",
            "title": "训练负荷合理",
            "description": f"ACWR {ratio} 处于 0.8-1.3 sweet spot, 训练负荷与恢复匹配良好。",
            "action": "按计划训练, 保持当前负荷节奏。",
            "evidence": f"7d 急性 {acute} TRIMP / 28d 慢性 {chronic} TRIMP",
        }
    if status == "undertraining":
        return {
            "id": "acwr_undertraining",
            "category": "load",
            "severity": "medium",
            "title": "训练负荷不足",
            "description": f"ACWR {ratio} 低于 0.8, 28d 慢性基数偏低。",
            "action": (
                "可逐步加量: 本周增加 1-2 次中等强度训练, "
                "或单次延长 10-15 分钟。"
            ),
            "evidence": f"7d 急性 {acute} TRIMP / 28d 慢性 {chronic} TRIMP",
        }
    # unknown
    return {
        "id": "acwr_unknown",
        "category": "load",
        "severity": "info",
        "title": "训练负荷数据不足",
        "description": "无法计算 ACWR（缺少心率或时长数据）。",
        "action": "继续训练积累心率数据, 几周后 ACWR 才能稳定。",
        "evidence": f"7d {acute_days} 天有数据 / 28d {chronic_days} 天有数据",
    }


def advice_z2(hr_zones_block):
    """Z2 占比建议 (有氧底座)"""
    z2 = hr_zones_block.get("z2_aerobic_base", 0)
    z1 = hr_zones_block.get("z1_recovery", 0)
    polarized = hr_zones_block.get("polarized_pct", 0)
    activities_with_hr = hr_zones_block.get("activities_with_hr", 0)

    if activities_with_hr < 5:
        return {
            "id": "z2_insufficient_hr",
            "category": "intensity",
            "severity": "info",
            "title": "心率数据不足",
            "description": f"近 90 天仅 {activities_with_hr} 个活动有 HR 数据, 区间分布不可信。",
            "action": "确保跑步时佩戴心率设备（AW / 心率带）, 让 HR 数据自动同步。",
            "evidence": f"90 天窗口 {activities_with_hr} 个活动有 HR",
        }

    if z2 < Z2_INSUFFICIENT:
        return {
            "id": "z2_insufficient",
            "category": "intensity",
            "severity": "high",
            "title": "Z2 有氧底座严重不足",
            "description": (
                f"Z2 占比仅 {z2}%, 远低于 polarized 训练 60-80% 的目标。"
                "长期高强度训练易积劳, 增加伤病风险。"
            ),
            "action": (
                "未来 4 周把 80% 的训练严格控制在轻松区间（心率 "
                f"< {(0.6 + 0.7) / 2 * 100:.0f}% HRR）。"
                "学会压住心率慢下来, 配速自然会提高。"
            ),
            "evidence": f"Z1 {z1}% + Z2 {z2}% = polarized {polarized}%",
        }
    if z2 < Z2_LOW:
        return {
            "id": "z2_low",
            "category": "intensity",
            "severity": "medium",
            "title": "Z2 有氧底座可加强",
            "description": f"Z2 占比 {z2}%, 有氧基础有提升空间。",
            "action": (
                "每周增加 1-2 次纯 Z2 训练（45-60 分钟, "
                "全程保持轻松对话配速）。"
            ),
            "evidence": f"Z1 {z1}% + Z2 {z2}% = polarized {polarized}%",
        }
    if z2 <= Z2_IDEAL_HIGH:
        return {
            "id": "z2_ideal",
            "category": "intensity",
            "severity": "low",
            "title": "Z2 占比合理",
            "description": (
                f"Z2 占比 {z2}%, 处于 polarized 训练 60-80% 理想区间。"
                "有氧底座扎实。"
            ),
            "action": "保持当前配速训练, 周末可加 1 次长距离 Z2 拉练。",
            "evidence": f"Z1 {z1}% + Z2 {z2}% = polarized {polarized}%",
        }
    # z2 > 80%
    return {
        "id": "z2_excessive",
        "category": "intensity",
        "severity": "medium",
        "title": "Z2 占比过多",
        "description": (
            f"Z2 占比 {z2}%, 超过 80% polarized 上限。"
            "高强度刺激不足可能影响速度上限。"
        ),
        "action": "每周加 1 次高强度（间歇跑 / 节奏跑 / 爬坡）。",
        "evidence": f"Z1 {z1}% + Z2 {z2}% = polarized {polarized}%",
    }


def advice_polarized(hr_zones_block):
    """Polarized 80/20 监控"""
    polarized = hr_zones_block.get("polarized_pct", 0)
    z4 = hr_zones_block.get("z4_threshold", 0)
    z5 = hr_zones_block.get("z5_anaerobic", 0)
    activities_with_hr = hr_zones_block.get("activities_with_hr", 0)

    if activities_with_hr < 5:
        return None  # Z2 advice 已涵盖

    if polarized < POLARIZED_THRESHOLD:
        return {
            "id": "polarized_off",
            "category": "intensity",
            "severity": "medium",
            "title": "训练分布偏离 polarized",
            "description": (
                f"低强度占比 (Z1+Z2) 仅 {polarized}%, "
                f"中强度 (Z3 + Z4) 占比过高。"
                "polarized 训练模型建议 80/20 分配。"
            ),
            "action": (
                "把中等强度训练替换为轻松有氧。"
                f"目前 Z4 {z4}% + Z5 {z5}% 高强度刺激充足, "
                "问题在中间区。"
            ),
            "evidence": f"Z1+Z2 = {polarized}% (< 70% 阈值)",
        }
    return {
        "id": "polarized_ok",
        "category": "intensity",
        "severity": "low",
        "title": "训练分布符合 polarized",
        "description": (
            f"低强度 (Z1+Z2) 占比 {polarized}%, 符合 polarized 训练 80/20 模型。"
        ),
        "action": "保持当前训练分布, 无需调整。",
        "evidence": f"Z1+Z2 = {polarized}% (≥ 70% 阈值)",
    }


def advice_data_completeness(acwr_block, hr_zones_block):
    """数据完整度建议"""
    acute_days = acwr_block.get("acute_days_with_data", 0)
    chronic_days = acwr_block.get("chronic_days_with_data", 0)
    activities_with_hr = hr_zones_block.get("activities_with_hr", 0)

    issues = []
    if acute_days < MIN_ACUTE_DAYS:
        issues.append(f"7d 仅 {acute_days} 天有数据 (目标 ≥ {MIN_ACUTE_DAYS})")
    if chronic_days < MIN_CHRONIC_DAYS:
        issues.append(f"28d 仅 {chronic_days} 天有数据 (目标 ≥ {MIN_CHRONIC_DAYS})")
    if activities_with_hr < 10 and activities_with_hr > 0:
        issues.append(f"90d 仅 {activities_with_hr} 个活动有 HR 数据")

    if not issues:
        return None

    severity = "high" if (acute_days == 0 or chronic_days == 0) else "medium"
    return {
        "id": "data_completeness",
        "category": "data",
        "severity": severity,
        "title": "数据完整度不足",
        "description": (
            "以下数据缺口影响建议可信度: " + "; ".join(issues) + "。"
        ),
        "action": (
            "建议: (1) 跑步时佩戴心率设备 (2) 训练后及时同步数据 "
            "(3) 1-2 周后再看建议会更准"
        ),
        "evidence": f"7d {acute_days} 天 / 28d {chronic_days} 天 / 90d HR {activities_with_hr} 活动",
    }


def derive_overall_status(advice_items):
    """综合所有 advice_items 推导 overall_status"""
    if not advice_items:
        return "sweet_spot", "low", "数据完整, 各项指标正常, 继续保持训练。"

    high_count = sum(1 for a in advice_items if a["severity"] == "high")
    medium_count = sum(1 for a in advice_items if a["severity"] == "medium")
    low_count = sum(1 for a in advice_items if a["severity"] == "low")
    info_count = sum(1 for a in advice_items if a["severity"] == "info")

    # 严重度
    if high_count > 0:
        severity = "high"
        status = "high_risk"
    elif medium_count > 0:
        severity = "medium"
        status = "caution"
    elif low_count > 0:
        severity = "low"
        status = "sweet_spot"
    else:
        # 只有 info (数据不足)
        severity = "info"
        status = "insufficient_data"

    # 摘要
    high_titles = [a["title"] for a in advice_items if a["severity"] == "high"]
    medium_titles = [a["title"] for a in advice_items if a["severity"] == "medium"]

    if high_titles:
        summary = "⚠️ 重点关注: " + "; ".join(high_titles) + "。"
    elif medium_titles:
        summary = "建议关注: " + "; ".join(medium_titles) + "。"
    elif low_count > 0:
        summary = f"整体状态良好 ({low_count} 项指标正常), 按建议微调即可。"
    else:
        summary = "数据积累中, 继续训练让数据更完整。"

    return status, severity, summary


def main():
    tl = load_training_load()
    if not tl:
        return 1

    # 必备字段校验
    for k in ("acwr", "hr_zones", "cadence", "config", "data_window"):
        if k not in tl:
            print(f"[training_advice] missing field in training_load.json: {k}", file=sys.stderr)
            return 1

    advice_items = []

    # 1. ACWR 建议
    advice_items.append(advice_acwr(tl["acwr"]))

    # 2. Z2 建议
    advice_items.append(advice_z2(tl["hr_zones"]))

    # 3. Polarized 建议 (可能 None, 表示已合并到 Z2 advice)
    polarized = advice_polarized(tl["hr_zones"])
    if polarized:
        advice_items.append(polarized)

    # 4. 数据完整度 (可能 None)
    completeness = advice_data_completeness(tl["acwr"], tl["hr_zones"])
    if completeness:
        advice_items.append(completeness)

    # 排序: severity desc, 同 severity 保持原顺序
    advice_items.sort(key=lambda a: -SEVERITY_RANK.get(a["severity"], 0))

    # 5. 综合状态
    overall_status, overall_severity, overall_summary = derive_overall_status(advice_items)

    output = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "overall_status": overall_status,
        "overall_severity": overall_severity,
        "overall_summary": overall_summary,
        "advice_count": len(advice_items),
        "advice_items": advice_items,
        "data_window": tl.get("data_window", {}),
        "config": tl.get("config", {}),
        "source": "training_load.json (v2.2.8) + rule-based engine (v2.2.9)",
        "method": "0 LLM, 纯 stdlib rule-based 推导",
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[training_advice] ✅ wrote {OUTPUT_PATH}")
    print(f"  Overall: {overall_status} ({overall_severity})")
    print(f"  Advice items: {len(advice_items)}")
    for a in advice_items:
        print(f"    [{a['severity']:6}] {a['id']:25} {a['title']}")
    print(f"  Summary: {overall_summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
