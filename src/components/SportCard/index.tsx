// 运动卡片 - 第六阶段
// 运动感知指标：每个 sport 按 priorityMetrics 显示最相关的数据
// + CSS module 美化 UI + IntersectionObserver 进入视口渐入

import { Link } from 'react-router-dom';
import type { SportCompat } from '@/utils/sportCompat';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import styles from './style.module.css';

interface SportCardProps {
  sport: SportCompat;
  count: number;
  totalDistance: number;          // 米
  totalTime: number;              // 秒
  totalReps?: number;             // 总计数（跳绳次数/爬楼层数等），0/undefined=暂无
  totalElevation?: number;        // 米（海拔累计）
  avgPace?: number;               // 秒/公里（平均配速，0 = 无数据）
  totalFloors?: number;           // 楼层累计（爬楼专用）
  lastDate?: string;              // 最近一次活动日期 (ISO)
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

/** 配速格式化: 秒/公里 → "5:32" (无 /km 后缀, 由 caller 加) */
function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 海拔: 米 → 整数 + "m" 后缀 (imperial 模式在 const 里有 ELEV_UNIT, 这里先按米) */
function formatElevation(meters: number): string {
  if (!meters) return '0';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}k`;
  return Math.round(meters).toString();
}

// ===== 单个 metric 的渲染数据 =====

interface MetricRow {
  label: string;     // "距离" / "配速" / "时长" / "海拔" / "楼层"
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

  // 注意: 顺序按 priorityMetrics，不按下面的硬编码顺序
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

  const cardStyle: React.CSSProperties = {
    backgroundColor: locked ? 'rgba(40, 40, 40, 0.4)' : sport.colorBg,
    borderColor: locked ? 'rgba(148, 163, 184, 0.25)' : `${sport.color}33`,
    boxShadow: locked
      ? 'none'
      : `0 1px 0 ${sport.color}11 inset, 0 4px 16px -8px ${sport.color}22`,
    // 入场渐入
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 400ms ease, transform 400ms ease',
  };

  return (
    <Link
      ref={ref}
      to={locked ? '#' : href}
      onClick={(e) => {
        if (locked) e.preventDefault();
      }}
      className={`${styles.card} ${locked ? styles.cardLocked : styles.cardActive}`}
      style={cardStyle}
      onMouseEnter={(e) => {
        if (locked) return;
        e.currentTarget.style.borderColor = `${sport.color}88`;
        e.currentTarget.style.boxShadow = `0 1px 0 ${sport.color}22 inset, 0 12px 32px -8px ${sport.color}44`;
      }}
      onMouseLeave={(e) => {
        if (locked) return;
        e.currentTarget.style.borderColor = `${sport.color}33`;
        e.currentTarget.style.boxShadow = `0 1px 0 ${sport.color}11 inset, 0 4px 16px -8px ${sport.color}22`;
      }}
    >
      {/* Sport-color accent stripe */}
      <div className={styles.accent} style={{ backgroundColor: sport.color }} />

      {/* Header: emoji + label + count badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.emoji}>{sport.emoji}</span>
          <span className={styles.label} style={{ color: locked ? '#64748b' : sport.color }}>
            {sport.label}
          </span>
        </div>
        {locked ? (
          <span className={`${styles.badge} ${styles.badgeLocked}`}>未解锁</span>
        ) : (
          <span
            className={styles.badge}
            style={{ backgroundColor: `${sport.color}22`, color: sport.color }}
          >
            {count.toLocaleString()} 次
          </span>
        )}
      </div>

      {/* Metrics */}
      {primary && (
        <div className={styles.metrics}>
          <div className={styles.primary}>
            <span className={styles.primaryValue} style={{ color: locked ? '#475569' : sport.color }}>
              {primary.value}
            </span>
            {primary.unit && <span className={styles.primaryUnit}>{primary.unit}</span>}
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

      {/* Description / unlock prompt */}
      <p className={styles.desc}>
        {locked ? `解锁 ${sport.label}，开启你的「${sport.desc.split('，')[0]}」` : sport.desc}
      </p>

      {/* Last activity date */}
      {!locked && lastDate && (
        <div className={styles.meta}>{lastDate.slice(0, 10)}</div>
      )}
    </Link>
  );
}