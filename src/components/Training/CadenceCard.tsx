/**
 * v2.3.1 — 步频 (Cadence) 占位卡
 *
 * 当前 training_load.json.cadence = null（activities.json 无此字段）
 * v2.3.2 计划在 3 个 sync 源 (keep_sync / apple_health / gpx_sync) 加 cadence 字段
 *
 * 设计: 不假装有数据。明确告诉用户"等 v2.3.2"，跟 §6 "不骗不藏" 偏好一致。
 */
import React from 'react';
import styles from './style.module.css';

interface Props {
  cadence: number | null;
  note: string;
  activityCount?: number;
}

const CadenceCard: React.FC<Props> = ({ cadence, note, activityCount = 0 }) => {
  const hasData = cadence !== null && cadence > 0;

  // 步频评估 (spm = steps per minute)
  // 跑步步频 < 170 风险 / 目标 175-180 spm / > 190 短步高频
  const evalCadence = (spm: number): { text: string; color: string; hint: string } => {
    if (spm < 165) return { text: '步频偏低', color: '#ef4444', hint: '风险：垂直振幅大、冲击高' };
    if (spm < 175) return { text: '可提升', color: '#f59e0b', hint: '目标 175+ spm' };
    if (spm < 185) return { text: '✓ 理想', color: '#22c55e', hint: '经济性最佳区间' };
    return { text: '偏高', color: '#3b82f6', hint: '可能步幅过小' };
  };

  return (
    <div
      className={`${styles.card} ${styles.cadenceCard}`}
      role="region"
      aria-label="步频"
    >
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardKicker}>Cadence · spm</div>
          <h3 className={styles.cardTitle}>跑步步频</h3>
        </div>
        <span className={styles.cadenceBadge}>
          v2.3.2
        </span>
      </div>

      {hasData ? (
        <>
          <div className={styles.cadenceMain}>
            <div
              className={styles.cadenceNumber}
              style={{ color: evalCadence(cadence!).color }}
            >
              {cadence!.toFixed(0)}
              <span className={styles.cadenceUnit}>spm</span>
            </div>
            <div className={styles.cadenceLabel}>
              {evalCadence(cadence!).text}
              <span className={styles.cadenceHint}>{evalCadence(cadence!).hint}</span>
            </div>
          </div>
          <div className={styles.cadenceStats}>
            基于 {activityCount} 个有 cadence 数据的活动
          </div>
        </>
      ) : (
        <div className={styles.cadenceEmpty}>
          <div className={styles.cadenceEmptyIcon}>🦶</div>
          <div className={styles.cadenceEmptyTitle}>步频数据待接入</div>
          <div className={styles.cadenceEmptyHint}>
            {note}
          </div>
          <div className={styles.cadenceEmptyRoadmap}>
            <strong>v2.3.2 计划</strong>：在 3 个 sync 源加 cadence 字段<br />
            • <code>keep_sync.py</code> — Keep API 不返回 → 写 None<br />
            • <code>apple_health_sync.py</code> — 读 AW HAE JSON <code>RunningCadence</code><br />
            • <code>gpx_sync.py</code> — 从 trackpoint &lt;extensions&gt; 提取
          </div>
        </div>
      )}

      <div className={styles.cardFooter}>
        目标: 175-180 spm · 长期 &lt; 170 需注意
      </div>
    </div>
  );
};

export default CadenceCard;
