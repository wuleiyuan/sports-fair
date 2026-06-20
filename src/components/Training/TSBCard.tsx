import React from 'react';
import {
  type TSBResult,
  TSB_STATUS_LABEL,
  tsbStatusAdvice,
} from './types';
import styles from './style.module.css';

interface Props {
  tsb: TSBResult;
  generatedAt: string;
}

const TSB_LOW = -30;
const TSB_HIGH = 30;

const TSBCard: React.FC<Props> = ({ tsb, generatedAt }) => {
  const hasData = tsb.tsb !== null && !isNaN(tsb.tsb);
  const badge = TSB_STATUS_LABEL[tsb.status] || TSB_STATUS_LABEL.unknown;
  const advice = tsbStatusAdvice(hasData ? tsb.tsb : null);

  const tsbClamped = Math.max(TSB_LOW, Math.min(TSB_HIGH, tsb.tsb));
  const tsbPercent = ((tsbClamped - TSB_LOW) / (TSB_HIGH - TSB_LOW)) * 100;

  return (
    <div className={`${styles.card} ${styles.tsbCard}`} role="region" aria-label="TSB 训练状态">
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardKicker}>Coggan · CTL 42d / ATL 7d</div>
          <h3 className={styles.cardTitle}>TSB 训练状态</h3>
        </div>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: badge.color }}
          title={tsb.status}
        >
          {badge.text}
        </span>
      </div>

      {/* 主数字 */}
      <div className={styles.tsbMain}>
        {hasData ? (
          <>
            <div
              className={styles.tsbNumber}
              style={{ color: badge.color }}
            >
              {tsb.tsb > 0 ? '+' : ''}{tsb.tsb.toFixed(1)}
            </div>
            <div className={styles.tsbLabel}>
              <span>TSB</span>
              <span className={styles.tsbUnit}>= CTL − ATL</span>
            </div>
          </>
        ) : (
          <div className={styles.tsbEmpty}>
            <div className={styles.tsbNumberMuted}>—</div>
            <div className={styles.tsbEmptyHint}>
              数据不足以计算训练状态
            </div>
          </div>
        )}
      </div>

      {/* TSB 标尺 */}
      <div className={styles.tsbScaleWrap}>
        <div className={styles.tsbScaleLabel}>疲劳 ← 训练状态 → 恢复</div>
        <div className={styles.tsbScale}>
          <div className={styles.tsbScaleSeg} style={{ flex: 3, backgroundColor: '#ef4444' }} />
          <div className={styles.tsbScaleSeg} style={{ flex: 2, backgroundColor: '#f97316' }} />
          <div className={styles.tsbScaleSeg} style={{ flex: 4, backgroundColor: '#6366f1' }} />
          <div className={styles.tsbScaleSeg} style={{ flex: 2, backgroundColor: '#22c55e' }} />
          <div className={styles.tsbScaleSeg} style={{ flex: 4, backgroundColor: '#22c55e' }} />
        </div>
        <div className={styles.tsbScaleLabels}>
          <span style={{ color: '#ef4444' }}>-30</span>
          <span style={{ color: '#f97316' }}>-15</span>
          <span style={{ color: '#6366f1' }}>-5</span>
          <span style={{ color: '#22c55e' }}>15</span>
          <span style={{ color: '#22c55e' }}>30</span>
        </div>
        <div className={styles.tsbScaleMarkerWrap}>
          {hasData && (
            <div
              className={styles.tsbScaleMarker}
              style={{
                left: `${tsbPercent}%`,
                backgroundColor: badge.color,
              }}
              title={`TSB = ${tsb.tsb.toFixed(1)}`}
            />
          )}
        </div>
      </div>

      {/* CTL / ATL 双列数据 */}
      <div className={styles.tsbStats}>
        <div className={styles.tsbStatItem}>
          <div className={styles.tsbStatLabel}>CTL 体能</div>
          <div className={styles.tsbStatValue}>
            {tsb.ctl.toFixed(1)}
            <span className={styles.tsbStatUnit}> TRIMP/d</span>
          </div>
          <div className={styles.tsbStatSub}>42d 指数平均</div>
        </div>
        <div className={styles.tsbStatItem}>
          <div className={styles.tsbStatLabel}>ATL 疲劳</div>
          <div className={styles.tsbStatValue}>
            {tsb.atl.toFixed(1)}
            <span className={styles.tsbStatUnit}> TRIMP/d</span>
          </div>
          <div className={styles.tsbStatSub}>7d 指数平均</div>
        </div>
      </div>

      {/* 静态 AI 建议 */}
      <div className={styles.aiGuidance}>
        <span className={styles.aiBadge}>💪 训练状态</span>
        <p className={styles.aiText}>{advice}</p>
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        TSB 更新于 {new Date(generatedAt).toLocaleString('zh-CN', { hour12: false })}
      </div>
    </div>
  );
};

export default TSBCard;
