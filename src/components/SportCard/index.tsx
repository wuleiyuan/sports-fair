// 运动卡片 - 第七阶段（Apple Fitness Premium）
// 改造点：
//   1. 玻璃质感（backdrop-filter + 半透明白底 + sport-color glow）
//   2. 顶部 mini-sparkline（30 天趋势）
//   3. Locked 态：虚线边框 + 弱化内容（不再灰度去色）
//   4. 主指标用 sport.color 大字，副指标横排小字

import { Link } from 'react-router-dom';
import type { SportCompat } from '@/utils/sportCompat';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import Sparkline from './Sparkline';
import styles from './style.module.css';

interface SportCardProps {
  sport: SportCompat;
  count: number;
  totalDistance: number;          // 米
  totalTime: number;              // 秒
  totalReps?: number;
  totalElevation?: number;
  avgPace?: number;               // 秒/公里
  totalFloors?: number;
  lastDate?: string;              // ISO
  sparkline?: number[];           // 30 天每日聚合
  href: string;
}

// ===== 格式化工具 =====

function formatTotalTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number, unit: 'km' | 'mi' | 'm'): string {
  if (!meters) return '0';
  if (unit === 'm') return Math.round(meters).toString();
  if (unit === 'mi') return (meters / 1609.344).toFixed(1);
  return (meters / 1000).toFixed(1);
}

function formatUnit(unit: 'km' | 'mi' | 'm'): string {
  if (unit === 'm') return 'm';
  if (unit === 'mi') return 'mi';
  return 'km';
}

function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatElevation(meters: number): string {
  if (!meters) return '0';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}k`;
  return Math.round(meters).toString();
}

// ===== Metric =====

interface MetricRow {
  label: string;
  value: string;
  unit: string;
}

function buildMetricRows(
  sport: SportCompat,
  totalDistance: number,
  totalTime: number,
  totalReps: number | undefined,
  totalElevation: number | undefined,
  avgPace: number | undefined,
  totalFloors: number | undefined
): MetricRow[] {
  const distUnit = formatUnit(sport.unit);
  const rows: MetricRow[] = [];

  const pushIfPresent = (
    metric: 'pace' | 'distance' | 'duration' | 'elevation' | 'floors' | 'reps',
    row: MetricRow
  ) => {
    if (!sport.priorityMetrics.includes(metric)) return;
    if (row.value === '0' || row.value === '0m' || row.value === '—') return;
    rows.push(row);
  };

  if (sport.priorityMetrics.includes('distance')) {
    pushIfPresent('distance', {
      label: '距离',
      value: formatDistance(totalDistance, sport.unit),
      unit: distUnit,
    });
  }
  if (sport.priorityMetrics.includes('duration')) {
    pushIfPresent('duration', {
      label: '时长',
      value: formatTotalTime(totalTime),
      unit: '',
    });
  }
  if (sport.priorityMetrics.includes('pace')) {
    pushIfPresent('pace', {
      label: '配速',
      value: formatPace(avgPace ?? 0),
      unit: '/km',
    });
  }
  if (sport.priorityMetrics.includes('elevation')) {
    pushIfPresent('elevation', {
      label: '海拔',
      value: formatElevation(totalElevation ?? 0),
      unit: 'm',
    });
  }
  if (sport.priorityMetrics.includes('floors')) {
    pushIfPresent('floors', {
      label: '楼层',
      value: (totalFloors ?? 0).toLocaleString(),
      unit: '层',
    });
  }
  if (sport.priorityMetrics.includes('reps')) {
    pushIfPresent('reps', {
      label: '次数',
      value: (totalReps ?? 0).toLocaleString(),
      unit: sport.unitLabel,
    });
  }

  return rows;
}

// ===== 主组件 =====

export default function SportCard({
  sport,
  count,
  totalDistance,
  totalTime,
  totalReps,
  totalElevation,
  avgPace,
  totalFloors,
  lastDate,
  sparkline,
  href,
}: SportCardProps) {
  const locked = count === 0;
  const metricRows = buildMetricRows(
    sport,
    totalDistance,
    totalTime,
    totalReps,
    totalElevation,
    avgPace,
    totalFloors
  );

  const [primary, ...secondary] = metricRows;

  const [ref, isVisible] = useIntersectionObserver<HTMLAnchorElement>({
    rootMargin: '100px',
    threshold: 0.05,
    once: true,
  });

  // 玻璃质感背景：sport.color tint 渐变 + 半透明白底
  const cardStyle: React.CSSProperties = locked
    ? {
        background: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderStyle: 'dashed',
      }
    : {
        background: `linear-gradient(135deg, ${sport.colorBg} 0%, rgba(255, 255, 255, 0.04) 60%, transparent 100%)`,
        borderColor: `${sport.color}40`,
        boxShadow: `0 1px 0 ${sport.color}1a inset, 0 4px 16px -8px ${sport.color}55, 0 0 0 1px rgba(255, 255, 255, 0.03)`,
      };

  return (
    <Link
      ref={ref}
      to={locked ? '#' : href}
      onClick={(e) => {
        if (locked) e.preventDefault();
      }}
      className={`${styles.card} ${locked ? styles.cardLocked : styles.cardActive}`}
      style={{
        ...cardStyle,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 400ms ease, transform 400ms ease, box-shadow 280ms ease, border-color 280ms ease',
      }}
      onMouseEnter={(e) => {
        if (locked) return;
        e.currentTarget.style.borderColor = `${sport.color}90`;
        e.currentTarget.style.boxShadow = `0 1px 0 ${sport.color}33 inset, 0 12px 32px -8px ${sport.color}80, 0 0 0 1px rgba(255, 255, 255, 0.06)`;
      }}
      onMouseLeave={(e) => {
        if (locked) return;
        e.currentTarget.style.borderColor = `${sport.color}40`;
        e.currentTarget.style.boxShadow = `0 1px 0 ${sport.color}1a inset, 0 4px 16px -8px ${sport.color}55, 0 0 0 1px rgba(255, 255, 255, 0.03)`;
      }}
    >
      {/* Sport-color 顶部装饰条 */}
      <div
        className={styles.accent}
        style={{
          background: locked
            ? 'transparent'
            : `linear-gradient(90deg, ${sport.color} 0%, ${sport.color}80 100%)`,
        }}
      />

      {/* Header: emoji + label + count badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.emoji}>{sport.emoji}</span>
          <span
            className={styles.label}
            style={{ color: locked ? 'rgba(255, 255, 255, 0.5)' : sport.color }}
          >
            {sport.label}
          </span>
        </div>
        {locked ? (
          <span className={`${styles.badge} ${styles.badgeLocked}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginRight: 4, verticalAlign: 'middle' }}>
              <rect x="2" y="4.5" width="6" height="4.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/>
              <path d="M3 4.5 V3 a2 2 0 0 1 4 0 V4.5" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
            未解锁
          </span>
        ) : (
          <span
            className={styles.badge}
            style={{
              backgroundColor: `${sport.color}26`,
              color: sport.color,
              borderColor: `${sport.color}55`,
            }}
          >
            {count.toLocaleString()} 次
          </span>
        )}
      </div>

      {/* Metrics */}
      {primary && (
        <div className={styles.metrics}>
          <div className={styles.primary}>
            <span
              className={styles.primaryValue}
              style={{ color: locked ? 'rgba(255, 255, 255, 0.5)' : sport.color }}
            >
              {primary.value}
            </span>
            {primary.unit && (
              <span className={styles.primaryUnit} style={{ color: locked ? 'rgba(255, 255, 255, 0.4)' : sport.color }}>
                {primary.unit}
              </span>
            )}
          </div>
          {secondary.length > 0 && (
            <div className={styles.secondary}>
              {secondary.map((row, i) => (
                <span key={i} className={styles.secondaryItem}>
                  <span className={styles.secondaryLabel}>{row.label}</span>
                  <span className={styles.secondaryValue}>{row.value}</span>
                  {row.unit && <span className={styles.secondaryLabel}>{row.unit}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sparkline - 仅未解锁不渲染；空数据会自绘虚线占位 */}
      {!locked && (
        <div className={styles.sparkline}>
          <Sparkline
            values={sparkline ?? []}
            color={sport.color}
            unit={formatUnit(sport.unit)}
            height={32}
            width={120}
          />
          <span className={styles.sparklineLabel}>30 天趋势</span>
        </div>
      )}

      {/* Description */}
      <p className={styles.desc}>
        {locked
          ? `解锁 ${sport.label}，开启你的「${sport.desc.split('，')[0]}」`
          : sport.desc}
      </p>

      {/* Meta */}
      {!locked && lastDate && (
        <div className={styles.meta}>
          <span className={styles.metaDot} />
          <span>{lastDate.slice(0, 10)}</span>
        </div>
      )}
    </Link>
  );
}