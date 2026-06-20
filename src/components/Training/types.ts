/**
 * v2.3.2 — 训练负荷类型定义
 *
 * 数据源: src/static/training_load.json + src/static/training_advice.json
 * 生成器: scripts/training_load.py (v2.3.2) + scripts/training_advice.py (v2.2.9)
 * 不引第三方库，结构跟生成器输出严格对齐。
 */

/** ACWR 状态机 (5 态) — 跟 training_load.py 的 status 字段对应 */
export type ACWRStatus =
  | 'sweet_spot'      // 0.8-1.3 最佳提升
  | 'undertrained'    // < 0.8 训练不足
  | 'caution'         // 1.3-1.5 过度训练
  | 'high_risk'       // > 1.5 高危伤病
  | 'unknown';        // 数据不足

/** TSB 状态 (5 态) — Coggan 疲劳模型 */
export type TSBStatus =
  | 'fresh'           // > 15 充分恢复
  | 'optimal'         // -5 ~ 15 最佳训练区
  | 'fatigued'        // -15 ~ -5 疲劳累积
  | 'overtraining'    // < -15 过度训练
  | 'unknown';        // 数据不足

/** HR 区间 5 区 — Karvonen HRR 公式 (跟 training_load.py 一致) */
export type HRZoneKey = 'z1' | 'z2' | 'z3' | 'z4' | 'z5';

/** 训练建议分类 */
export type AdviceCategory = 'data' | 'load' | 'intensity' | 'recovery' | 'cadence' | 'other';

/** 严重程度 (3 级) */
export type AdviceSeverity = 'info' | 'low' | 'high';

/** ACWR 配置 (from training_load.json.config.thresholds) */
export interface ACWRConfig {
  acwr_under: number;          // < this = undertrained
  acwr_sweet_spot: [number, number]; // [low, high]
  acwr_caution: number;        // > caution = high_risk
}

/** ACWR 结果 (from training_load.json.acwr) */
export interface ACWRResult {
  acute_7d_trimp: number;
  chronic_28d_trimp: number;
  acute_days_with_data: number;
  chronic_days_with_data: number;
  ratio: number | null;
  status: ACWRStatus;
  warning: string | null;
}

/** HR 区间分布 (from training_load.json.hr_zones) */
export interface HRZones {
  z1_recovery: number;
  z2_aerobic_base: number;
  z3_aerobic: number;
  z4_threshold: number;
  z5_anaerobic: number;
  dominant_zone: string;
  z2_pct: number;
  polarized_pct: number;
  activities_with_hr: number;
  window_days: number;
}

/** 数据窗口 (from training_load.json.data_window) */
export interface DataWindow {
  earliest: string;
  latest: string;
  total_activities: number;
}

/** TSB 结果 (from training_load.json.tsb) */
export interface TSBResult {
  ctl: number;
  atl: number;
  tsb: number;
  status: TSBStatus;
  ctl_days: number;
  atl_days: number;
  data_span_days: number;
}

/** 训练负荷顶层 (from training_load.json) */
export interface TrainingLoad {
  generated_at: string;
  config: {
    hr_max: number;
    hr_rest: number;
    method_hr_zones: string;
    method_load: string;
    method_acwr: string;
    method_tsb: string;
    thresholds: ACWRConfig;
  };
  acwr: ACWRResult;
  tsb: TSBResult;
  hr_zones: HRZones;
  cadence: number | null;
  cadence_note: string;
  data_window: DataWindow;
}

/** 单条建议 (from training_advice.json.advice_items[]) */
export interface AdviceItem {
  id: string;
  category: AdviceCategory;
  severity: AdviceSeverity;
  title: string;
  description: string;
  action: string;
  evidence: string;
}

/** 训练建议顶层 (from training_advice.json) */
export interface TrainingAdvice {
  generated_at: string;
  overall_status: 'good' | 'watch' | 'warn' | 'urgent';
  overall_severity: AdviceSeverity;
  overall_summary: string;
  advice_count: number;
  advice_items: AdviceItem[];
  data_window: DataWindow;
  config: TrainingLoad['config'];
  source: string;
  method: string;
}

/** ACWR 区间色带 (Apple HIG 风格 — 4 区) */
export interface ACWRZone {
  min: number;
  max: number;     // 99 = ∞
  color: string;
  label: string;   // 中文
  cn: string;      // 英文
}

export const ACWR_ZONES: readonly ACWRZone[] = [
  { min: 0,    max: 0.8,  color: '#a855f7', label: '恢复期',     cn: 'Detraining' },
  { min: 0.8,  max: 1.3,  color: '#22c55e', label: '最佳提升',   cn: 'Optimal' },
  { min: 1.3,  max: 1.5,  color: '#f97316', label: '过度训练',   cn: 'Overreaching' },
  { min: 1.5,  max: 99,   color: '#3b82f6', label: '高危预警',   cn: 'High Risk' },
] as const;

/** 静态 AI 风格建议 — 跟 AssessmentCard.acwrZone() 保持一致 */
export function acwrZoneAdvice(ratio: number | null): string {
  if (ratio === null || ratio <= 0) return '近 28 天无训练记录。从低强度（步行 3km）开始恢复。';
  if (ratio < 0.8) return '当前训练负荷偏低，长期维持可能影响体能提升。建议每周增加 1 次中等强度训练（30 分钟慢跑或骑行）。';
  if (ratio <= 1.3) return '维持训练：当前处于伤病风险最低且体能提升最快的区间。建议保持周训练量稳定。';
  if (ratio <= 1.5) return '建议本周减少 20% 训练量：增加 1-2 天主动恢复（散步/拉伸），高强度训练减半。';
  return '紧急减量：建议立即减量 50% 或完全休息 1-2 天。监测 RHR 与睡眠，警惕受伤信号。';
}

/** 根据 ratio 返回所在 zone */
export function getACWRZone(ratio: number | null): ACWRZone {
  if (ratio === null || ratio <= 0) return ACWR_ZONES[0];
  for (const z of ACWR_ZONES) {
    if (ratio >= z.min && ratio < z.max) return z;
  }
  return ACWR_ZONES[ACWR_ZONES.length - 1];
}

/** HR 区间元数据 */
export const HR_ZONE_META: Record<HRZoneKey, { label: string; cn: string; color: string; hrr: string }> = {
  z1: { label: 'Z1 恢复',   cn: 'Recovery',       color: '#60a5fa', hrr: '< 60%' },
  z2: { label: 'Z2 有氧底座', cn: 'Aerobic Base', color: '#22c55e', hrr: '60-70%' },
  z3: { label: 'Z3 有氧',   cn: 'Aerobic',        color: '#eab308', hrr: '70-80%' },
  z4: { label: 'Z4 乳酸阈',  cn: 'Threshold',     color: '#f97316', hrr: '80-90%' },
  z5: { label: 'Z5 无氧',   cn: 'Anaerobic',      color: '#ef4444', hrr: '90%+' },
};

/** ACWR 状态徽章文案 (跟 getACWRZone + status 字段双验证) */
export const ACWR_STATUS_LABEL: Record<ACWRStatus, { text: string; color: string }> = {
  sweet_spot:   { text: '✓ 最佳区间', color: '#22c55e' },
  undertrained: { text: '⚠ 训练不足', color: '#a855f7' },
  caution:      { text: '⚠ 注意减量', color: '#f97316' },
  high_risk:    { text: '✕ 高危预警', color: '#3b82f6' },
  unknown:      { text: '? 数据不足', color: '#9ca3af' },
};

/** TSB 状态徽章文案 (Coggan 疲劳模型) */
export const TSB_STATUS_LABEL: Record<TSBStatus, { text: string; color: string }> = {
  fresh:        { text: '✓ 充分恢复', color: '#22c55e' },
  optimal:      { text: '✓ 最佳训练区', color: '#6366f1' },
  fatigued:     { text: '⚠ 疲劳累积', color: '#f97316' },
  overtraining: { text: '✕ 过度训练', color: '#ef4444' },
  unknown:      { text: '? 数据不足', color: '#9ca3af' },
};

/** TSB 状态文案帮助函数 */
export function tsbStatusAdvice(tsb: number | null): string {
  if (tsb === null) return '数据不足，无法计算 TSB。';
  if (tsb > 15) return '充分恢复阶段，适合安排高强度或长距离训练。';
  if (tsb >= -5) return '训练状态良好，维持当前训练计划。';
  if (tsb >= -15) return '疲劳累积中，注意安排恢复日和低强度训练。';
  return '过度训练风险较高，建议休息 1-2 天或大幅减量。';
}
