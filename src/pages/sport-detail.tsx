// 单运动类型详情页 - 中等改造第四阶段
// 时间范围筛选 + 趋势图 + 完整活动列表（心率/海拔/源）

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import SportIcon from '@/components/SportIcon';
import {
  IconMountain,
  IconSportRun,
  IconClock,
  IconChart,
  IconCalendar,
  IconFloors,
  IconArrowUp,
} from '@/components/Icons';
import {
  SPORT_BY_KEY,
  SPORT_TYPES,
  normalizeSportType,
} from '@/utils/sportTypes';
import { convertMovingTime2Sec } from '@/utils/utils';
import activities from '@/static/activities.json';
import { Activity } from '@/utils/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

type TimeRange = '7' | '30' | '90' | '365' | 'all';

const TIME_RANGES: { key: TimeRange; label: string; days: number | null }[] = [
  { key: '7', label: '7 天', days: 7 },
  { key: '30', label: '30 天', days: 30 },
  { key: '90', label: '90 天', days: 90 },
  { key: '365', label: '1 年', days: 365 },
  { key: 'all', label: '全部', days: null },
];

const PAGE_SIZE = 20;

const SportDetail = () => {
  const { key } = useParams<{ key: string }>();
  const sport = key ? SPORT_BY_KEY[key] : null;
  const [range, setRange] = useState<TimeRange>('all');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

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

  // 统计数据（基于筛选后的）
  const stats = useMemo(() => {
    if (sportActivities.length === 0) {
      return { count: 0, totalDist: 0, totalTime: 0, avgDist: 0, avgPace: '' };
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

    // 最高心率
    const validHR = sportActivities
      .map((a) => a.average_heartrate)
      .filter((hr): hr is number => typeof hr === 'number' && hr > 0);
    const avgHR =
      validHR.length > 0
        ? Math.round(validHR.reduce((s, v) => s + v, 0) / validHR.length)
        : null;

    // 总海拔
    const totalElev = sportActivities.reduce(
      (s: number, a: Activity) => s + ((a.elevation_gain as number) || 0),
      0
    );

    return {
      count: sportActivities.length,
      totalDist,
      totalTime,
      avgDist: avgDistKm,
      avgPace,
      avgHR,
      totalElev,
    };
  }, [sportActivities]);

  // 头部 sport-aware 数据 banner（按 sport.priorityMetrics 切换）
  // 用 SVG 矢量图标替代 emoji（ui-ux-pro-max 反模式）
  const headerBanner = useMemo(() => {
    if (sportActivities.length === 0 || !sport) return null;
    const items: {
      Icon: React.FC<{ size?: number; color?: string }>;
      label: string;
      value: string;
    }[] = [];

    if (sport.priorityMetrics.includes('elevation') && stats.totalElev) {
      const totalElev = stats.totalElev ?? 0;
      const avgElev = Math.round(totalElev / sportActivities.length);
      const maxElev = sportActivities.reduce((m: number, a: Activity) => {
        const e = (a.elevation_gain as number) || 0;
        return e > m ? e : m;
      }, 0);
      items.push({
        Icon: IconMountain,
        label: '平均海拔',
        value: `${avgElev} m`,
      });
      items.push({
        Icon: IconArrowUp,
        label: '最高爬升',
        value: `${Math.round(maxElev)} m`,
      });
    }
    if (sport.priorityMetrics.includes('pace')) {
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
      if (paces.length > 0) {
        const best = Math.min(...paces);
        const m = Math.floor(best);
        const s = Math.round(best - m * 60);
        items.push({
          Icon: IconSportRun,
          label: '最佳配速',
          value: `${m}:${s.toString().padStart(2, '0')} /km`,
        });
      }
    }
    if (sport.priorityMetrics.includes('duration')) {
      const avgSec = stats.totalTime / sportActivities.length;
      const h = Math.floor(avgSec / 3600);
      const m = Math.floor((avgSec % 3600) / 60);
      items.push({
        Icon: IconClock,
        label: '平均时长',
        value: h > 0 ? `${h}h ${m}m` : `${m}m`,
      });
    }
    if (
      sport.priorityMetrics.includes('reps') &&
      !sport.priorityMetrics.includes('distance')
    ) {
      const totalReps = sportActivities.reduce(
        (s: number, a: Activity) =>
          s + ((a as Activity & { reps?: number }).reps ?? 0),
        0
      );
      const avg = Math.round(totalReps / sportActivities.length);
      items.push({
        Icon: IconChart,
        label: `平均${sport.unitLabel || '次数'}`,
        value: `${avg}`,
      });
    }
    if (
      sport.priorityMetrics.includes('floors') &&
      !sport.priorityMetrics.includes('elevation')
    ) {
      const totalFloors = sportActivities.reduce(
        (s: number, a: Activity) =>
          s + ((a as Activity & { floors?: number }).floors ?? 0),
        0
      );
      const avg = Math.round(totalFloors / sportActivities.length);
      items.push({
        Icon: IconFloors,
        label: `平均楼层`,
        value: `${avg}`,
      });
    }
    if (items.length < 3 && sportActivities[0]) {
      const d = sportActivities[0];
      const dateStr = (d.start_date_local || d.start_date || '').slice(0, 10);
      items.push({ Icon: IconCalendar, label: '最近一次', value: dateStr });
    }
    return items.length > 0 ? items : null;
  }, [sportActivities, stats, sport]);

  // 趋势图数据：按月聚合（如果全部跨度大，按年聚合）
  const trendData = useMemo(() => {
    if (sportActivities.length === 0) return [];
    // 决定粒度
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
      buckets[period].distance += (a.distance || 0) / 1000; // km
      buckets[period].count += 1;
      buckets[period].time +=
        convertMovingTime2Sec((a.moving_time as string) || '0') / 60; // min
    });
    return Object.values(buckets).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }, [sportActivities]);

  if (!sport) {
    return (
      <Layout>
        <div data-kinetic className="k-page">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h1
              className="k-page-title"
              style={{ fontSize: 28, marginBottom: 16 }}
            >
              未找到运动类型
            </h1>
            <Link to="/sports" style={{ color: '#FF8800' }}>
              ← 回到运动总览
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-kinetic>
        <Helmet>
          <title>{sport.label} · 运动详情</title>
        </Helmet>

        <div className="mx-auto max-w-screen-2xl px-6 py-8 lg:px-16">
          {/* 面包屑 */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
            <Link to="/sports" className="transition-colors hover:text-white">
              ← 运动总览
            </Link>
            <span>·</span>
            <span>{sport.label}</span>
          </div>

          {/* 头部：SVG sport icon + 标题 + 描述 */}
          <header className="mb-8 flex items-start gap-4">
            <div
              className="flex items-center justify-center rounded-2xl p-4"
              style={{
                backgroundColor: sport.colorBg,
                border: `1px solid ${sport.color}33`,
                color: sport.color,
              }}
            >
              <SportIcon iconName={sport.iconName} size={40} />
            </div>
            <div>
              <h1 className="mb-1 text-3xl font-semibold text-white">
                {sport.label}
              </h1>
              <p className="text-sm text-gray-400">{sport.desc}</p>
            </div>
          </header>

          {/* Sport-aware 数据 banner - 按 priorityMetrics 切专属指标 */}
          {headerBanner && (
            <div
              className="mb-6 flex flex-wrap gap-2 rounded-2xl p-3"
              style={{
                backgroundColor: `${sport.color}0d`,
                border: `1px solid ${sport.color}22`,
              }}
            >
              {headerBanner.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    backgroundColor: `${sport.color}1a`,
                    border: `1px solid ${sport.color}33`,
                  }}
                >
                  <item.Icon size={16} color={sport.color} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: sport.color }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 时间范围选择器 */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-gray-500">时间范围：</span>
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setPageSize(PAGE_SIZE);
                }}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  range === r.key
                    ? 'font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={
                  range === r.key
                    ? {
                        backgroundColor: `${sport.color}22`,
                        color: sport.color,
                        border: `1px solid ${sport.color}66`,
                      }
                    : {
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                      }
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* 统计卡片行 - 按 priorityMetrics 显示（运动感知）*/}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatBox
              label="总次数"
              value={`${stats.count} 次`}
              color={sport.color}
            />
            {sport.priorityMetrics.includes('distance') && (
              <StatBox
                label="总距离"
                value={`${(stats.totalDist / 1000).toFixed(1)} km`}
                color={sport.color}
              />
            )}
            {sport.priorityMetrics.includes('duration') && (
              <StatBox
                label="总时长"
                value={formatTimeLong(stats.totalTime)}
                color={sport.color}
              />
            )}
            {sport.priorityMetrics.includes('pace') && (
              <StatBox
                label="平均配速"
                value={stats.avgPace || '—'}
                color={sport.color}
              />
            )}
            {sport.priorityMetrics.includes('elevation') && (
              <StatBox
                label="总海拔"
                value={
                  stats.totalElev ? `${Math.round(stats.totalElev)} m` : '—'
                }
                color={sport.color}
              />
            )}
            {sport.priorityMetrics.includes('floors') && (
              <StatBox
                label="总楼层"
                value={stats.totalReps ? `${stats.totalReps} 层` : '—'}
                color={sport.color}
              />
            )}
            {sport.priorityMetrics.includes('reps') && (
              <StatBox
                label={`总${sport.unitLabel || '次数'}`}
                value={stats.totalReps ? `${stats.totalReps}` : '—'}
                color={sport.color}
              />
            )}
            <StatBox
              label="平均心率"
              value={stats.avgHR ? `${stats.avgHR} bpm` : '—'}
              color={sport.color}
            />
          </div>

          {/* 趋势图 */}
          {trendData.length > 0 && (
            <div
              className="mb-8 rounded-2xl p-5"
              style={{
                backgroundColor: `${sport.color}0a`,
                border: `1px solid ${sport.color}22`,
              }}
            >
              <h2 className="mb-3 text-lg font-medium text-white">
                {sport.priorityMetrics.includes('elevation') && stats.totalElev
                  ? '海拔趋势'
                  : sport.priorityMetrics.includes('reps') &&
                      !sport.priorityMetrics.includes('distance')
                    ? `${sport.unitLabel || '次数'}趋势`
                    : '距离趋势'}
              </h2>
              <div style={{ width: '100%', height: 200 }}>
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
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
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
              <p className="mt-2 text-center text-xs text-gray-500">
                共 {trendData.length} 个时段 · {stats.count} 次活动
              </p>
            </div>
          )}

          {/* 活动列表 */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">活动记录</h2>
            <span className="text-xs text-gray-500">
              {sportActivities.length} 条
            </span>
          </div>
          {sportActivities.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              还没有 {sport.label} 活动
              <div className="mt-2 text-xs text-gray-600">
                试试切换时间范围到「全部」或去 Keep/Apple Health 同步
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-gray-400">
                      <th className="px-2 py-3">日期</th>
                      <th className="px-2 py-3">名称</th>
                      <th className="px-2 py-3 text-right">距离</th>
                      <th className="px-2 py-3 text-right">时长</th>
                      <th className="px-2 py-3 text-right">配速</th>
                      <th className="px-2 py-3 text-right">心率</th>
                      <th className="px-2 py-3 text-right">海拔</th>
                      <th className="px-2 py-3">数据源</th>
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
                        <tr
                          key={act.run_id}
                          className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
                        >
                          <td className="whitespace-nowrap px-2 py-2.5 text-gray-300">
                            {dateStr}
                          </td>
                          <td
                            className="max-w-xs truncate px-2 py-2.5 text-gray-300"
                            title={act.name}
                          >
                            {act.name}
                          </td>
                          <td
                            className="px-2 py-2.5 text-right tabular-nums"
                            style={{ color: sport.color }}
                          >
                            {distKm}{' '}
                            <span className="text-xs text-gray-500">km</span>
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-gray-300">
                            {timeMin < 60
                              ? `${timeMin}m`
                              : `${Math.floor(timeMin / 60)}h ${timeMin % 60}m`}
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-gray-400">
                            {pace}
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-gray-400">
                            {hr ? `${hr}` : '—'}
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-gray-400">
                            {elev != null ? `${Math.round(elev)}m` : '—'}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-xs text-gray-500">
                            {source}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sportActivities.length > pageSize && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setPageSize((n) => n + PAGE_SIZE)}
                    className="rounded-full px-4 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: `${sport.color}22`,
                      color: sport.color,
                      border: `1px solid ${sport.color}44`,
                    }}
                  >
                    加载更多（还有 {sportActivities.length - pageSize} 条）
                  </button>
                </div>
              )}
              {pageSize > PAGE_SIZE && sportActivities.length <= pageSize && (
                <p className="mt-3 text-center text-xs text-gray-500">
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
  color: string;
}

const StatBox = ({ label, value, color }: StatBoxProps) => (
  <div
    className="rounded-xl p-4"
    style={{ backgroundColor: `${color}11`, border: `1px solid ${color}33` }}
  >
    <div className="mb-1 text-xs text-gray-400">{label}</div>
    <div className="text-xl font-semibold tabular-nums" style={{ color }}>
      {value}
    </div>
  </div>
);

function formatTimeLong(seconds: number): string {
  if (!seconds) return '0m';
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
