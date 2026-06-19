/**
 * v2.3.1 — 训练建议列表卡片
 *
 * 数据源: training_advice.json (rule-based, v2.2.9)
 * - advice_items[] 每条有 id/category/severity/title/description/action/evidence
 * - severity: info (蓝) / low (黄) / high (红)
 * - category: data / load / intensity / recovery / cadence / other
 */
import React from 'react';
import type { TrainingAdvice, AdviceItem, AdviceSeverity } from './types';
import styles from './style.module.css';

interface Props {
  advice: TrainingAdvice;
}

const SEVERITY_CONFIG: Record<AdviceSeverity, { label: string; color: string; icon: string; bg: string }> = {
  info: { label: '提示', color: '#3b82f6', icon: 'ℹ', bg: 'rgba(59, 130, 246, 0.06)' },
  low:  { label: '关注', color: '#f59e0b', icon: '⚠', bg: 'rgba(245, 158, 11, 0.06)' },
  high: { label: '紧急', color: '#ef4444', icon: '✕', bg: 'rgba(239, 68, 68, 0.06)' },
};

const CATEGORY_LABEL: Record<string, string> = {
  data: '数据',
  load: '负荷',
  intensity: '强度',
  recovery: '恢复',
  cadence: '步频',
  other: '其他',
};

const AdviceListCard: React.FC<Props> = ({ advice }) => {
  const items = advice.advice_items || [];
  const hasItems = items.length > 0;

  return (
    <div
      className={`${styles.card} ${styles.adviceCard}`}
      role="region"
      aria-label="训练建议"
    >
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardKicker}>Rule-Based 0 LLM</div>
          <h3 className={styles.cardTitle}>训练建议</h3>
        </div>
        <span className={styles.adviceCount}>
          {advice.advice_count} 条
        </span>
      </div>

      {/* 总览摘要 */}
      <div className={styles.adviceSummary}>
        <span className={styles.adviceSummaryIcon}>
          {advice.overall_status === 'good' ? '✓' : advice.overall_status === 'urgent' ? '✕' : '⚠'}
        </span>
        <span className={styles.adviceSummaryText}>
          {advice.overall_summary}
        </span>
      </div>

      {/* 建议列表 */}
      {hasItems ? (
        <ul className={styles.adviceList}>
          {items.map((item) => {
            const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
            return (
              <li
                key={item.id}
                className={styles.adviceItem}
                style={{ backgroundColor: cfg.bg, borderLeftColor: cfg.color }}
              >
                <div className={styles.adviceItemHeader}>
                  <span
                    className={styles.adviceItemBadge}
                    style={{ backgroundColor: cfg.color }}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className={styles.adviceItemCategory}>
                    {CATEGORY_LABEL[item.category] || item.category}
                  </span>
                </div>
                <h4 className={styles.adviceItemTitle}>{item.title}</h4>
                <p className={styles.adviceItemDesc}>{item.description}</p>
                <div className={styles.adviceItemAction}>
                  <span className={styles.adviceItemActionLabel}>建议:</span> {item.action}
                </div>
                {item.evidence && (
                  <div className={styles.adviceItemEvidence}>
                    <span className={styles.adviceItemEvidenceLabel}>依据:</span> {item.evidence}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.adviceEmpty}>
          <div className={styles.adviceEmptyIcon}>✨</div>
          <div className={styles.adviceEmptyTitle}>暂无建议</div>
          <div className={styles.adviceEmptyHint}>
            数据完整时这里会显示基于规则的训练建议
          </div>
        </div>
      )}

      <div className={styles.cardFooter}>
        {advice.method} · {advice.source}
      </div>
    </div>
  );
};

export default AdviceListCard;
