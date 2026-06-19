/**
 * v2.3.1 — HR 区间分布卡片
 *
 * Karvonen HRR 5 区 (跟 training_load.py / healthAssessment.ts 一致)
 * - Z1 < 60%   恢复
 * - Z2 60-70%  有氧底座（燃脂）
 * - Z3 70-80%  有氧
 * - Z4 80-90%  乳酸阈值
 * - Z5 90%+    无氧
 *
 * 显示：
 * - 5 区 stacked horizontal bar
 * - 主导区间 (dominant_zone)
 * - 极化训练 % (Z1+Z2 比例, 目标 80/20)
 * - Z2 % (有氧底座比例, 目标 ≥ 50%)
 */
import React from 'react';
import { type HRZones, HR_ZONE_META, type HRZoneKey } from './types';
import styles from './style.module.css';

interface Props {
  hrZones: HRZones;
  windowDays?: number;
}

const ZONE_KEYS: HRZoneKey[] = ['z1', 'z2', 'z3', 'z4', 'z5'];

const HRZonesCard: React.FC<Props> = ({ hrZones, windowDays = 90 }) => {
  const totalTime = ZONE_KEYS.reduce((sum, k) => {
    const field = `${k}_${k === 'z1' ? 'recovery' : k === 'z2' ? 'aerobic_base' : k === 'z3' ? 'aerobic' : k === 'z4' ? 'threshold' : 'anaerobic'}` as keyof HRZones;
    return sum + ((hrZones[field] as number) || 0);
  }, 0);

  const hasData = hrZones.activities_with_hr > 0 && totalTime > 0;

  // 极化训练 % = Z1 + Z2 (理想 80%)
  const polarizedPct = hrZones.polarized_pct ?? 0;
  // Z2 % = 单独
  const z2Pct = hrZones.z2_pct ?? 0;
  const dominantZone = hrZones.dominant_zone || 'n/a';

  // 极化训练建议
  const polarizedHint = polarizedPct >= 70
    ? { text: '✓ 极化训练合理', color: '#22c55e' }
    : polarizedPct >= 50
      ? { text: '⚠ Z3+ 偏多', color: '#f97316' }
      : { text: '? Z1+Z2 比例不足', color: '#9ca3af' };

  return (
    <div
      className={`${styles.card} ${styles.hrZonesCard}`}
      role="region"
      aria-label="HR 区间分布"
    >
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardKicker}>Karvonen HRR · 5 区</div>
          <h3 className={styles.cardTitle}>心率区间分布</h3>
        </div>
        <span
          className={styles.hrBadge}
          style={{ backgroundColor: hasData ? HR_ZONE_META[dominantZone as HRZoneKey]?.color || '#9ca3af' : '#9ca3af' }}
        >
          {hasData ? `主导: ${HR_ZONE_META[dominantZone as HRZoneKey]?.label || dominantZone}` : '无 HR 数据'}
        </span>
      </div>

      {hasData ? (
        <>
          {/* 5 区 stacked bar */}
          <div className={styles.zoneStack} aria-label="5 区时间占比">
            {ZONE_KEYS.map((k) => {
              const field = `${k}_${k === 'z1' ? 'recovery' : k === 'z2' ? 'aerobic_base' : k === 'z3' ? 'aerobic' : k === 'z4' ? 'threshold' : 'anaerobic'}` as keyof HRZones;
              const v = (hrZones[field] as number) || 0;
              const pct = totalTime > 0 ? (v / totalTime) * 100 : 0;
              return (
                <div
                  key={k}
                  className={styles.zoneStackSeg}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: HR_ZONE_META[k].color,
                  }}
                  title={`${HR_ZONE_META[k].label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* 5 区 label (对齐 stacked bar) */}
          <div className={styles.zoneStackLabels}>
            {ZONE_KEYS.map((k) => {
              const field = `${k}_${k === 'z1' ? 'recovery' : k === 'z2' ? 'aerobic_base' : k === 'z3' ? 'aerobic' : k === 'z4' ? 'threshold' : 'anaerobic'}` as keyof HRZones;
              const v = (hrZones[field] as number) || 0;
              const pct = totalTime > 0 ? (v / totalTime) * 100 : 0;
              return (
                <div
                  key={k}
                  className={styles.zoneStackLabelItem}
                  style={{ width: `${pct}%`, minWidth: pct < 8 ? '40px' : 'auto' }}
                >
                  <span
                    className={styles.zoneStackDot}
                    style={{ backgroundColor: HR_ZONE_META[k].color }}
                  />
                  <span className={styles.zoneStackText}>
                    {HR_ZONE_META[k].label.split(' ')[0]}{' '}
                    <span className={styles.zoneStackPct}>{pct.toFixed(0)}%</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* 关键指标双行 */}
          <div className={styles.hrKeyStats}>
            <div className={styles.hrKeyStat}>
              <div className={styles.hrKeyLabel}>极化训练 % (Z1+Z2)</div>
              <div
                className={styles.hrKeyValue}
                style={{ color: polarizedHint.color }}
              >
                {polarizedPct.toFixed(1)}%
                <span className={styles.hrKeyHint}>{polarizedHint.text}</span>
              </div>
            </div>
            <div className={styles.hrKeyStat}>
              <div className={styles.hrKeyLabel}>Z2 有氧底座</div>
              <div
                className={styles.hrKeyValue}
                style={{ color: z2Pct >= 40 ? '#22c55e' : z2Pct >= 25 ? '#f97316' : '#9ca3af' }}
              >
                {z2Pct.toFixed(1)}%
                <span className={styles.hrKeyHint}>
                  {z2Pct >= 40 ? '✓ 充足' : z2Pct >= 25 ? '⚠ 偏低' : '✕ 不足'}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.hrEmpty}>
          <div className={styles.hrEmptyIcon}>📊</div>
          <div className={styles.hrEmptyTitle}>近 {windowDays} 天无 HR 数据</div>
          <div className={styles.hrEmptyHint}>
            跑步时佩戴心率设备（AW / 心率带），HR 数据自动同步。
          </div>
        </div>
      )}

      <div className={styles.cardFooter}>
        基于 {hrZones.activities_with_hr} 个有 HR 的活动（近 {hrZones.window_days || windowDays} 天）
      </div>
    </div>
  );
};

export default HRZonesCard;
