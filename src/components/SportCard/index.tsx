// SportCard — 第九阶段 (Apple HIG 重设计 + sport-aware banner)
//
// 设计原则 (与 theme-apple.css 一致):
//   · 白底 + 1px hairline 边 + 16px 圆角 (Apple Card 标准)
//   · 顶部 2px sport-color 装饰条 (从 2px → hover 升至 3px)
//   · 主指标 sport-color 大字 + 副指标横排小字 + 30 天 sparkline
//   · sport-aware banner: 按 sport.key 自动切专属 metric pill
//     - Run      → 🏃 + 配速 + 心率
//     - Ride     → 🚴 + 平均速度 + 累计距离
//     - Hiking   → 🏔 + 累计爬升 + 累计距离
//     - Strength → 💪 + 时长 + 心率
//     - 兜底     → 📅 最近一次
//   · Locked 态：dashed border + 弱化内容
//   · 文字色用 --sport-color CSS 变量, 由调用方注入
//   · 所有 inline style 已抽到 style.module.css, 通过 CSS 变量传动态值
//
// 与 v2 区别:
//   - 删除 backdrop-filter (玻璃态)
//   - 删除 inline boxShadow / borderColor / background 渐变
//   - 主指标色改用 CSS 变量, 避免 hardcoded rgba
//   - 新增 sport-aware banner + 9 个内联样式清零

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
  avgHeartrate?: number; // bpm (活动加权平均)
  totalFloors?: number;
  lastDate?: string; // ISO
  sparkline?: number[]; // 30 天每日聚合
  avgSlope?: number; // 平均坡度 (%)，用于徒步 banner
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

function formatHeartrate(bpm: number | undefined): string {
  if (!bpm || bpm <= 0) return '—';
  return Math.round(bpm).toString();
}

function formatSpeed(secPerKm: number, unit: 'km' | 'mi' | 'm'): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  // secPerKm 是秒/公里；speed = 1000 / secPerKm = m/s
  const mPerSec = 1000 / secPerKm;
  // 转为 km/h (×3.6)
  const kmh = mPerSec * 3.6;
  if (unit === 'mi') {
    const mph = kmh * 0.621371;
    return `${mph.toFixed(1)}`;
  }
  return `${kmh.toFixed(1)}`;
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

// ===== Sport-aware banner =====

interface BannerSegment {
  label?: string;
  value: string;
}

interface SportBanner {
  emoji: string;
  segments: BannerSegment[]; // e.g. [{ value: "5'30\"" }, { label: '心率', value: '145 bpm' }]
}

/**
 * 按 sport.key 生成专属 banner 数据
 * 数据不足时降级显示兜底文案（最近一次）
 */
function buildSportBanner(
  sport: SportCompat,
  totalDistance: number,
  totalTime: number,
  totalElevation: number | undefined,
  avgPace: number | undefined,
  avgHeartrate: number | undefined,
  lastDate: string | undefined,
  avgSlope: number | undefined
): SportBanner | null {
  const distUnit = formatUnit(sport.unit);
  const segments: BannerSegment[] = [];

  switch (sport.key) {
    case 'Run': {
      // Apple HIG 风格: 跑步 = 配速 + 心率
      // 配速走 formatPace 输出 5'30"/km 格式
      const pace = formatPace(avgPace ?? 0);
      if (pace !== '—') {
        segments.push({ value: `配速 ${pace}/${distUnit === 'mi' ? 'mi' : 'km'}` });
      }
      const hr = formatHeartrate(avgHeartrate);
      if (hr !== '—') {
        segments.push({ label: '心率', value: `${hr} bpm` });
      }
      return { emoji: '🏃', segments };
    }

    case 'Ride': {
      const speed = formatSpeed(avgPace ?? 0, sport.unit);
      segments.push({
        label: '均速',
        value: `${speed} ${distUnit === 'mi' ? 'mph' : 'km/h'}`,
      });
      if (totalDistance > 0) {
        segments.push({
          label: '累计',
          value: `${formatDistance(totalDistance, sport.unit)} ${distUnit}`,
        });
      }
      return { emoji: '🚴', segments };
    }

    case 'Hiking': {
      const elev = formatElevation(totalElevation ?? 0);
      segments.push({ label: '爬升', value: `${elev} m` });
      if (totalDistance > 0) {
        segments.push({
          label: '累计',
          value: `${formatDistance(totalDistance, sport.unit)} ${distUnit}`,
        });
      }
      if (avgSlope && avgSlope > 0) {
        segments.push({ label: '坡度', value: `${avgSlope.toFixed(1)}%` });
      }
      return { emoji: '🏔', segments };
    }

    case 'Strength':
    case 'Workout': {
      segments.push({ label: '时长', value: formatTotalTime(totalTime) });
      const hr = formatHeartrate(avgHeartrate);
      if (hr !== '—') {
        segments.push({ label: '心率', value: `${hr} bpm` });
      }
      return { emoji: '💪', segments };
    }

    default: {
      // 兜底：最近一次
      if (lastDate) {
        return {
          emoji: '📅',
          segments: [{ label: '最近', value: lastDate.slice(0, 10) }],
        };
      }
      return null;
    }
  }
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
  avgHeartrate,
  totalFloors,
  lastDate,
  sparkline,
  avgSlope,
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

  const sportBanner = !locked
    ? buildSportBanner(
        sport,
        totalDistance,
        totalTime,
        totalElevation,
        avgPace,
        avgHeartrate,
        lastDate,
        avgSlope
      )
    : null;

  // 通过 CSS 变量将 sport color / bg 传给 CSS module
  // sport.color 是 hex（如 #5eb0ff），sport.colorBg 是已带 alpha 的 rgba
  // 这两个变量是 inline style 仅有的合理保留点（动态值注入）
  const rootStyle: React.CSSProperties = {
    ['--sport-color' as string]: sport.color,
    ['--sport-color-bg' as string]: sport.colorBg,
  };

  return (
    <Link
      ref={ref}
      to={locked ? '#' : href}
      onClick={(e) => {
        if (locked) e.preventDefault();
      }}
      className={`${styles.card} ${locked ? styles.cardLocked : styles.cardActive} ${isVisible ? styles.cardVisible : styles.cardHidden}`}
      style={rootStyle}
    >
      {/* Sport-color 顶部装饰条 — CSS module ::before + .accent 双重渲染 */}
      <div className={styles.accent} />

      {/* Header: SVG sport icon + label + count badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.emoji}>
            <SportIcon iconName={sport.iconName} size={20} />
          </span>
          <span className={styles.label}>{sport.label}</span>
        </div>
        {locked ? (
          <span className={`${styles.badge} ${styles.badgeLocked}`}>
            <svg width="10" height="10" viewBox="0 0 10 10">
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
          <span className={styles.badge}>
            {count.toLocaleString()} 次
          </span>
        )}
      </div>

      {/* Sport-aware banner — 按 sport.key 自动切专属 metric */}
      {sportBanner && (
        <div className={styles.sportBanner}>
          <span className={styles.sportBannerEmoji} aria-hidden="true">
            {sportBanner.emoji}
          </span>
          <span className={styles.sportBannerText}>
            {sportBanner.segments
              .map((seg) =>
                seg.label ? `${seg.label} ${seg.value}` : seg.value
              )
              .join(' · ')}
          </span>
        </div>
      )}

      {/* Metrics */}
      {primary && (
        <div className={styles.metrics}>
          <div className={styles.primary}>
            <span className={styles.primaryValue}>{primary.value}</span>
            {primary.unit && (
              <span className={styles.primaryUnit}>{primary.unit}</span>
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