/**
 * v2.3.1 — ACWR 主卡片
 *
 * Apple HIG Bento 风格：
 * - 大数字 (1.58) 占主
 * - 状态徽章 + 区间色带 (0-2.0)
 * - 静态 AI 建议（高亮显示）
 * - 三角箭头定位当前 ratio 在色带上的位置
 *
 * 数据空态 (status=unknown, ratio=null) 优雅降级，不假数据。
 */
import React from 'react';
import {
  ACWR_ZONES,
  type TrainingLoad,
  type ACWRResult,
  getACWRZone,
  acwrZoneAdvice,
  ACWR_STATUS_LABEL,
} from './types';
import styles from './style.module.css';

interface Props {
  acwr: ACWRResult;
  generatedAt: string;
}

/** 色带宽度归一化 (0-2.0) */
const ACWR_DISPLAY_MAX = 2.0;
const ACWR_TOTAL_SPAN = 0.8 + 0.5 + 0.2 + 0.5; // 跟 AssessmentCard 保持一致

const ACWRCard: React.FC<Props> = ({ acwr, generatedAt }) => {
  const hasData = acwr.ratio !== null && acwr.ratio > 0;
  const currentZone = getACWRZone(acwr.ratio);
  const badge = ACWR_STATUS_LABEL[acwr.status];
  const advice = acwrZoneAdvice(acwr.ratio);

  // 指针位置 (0-100%)
  const acwrPercent = hasData
    ? Math.min(100, ((acwr.ratio as number) / ACWR_DISPLAY_MAX) * 100)
    : 0;

  return (
    <div
      className={`${styles.card} ${styles.acwrCard}`}
      data-severity={acwr.status}
      role="region"
      aria-label="ACWR 训练负荷"
    >
      {/* 头部: 标题 + 状态徽章 */}
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardKicker}>Banister TRIMP · Gabbett 7/28</div>
          <h3 className={styles.cardTitle}>ACWR 训练负荷</h3>
        </div>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: badge.color }}
          title={acwr.status}
        >
          {badge.text}
        </span>
      </div>

      {/* 主数字 */}
      <div className={styles.acwrMain}>
        {hasData ? (
          <>
            <div
              className={styles.acwrNumber}
              style={{ color: currentZone.color }}
            >
              {acwr.ratio!.toFixed(2)}
            </div>
            <div className={styles.acwrLabel}>
              <span className={styles.acwrZoneLabel}>{currentZone.label}</span>
              <span className={styles.acwrZoneEn}>{currentZone.cn}</span>
            </div>
          </>
        ) : (
          <div className={styles.acwrEmpty}>
            <div className={styles.acwrNumberMuted}>—</div>
            <div className={styles.acwrEmptyHint}>
              近 28 天心率数据不足<br />
              7d / 28d = {acwr.acute_days_with_data} / {acwr.chronic_days_with_data} 天
            </div>
          </div>
        )}
      </div>

      {/* 区间色带 (0-2.0) */}
      <div className={styles.zoneBarWrap}>
        <div className={styles.zoneBarLabel}>
          ACWR 风险区间 (0 - 2.0)
        </div>
        <div className={styles.zoneBar}>
          {ACWR_ZONES.map((z, i) => {
            const span = z.max === 99 ? 0.5 : (z.max - z.min);
            const widthPct = (span / ACWR_TOTAL_SPAN) * 100;
            return (
              <div
                key={i}
                className={styles.zoneBarSeg}
                style={{ backgroundColor: z.color, width: `${widthPct}%` }}
                title={`${z.label} (${z.min}-${z.max === 99 ? '∞' : z.max})`}
              />
            );
          })}
        </div>
        <div className={styles.zoneLabels}>
          {ACWR_ZONES.map((z, i) => {
            const span = z.max === 99 ? 0.5 : (z.max - z.min);
            const widthPct = (span / ACWR_TOTAL_SPAN) * 100;
            return (
              <span
                key={i}
                className={styles.zoneLabelItem}
                style={{ color: z.color, width: `${widthPct}%` }}
              >
                {z.min}-{z.max === 99 ? '∞' : z.max}
              </span>
            );
          })}
        </div>
        <div className={styles.zoneMarkerWrap}>
          {hasData && (
            <div
              className={styles.zoneMarker}
              style={{
                left: `${acwrPercent}%`,
                backgroundColor: currentZone.color,
              }}
              title={`ACWR = ${acwr.ratio!.toFixed(2)}`}
            />
          )}
        </div>
      </div>

      {/* 数据双行 (7d / 28d TRIMP) */}
      <div className={styles.acwrStats}>
        <div className={styles.acwrStatItem}>
          <div className={styles.acwrStatLabel}>7d acute</div>
          <div className={styles.acwrStatValue}>
            {Math.round(acwr.acute_7d_trimp).toLocaleString()}
            <span className={styles.acwrStatUnit}> TRIMP</span>
          </div>
          <div className={styles.acwrStatSub}>{acwr.acute_days_with_data} 天有数据</div>
        </div>
        <div className={styles.acwrStatItem}>
          <div className={styles.acwrStatLabel}>28d chronic</div>
          <div className={styles.acwrStatValue}>
            {Math.round(acwr.chronic_28d_trimp).toLocaleString()}
            <span className={styles.acwrStatUnit}> TRIMP</span>
          </div>
          <div className={styles.acwrStatSub}>{acwr.chronic_days_with_data} 天有数据</div>
        </div>
      </div>

      {/* 静态 AI 建议 (高亮显示) */}
      <div className={styles.aiGuidance}>
        <span className={styles.aiBadge}>🤖 训练建议</span>
        <p className={styles.aiText}>{advice}</p>
        {acwr.warning && (
          <p className={styles.aiWarning}>⚠ {acwr.warning}</p>
        )}
      </div>

      {/* Footer: 数据时间戳 */}
      <div className={styles.cardFooter}>
        训练负荷更新于 {new Date(generatedAt).toLocaleString('zh-CN', { hour12: false })}
      </div>
    </div>
  );
};

export default ACWRCard;
