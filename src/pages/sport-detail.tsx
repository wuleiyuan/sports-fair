// 单运动类型详情页 - 中等改造第四阶段 + Sport-aware 头部
// 时间范围筛选 + 趋势图 + 完整活动列表（心率/海拔/源）
// 2026-09-28: 重构 sport-aware header（按 sport.key 切换 headline 主指标）+ 0 inline styles

import { CSSProperties, FC, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import SportIcon from '@/components/SportIcon';
import PersonalBests from '@/components/PB';
import RoutePreview from '@/components/RoutePreview';
import {
  IconBolt,
  IconClock,
  IconGauge,
  IconHeart,
  IconMountain,
  IconRuler,
  IconSportRide,
  IconSportRun,
  IconSportStrength,
  IconCalendar,
} from '@/components/Icons';
import { SPORT_BY_KEY, normalizeSportType } from '@/utils/sportTypes';
import { convertMovingTime2Sec } from '@/utils/utils';
import activities from '@/static/activities.json';
import { Activity } from '@/utils/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import styles from './sport-detail.module.css';

type TimeRange = '7' | '30' | '90' | '365' | 'all';

const TIME_RANGES: { key: TimeRange; label: string; days: number | null }[] = [
  { key: '7', label: '7 天', days: 7 },
  { key: '30', label: '30 天', days: 30 },
  { key: '90', label: '90 天', days: 90 },
  { key: '365', label: '1 年', days: 365 },
  { key: 'all', label: '全部', days: null },
];

const PAGE_SIZE = 20;

/** Sport-aware 头部主指标 — 不同运动类型切换 headline */
type IconComponent = FC<{
  size?: number;
  color?: string;
  className?: string;
}>;
interface HeadlineMetric {
  Icon: IconComponent;
  label: string;
  value: string;
  unit: string;
  sub?: string;
}

const SportDetail = () => {
  const { key } = useParams<{ key: string }>();
  const sport = key ? SPORT_BY_KEY[key] : null;
  const [range, setRange] = useState<TimeRange>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 该运动类型的所有活动
  const allSportActivities = useMemo(() => {
    if (!sport) return [];
    return activities
      .filter(
        (act: Activity) => normalizeSportType(act.type, act.name) === sport.key
      )
      .sort((a: Activity, b: Activity) => {
        const da = a.start_date_local || a.start_date || '';
        const db = b.start_date_local || b.start_date || '';
        return db.localeCompare(da);
      });
  }, [sport]);

  // 时间范围筛选
  const sportActivities = useMemo(() => {
    const days = TIME_RANGES.find((r) => r.key === range)?.days;
    if (!days) return allSportActivities;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return allSportActivities.filter((a) => {
      const dateStr = a.start_date_local || a.start_date;
      if (!dateStr) return false;
      return new Date(dateStr) >= cutoff;
    });
  }, [allSportActivities, range]);

  // 通用统计
  const stats = useMemo(() => {
    if (sportActivities.length === 0) {
      return {
        count: 0,
        totalDist: 0,
        totalTime: 0,
        avgDist: 0,
        avgPace: '',
        avgHR: null,
        totalElev: 0,
        avgSpeedKmh: 0,
        avgGrade: 0,
      };
    }
    const totalDist = sportActivities.reduce(
      (s: number, a: Activity) => s + (a.distance || 0),
      0
    );
    const totalTime = sportActivities.reduce(
      (s: number, a: Activity) =>
        s + convertMovingTime2Sec((a.moving_time as string) || '0'),
      0
    );
    const avgDist = totalDist / sportActivities.length;
    const avgDistKm = avgDist / 1000;
    const avgTimeMin = totalTime / sportActivities.length / 60;
    const avgPace =
      avgDistKm > 0 ? `${(avgTimeMin / avgDistKm).toFixed(2)} /km` : '—';

    const validHR = sportActivities
      .map((a) => a.average_heartrate)
      .filter((hr): hr is number => typeof hr === 'number' && hr > 0);
    const avgHR =
      validHR.length > 0
        ? Math.round(validHR.reduce((s, v) => s + v, 0) / validHR.length)
        : null;

    const totalElev = sportActivities.reduce(
      (s: number, a: Activity) => s + ((a.elevation_gain as number) || 0),
      0
    );

    // 平均速度（m/s → km/h），用于骑行头部
    const validSpeed = sportActivities
      .map((a) => a.average_speed)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const avgSpeedKmh =
      validSpeed.length > 0
        ? (validSpeed.reduce((s, v) => s + v, 0) / validSpeed.length) * 3.6
        : 0;

    // 平均坡度 (%) — elevation_gain / distance * 100，仅 hiking 显示
    const avgGrade =
      totalDist > 0
        ? (totalElev / sportActivities.length / totalDist) * 100
        : 0;

    // 平均功率 (W) — 仅骑行需要；优先取 activity.average_watts，否则 0
    const validWatts = sportActivities
      .map((a) => a.average_watts)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const avgWatts =
      validWatts.length > 0
        ? Math.round(validWatts.reduce((s, v) => s + v, 0) / validWatts.length)
        : 0;

    // 平均坡度 (%) — 优先取 activity.slope（外部源如 Strava 已计算），否则回落到 avgGrade
    const validSlope = sportActivities
      .map((a) => a.slope)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const avgSlope =
      validSlope.length > 0
        ? validSlope.reduce((s, v) => s + v, 0) / validSlope.length
        : avgGrade;

    // 平均最大心率 (bpm) — 仅在有 max_heartrate 时显示
    const validMaxHR = sportActivities
      .map((a) => a.max_heartrate)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const avgMaxHR =
      validMaxHR.length > 0
        ? Math.round(validMaxHR.reduce((s, v) => s + v, 0) / validMaxHR.length)
        : 0;

    return {
      count: sportActivities.length,
      totalDist,
      totalTime,
      avgDist: avgDistKm,
      avgPace,
      avgHR,
      totalElev,
      avgSpeedKmh,
      avgGrade,
      avgWatts,
      avgSlope,
      avgMaxHR,
    };
  }, [sportActivities]);

  // ===== Sport-aware 头部主指标（按 sport.key 切换） =====
  const headline = useMemo<HeadlineMetric | null>(() => {
    if (!sport || sportActivities.length === 0) return null;

    switch (sport.key) {
      case 'Run': {
        // 最佳配速（最快 min/km）
        const paces = sportActivities
          .map((a) => {
            const distKm = (a.distance || 0) / 1000;
            return distKm > 0
              ? convertMovingTime2Sec((a.moving_time as string) || '0') /
                  60 /
                  distKm
              : 0;
          })
          .filter((p) => p > 0);
        if (paces.length === 0) return null;
        const best = Math.min(...paces);
        const m = Math.floor(best);
        const s = Math.round(best - m * 60);
        const avgDistKm = (stats.totalDist / 1000).toFixed(1);
        return {
          Icon: IconSportRun,
          label: '最佳配速',
          value: `${m}:${s.toString().padStart(2, '0')}`,
          unit: 'min/km',
          sub: `共 ${sportActivities.length} 次 · 累计 ${avgDistKm} km`,
        };
      }

      case 'Ride': {
        // 优先用功率（average_watts）；没有则回落平均速度
        if (stats.avgWatts > 0) {
          return {
            Icon: IconSportRide,
            label: '平均功率',
            value: `${stats.avgWatts}`,
            unit: 'W',
            sub: `${sportActivities.length} 次骑行 · 配速 ${
              stats.avgPace || '—'
            }${stats.avgHR ? ` · 心率 ${stats.avgHR} bpm` : ''}`,
          };
        }
        if (!stats.avgSpeedKmh) return null;
        return {
          Icon: IconSportRide,
          label: '平均速度',
          value: stats.avgSpeedKmh.toFixed(1),
          unit: 'km/h',
          sub: `${sportActivities.length} 次骑行 · 平均配速 ${
            stats.avgPace || '—'
          }${stats.avgHR ? ` · 心率 ${stats.avgHR} bpm` : ''}`,
        };
      }

      case 'Hiking': {
        // 累计爬升（米）
        if (!stats.totalElev) return null;
        const avgElev = Math.round(stats.totalElev / sportActivities.length);
        const maxElev = sportActivities.reduce((m: number, a: Activity) => {
          const e = (a.elevation_gain as number) || 0;
          return e > m ? e : m;
        }, 0);
        return {
          Icon: IconMountain,
          label: '累计爬升',
          value: Math.round(stats.totalElev).toLocaleString(),
          unit: 'm',
          sub: `最高 ${maxElev} m · 平均 ${avgElev} m/次`,
        };
      }

      case 'Strength':
      case 'Workout': {
        // 总训练时长
        const totalMin = Math.round(stats.totalTime / 60);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return {
          Icon: IconSportStrength,
          label: '总训练时长',
          value: h > 0 ? `${h}h ${m}m` : `${m}m`,
          unit: '',
          sub: stats.avgHR
            ? `平均心率 ${stats.avgHR} bpm`
            : `${sportActivities.length} 次训练`,
        };
      }

      default: {
        // 兜底：用 priorityMetrics 第一项
        const primary = sport.priorityMetrics[0];
        if (primary === 'pace' && stats.avgPace) {
          return {
            Icon: IconSportRun,
            label: '平均配速',
            value: stats.avgPace.split(' ')[0],
            unit: '/km',
            sub: `${sportActivities.length} 次`,
          };
        }
        if (primary === 'elevation' && stats.totalElev) {
          return {
            Icon: IconMountain,
            label: '总海拔',
            value: Math.round(stats.totalElev).toLocaleString(),
            unit: 'm',
            sub: `${sportActivities.length} 次`,
          };
        }
        if (primary === 'duration') {
          const totalMin = Math.round(stats.totalTime / 60);
          const h = Math.floor(totalMin / 60);
          const m = totalMin % 60;
          return {
            Icon: IconClock,
            label: '总时长',
            value: h > 0 ? `${h}h ${m}m` : `${m}m`,
            unit: '',
            sub: `${sportActivities.length} 次`,
          };
        }
        // 距离兜底
        return {
          Icon: IconRuler,
          label: '总距离',
          value: (stats.totalDist / 1000).toFixed(1),
          unit: 'km',
          sub: `${sportActivities.length} 次`,
        };
      }
    }
  }, [sport, sportActivities, stats]);

  // ===== Sport-aware 副指标（3 个 pill） =====
  const submetrics = useMemo(() => {
    if (!sport || sportActivities.length === 0) return [];
    const items: {
      Icon: IconComponent;
      label: string;
      value: string;
    }[] = [];

    const push = (Icon: IconComponent, label: string, value: string) => {
      if (value && value !== '—') items.push({ Icon, label, value });
    };

    if (sport.key === 'Run') {
      push(IconHeart, '平均心率', stats.avgHR ? `${stats.avgHR} bpm` : '');
      push(IconRuler, '总距离', `${(stats.totalDist / 1000).toFixed(1)} km`);
      push(IconClock, '总时长', formatTimeShort(stats.totalTime));
    } else if (sport.key === 'Ride') {
      push(IconHeart, '平均心率', stats.avgHR ? `${stats.avgHR} bpm` : '');
      push(IconRuler, '总距离', `${(stats.totalDist / 1000).toFixed(1)} km`);
      push(IconClock, '总时长', formatTimeShort(stats.totalTime));
    } else if (sport.key === 'Hiking') {
      push(IconRuler, '总距离', `${(stats.totalDist / 1000).toFixed(1)} km`);
      push(
        IconGauge,
        '平均坡度',
        stats.avgSlope > 0 ? `${stats.avgSlope.toFixed(1)}%` : ''
      );
      push(IconHeart, '平均心率', stats.avgHR ? `${stats.avgHR} bpm` : '');
    } else if (sport.key === 'Strength' || sport.key === 'Workout') {
      push(IconHeart, '平均心率', stats.avgHR ? `${stats.avgHR} bpm` : '');
      push(IconBolt, '训练次数', `${sportActivities.length} 次`);
      const lastDate = sportActivities[0]?.start_date_local?.slice(0, 10) || '';
      push(IconCalendar, '最近一次', lastDate);
    } else {
      // 通用兜底 — 走 priorityMetrics
      if (stats.avgHR) push(IconHeart, '平均心率', `${stats.avgHR} bpm`);
      if (sport.priorityMetrics.includes('distance')) {
        push(IconRuler, '总距离', `${(stats.totalDist / 1000).toFixed(1)} km`);
      }
      if (sport.priorityMetrics.includes('duration')) {
        push(IconClock, '总时长', formatTimeShort(stats.totalTime));
      }
      if (sport.priorityMetrics.includes('elevation') && stats.totalElev) {
        push(IconMountain, '总海拔', `${Math.round(stats.totalElev)} m`);
      }
    }

    // 不足 3 个时补 "最近一次"
    if (items.length < 3 && sportActivities[0]) {
      const dateStr = sportActivities[0].start_date_local?.slice(0, 10) || '';
      const hasDate = items.some((it) => it.label === '最近一次');
      if (!hasDate && dateStr) {
        push(IconCalendar, '最近一次', dateStr);
      }
    }

    return items.slice(0, 4);
  }, [sport, sportActivities, stats]);

  // 趋势图数据
  const trendData = useMemo(() => {
    if (sportActivities.length === 0) return [];
    const first = sportActivities[sportActivities.length - 1];
    const last = sportActivities[0];
    const days =
      (new Date(last.start_date_local || last.start_date).getTime() -
        new Date(first.start_date_local || first.start_date).getTime()) /
      (1000 * 60 * 60 * 24);
    const byMonth = days > 180;

    const buckets: Record<
      string,
      { period: string; distance: number; count: number; time: number }
    > = {};
    sportActivities.forEach((a) => {
      const dateStr = (a.start_date_local || a.start_date || '').slice(0, 10);
      const period = byMonth ? dateStr.slice(0, 7) : dateStr;
      if (!buckets[period])
        buckets[period] = { period, distance: 0, count: 0, time: 0 };
      buckets[period].distance += (a.distance || 0) / 1000;
      buckets[period].count += 1;
      buckets[period].time +=
        convertMovingTime2Sec((a.moving_time as string) || '0') / 60;
    });
    return Object.values(buckets).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }, [sportActivities]);

  if (!sport) {
    return (
      <Layout>
        <div data-kinetic className="k-page">
          <div className={styles.notFoundWrap}>
            <h1 className={styles.notFoundTitle}>未找到运动类型</h1>
            <Link to="/sports" className={styles.notFoundLink}>
              ← 回到运动总览
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // 注入 sport-color CSS 变量（hex8 透明度变体）
  const sportStyle = {
    '--sport-color': sport.color,
    '--sport-color-soft': `${sport.color}0d`,
    '--sport-color-border': `${sport.color}33`,
  } as CSSProperties;

  return (
    <Layout>
      <div data-kinetic>
        <Helmet>
          <title>{sport.label} · 运动详情</title>
        </Helmet>

        <div className={styles.page}>
          {/* 面包屑 */}
          <div className={styles.crumbs}>
            <Link to="/sports" className={styles.crumbLink}>
              ← 运动总览
            </Link>
            <span>·</span>
            <span>{sport.label}</span>
          </div>

          {/* Hero — Sport Icon + 标题 + 描述 */}
          <header className={styles.hero} style={sportStyle}>
            <div className={styles.heroIconBg}>
              <SportIcon iconName={sport.iconName} size={40} />
            </div>
            <div className={styles.heroBody}>
              <h1 className={styles.heroTitle}>{sport.label}</h1>
              <p className={styles.heroDesc}>{sport.desc}</p>
            </div>
          </header>

          {/* Sport-aware 数据 banner — headline + 副指标 */}
          {headline && (
            <div className={styles.banner} style={sportStyle}>
              <div className={styles.headline}>
                <span className={styles.headlineLabel}>
                  <headline.Icon size={14} color={sport.color} />
                  {headline.label}
                </span>
                <div>
                  <span className={styles.headlineValue}>{headline.value}</span>
                  {headline.unit && (
                    <span className={styles.headlineUnit}>{headline.unit}</span>
                  )}
                </div>
                {headline.sub && (
                  <span className={styles.headlineSub}>{headline.sub}</span>
                )}
              </div>

              <div className={styles.submetrics}>
                {submetrics.map((item, i) => (
                  <div key={i} className={styles.submetric}>
                    <span className={styles.submetricIcon}>
                      <item.Icon size={14} color={sport.color} />
                    </span>
                    <div className={styles.submetricText}>
                      <span className={styles.submetricLabel}>
                        {item.label}
                      </span>
                      <span className={styles.submetricValue}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间范围选择器 */}
          <div className={styles.rangeRow}>
            <span className={styles.rangeLabel}>时间范围：</span>
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setPageSize(PAGE_SIZE);
                }}
                className={`${styles.rangeButton} ${
                  range === r.key ? styles.rangeButtonActive : ''
                }`}
                style={range === r.key ? sportStyle : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* 统计卡片行 — 按 priorityMetrics 显示 */}
          <div className={styles.statsGrid} style={sportStyle}>
            <StatBox
              label="总次数"
              value={`${stats.count} 次`}
              style={sportStyle}
            />
            {sport.priorityMetrics.includes('distance') && (
              <StatBox
                label="总距离"
                value={`${(stats.totalDist / 1000).toFixed(1)} km`}
                style={sportStyle}
              />
            )}
            {sport.priorityMetrics.includes('duration') && (
              <StatBox
                label="总时长"
                value={formatTimeLong(stats.totalTime)}
                style={sportStyle}
              />
            )}
            {sport.priorityMetrics.includes('pace') && (
              <StatBox
                label="平均配速"
                value={stats.avgPace || '—'}
                style={sportStyle}
              />
            )}
            {sport.priorityMetrics.includes('elevation') && (
              <StatBox
                label="总海拔"
                value={
                  stats.totalElev ? `${Math.round(stats.totalElev)} m` : '—'
                }
                style={sportStyle}
              />
            )}
            {sport.priorityMetrics.includes('floors') && (
              <StatBox
                label="总楼层"
                value={stats.totalReps ? `${stats.totalReps} 层` : '—'}
                style={sportStyle}
              />
            )}
            {sport.priorityMetrics.includes('reps') && (
              <StatBox
                label={`总${sport.unitLabel || '次数'}`}
                value={stats.totalReps ? `${stats.totalReps}` : '—'}
                style={sportStyle}
              />
            )}
            <StatBox
              label="平均心率"
              value={stats.avgHR ? `${stats.avgHR} bpm` : '—'}
              style={sportStyle}
            />
          </div>

          {/* 趋势图 */}
          {trendData.length > 0 && (
            <div className={styles.chartCard} style={sportStyle}>
              <h2 className={styles.chartTitle}>
                {sport.priorityMetrics.includes('elevation') && stats.totalElev
                  ? '海拔趋势'
                  : sport.priorityMetrics.includes('reps') &&
                      !sport.priorityMetrics.includes('distance')
                    ? `${sport.unitLabel || '次数'}趋势`
                    : '距离趋势'}
              </h2>
              <div className={styles.chartContainer}>
                <ResponsiveContainer>
                  <AreaChart
                    data={trendData}
                    margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={`grad-${sport.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={sport.color}
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="95%"
                          stopColor={sport.color}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.15)"
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#98989d', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#98989d', fontSize: 11 }} unit="km" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      labelStyle={{ color: '#1d1d1f' }}
                      labelFormatter={(label: string) => `📅 ${label}`}
                      formatter={(value: number) => [
                        `${value.toFixed(1)} km`,
                        '距离',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="distance"
                      stroke={sport.color}
                      fillOpacity={1}
                      fill={`url(#grad-${sport.key})`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.chartFooter}>
                共 {trendData.length} 个时段 · {stats.count} 次活动
              </p>
            </div>
          )}

          {/* 徒步 PB 区块（仅 Hiking 页显示） */}
          {sport.key === 'Hiking' && sportActivities.length > 0 && (
            <PersonalBests sportKey="Hiking" />
          )}

          {/* 活动列表 */}
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>活动记录</h2>
            <span className={styles.tableCount}>
              {sportActivities.length} 条
            </span>
          </div>
          {sportActivities.length === 0 ? (
            <div className={styles.tableEmpty}>
              还没有 {sport.label} 活动
              <div className={styles.tableEmptyHint}>
                试试切换时间范围到「全部」或去 Keep/Apple Health 同步
              </div>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.tableThead}>
                    <tr>
                      <th className={styles.tableTh}>日期</th>
                      <th className={styles.tableTh}>名称</th>
                      <th
                        className={`${styles.tableTh} ${styles.tableTdRight}`}
                      >
                        距离
                      </th>
                      <th
                        className={`${styles.tableTh} ${styles.tableTdRight}`}
                      >
                        时长
                      </th>
                      <th
                        className={`${styles.tableTh} ${styles.tableTdRight}`}
                      >
                        配速
                      </th>
                      <th
                        className={`${styles.tableTh} ${styles.tableTdRight}`}
                      >
                        心率
                      </th>
                      <th
                        className={`${styles.tableTh} ${styles.tableTdRight}`}
                      >
                        海拔
                      </th>
                      <th className={styles.tableTh}>数据源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sportActivities.slice(0, pageSize).map((act: Activity) => {
                      const distKm = ((act.distance || 0) / 1000).toFixed(2);
                      const timeSec = convertMovingTime2Sec(
                        (act.moving_time as string) || '0'
                      );
                      const timeMin = Math.round(timeSec / 60);
                      const pace =
                        act.distance > 0
                          ? `${(timeSec / 60 / (act.distance / 1000)).toFixed(2)} /km`
                          : '—';
                      const hr = act.average_heartrate;
                      const elev = act.elevation_gain;
                      const dateStr = (
                        act.start_date_local ||
                        act.start_date ||
                        ''
                      ).slice(0, 10);
                      const source = detectSource(act.name);
                      return (
                        <>
                          <tr
                            key={`row-${act.run_id}`}
                            className={styles.tableRow}
                            onClick={() =>
                              setExpandedId(
                                expandedId === act.run_id ? null : act.run_id
                              )
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <td
                              className={`${styles.tableTd} ${styles.tableTdMuted}`}
                            >
                              {dateStr}
                            </td>
                            <td
                              className={`${styles.tableTd} ${styles.tableTdName}`}
                              title={act.name}
                            >
                              {act.name}
                            </td>
                            <td className={styles.tableTdColored}>
                              {distKm}
                              <span className={styles.tableUnit}>km</span>
                            </td>
                            <td
                              className={`${styles.tableTd} ${styles.tableTdRight}`}
                            >
                              {timeMin < 60
                                ? `${timeMin}m`
                                : `${Math.floor(timeMin / 60)}h ${timeMin % 60}m`}
                            </td>
                            <td
                              className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdMuted}`}
                            >
                              {pace}
                            </td>
                            <td
                              className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdMuted}`}
                            >
                              {hr ? `${hr}` : '—'}
                            </td>
                            <td
                              className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdMuted}`}
                            >
                              {elev != null ? `${Math.round(elev)}m` : '—'}
                            </td>
                            <td className={styles.tableSource}>{source}</td>
                          </tr>
                          {expandedId === act.run_id && (
                            <tr
                              key={`expand-${act.run_id}`}
                              className={styles.tableExpandRow}
                            >
                              <td
                                colSpan={8}
                                className={styles.tableExpandCell}
                              >
                                <RoutePreview activities={[act]} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sportActivities.length > pageSize && (
                <div className={styles.loadMoreRow}>
                  <button
                    onClick={() => setPageSize((n) => n + PAGE_SIZE)}
                    className={styles.loadMoreButton}
                    style={sportStyle}
                  >
                    加载更多（还有 {sportActivities.length - pageSize} 条）
                  </button>
                </div>
              )}
              {pageSize > PAGE_SIZE && sportActivities.length <= pageSize && (
                <p className={styles.loadMoreDone}>
                  已显示全部 {sportActivities.length} 条
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

interface StatBoxProps {
  label: string;
  value: string;
  style?: CSSProperties;
}

const StatBox = ({ label, value, style }: StatBoxProps) => (
  <div className={styles.statBox} style={style}>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value}</div>
  </div>
);

function formatTimeLong(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeShort(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** 推断数据源 */
function detectSource(name: string): string {
  if (!name) return '未知';
  if (/from keep/i.test(name)) return 'Keep';
  if (/from apple watch/i.test(name)) return 'Apple Watch';
  if (/from gpx/i.test(name)) return 'GPX';
  if (/^Route \d{4}/i.test(name)) return 'Keep';
  return 'Strava';
}

export default SportDetail;
