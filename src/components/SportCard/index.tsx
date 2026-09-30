// SportCard — 第八阶段 (Apple HIG 重设计)
//
// 设计原则 (与 theme-apple.css 一致):
//   · 白底 + 1px hairline 边 + 16px 圆角 (Apple Card 标准)
//   · 顶部 2px sport-color 装饰条 (从 2px → hover 升至 3px)
//   · 主指标 sport-color 大字 + 副指标横排小字 + 30 天 sparkline
//   · Locked 态：dashed border + 弱化内容
//   · 文字色用 --sport-color CSS 变量, 由调用方注入
//
// 与 v2 区别:
//   - 删除 backdrop-filter (玻璃态)
//   - 删除 inline boxShadow / borderColor / background 渐变
//   - 主指标色改用 CSS 变量, 避免 hardcoded rgba

import React from 'react';
import { Link } from 'react-router-dom';
import type { SportCompat } from '@/utils/sportCompat';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import SportIcon from '@/components/SportIcon';
import Sparkline from './Sparkline';
import styles from './style.module.css';

interface SportCardProps {
  sport: SportCompat;
  count: number;
  totalDistance: number; // 米
  totalTime: number; // 秒
  totalReps?: number;
  totalElevation?: number;
  avgPace?: number; // 秒/公里
  totalFloors?: number;
  lastDate?: string; // ISO
  sparkline?: number[]; // 30 天每日聚合
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

  // 通过 CSS 变量将 sport color 传给 CSS module, 避免 inline 颜色硬编码
  const rootStyle: React.CSSProperties = {
    ['--sport-color' as string]: sport.color,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
    transition:
      'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <Link
      ref={ref}
      to={locked ? '#' : href}
      onClick={(e) => {
        if (locked) e.preventDefault();
      }}
      className={`${styles.card} ${locked ? styles.cardLocked : styles.cardActive}`}
      style={rootStyle}
    >
      {/* Sport-color 顶部装饰条 — 由 CSS module ::before 控制 2px → 3px hover 动画 */}
      <div
        className={styles.accent}
        style={{
          background: locked
            ? 'transparent'
            : `linear-gradient(90deg, ${sport.color} 0%, ${sport.color}80 100%)`,
        }}
      />

      {/* Header: SVG sport icon + label + count badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span
            className={styles.emoji}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: locked
                ? 'var(--color-secondary, rgba(60,60,67,0.45))'
                : sport.color,
            }}
          >
            <SportIcon iconName={sport.iconName} size={20} />
          </span>
          <span
            className={styles.label}
            style={{
              color: locked
                ? 'var(--color-secondary, rgba(60,60,67,0.45))'
                : sport.color,
            }}
          >
            {sport.label}
          </span>
        </div>
        {locked ? (
          <span className={`${styles.badge} ${styles.badgeLocked}`}>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              style={{ marginRight: 4, verticalAlign: 'middle' }}
            >
              <rect
                x="2"
                y="4.5"
                width="6"
                height="4.5"
                rx="1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M3 4.5 V3 a2 2 0 0 1 4 0 V4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            未解锁
          </span>
        ) : (
          <span
            className={styles.badge}
            style={{
              backgroundColor: `${sport.color}14`,
              color: sport.color,
              borderColor: 'transparent',
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
              style={{
                color: locked
                  ? 'var(--color-secondary, rgba(60,60,67,0.45))'
                  : sport.color,
              }}
            >
              {primary.value}
            </span>
            {primary.unit && (
              <span
                className={styles.primaryUnit}
                style={{
                  color: locked
                    ? 'var(--color-secondary, rgba(60,60,67,0.45))'
                    : 'var(--color-secondary, rgba(60,60,67,0.6))',
                }}
              >
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
                  {row.unit && (
                    <span className={styles.secondaryLabel}>{row.unit}</span>
                  )}
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
