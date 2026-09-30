// 运动总览页 - 第七阶段（Apple Fitness Premium）
// 改造点：
//   1. Hero KPI 卡 ×4：总距离 / 总时长 / 最长连击 / #1 运动
//   2. 分类筛选 tab：按运动类别过滤
//   3. SportCard 改造：mini-sparkline + 玻璃质感 + 虚线锁定态
//   4. 配色：替换 Pornhub 橙黑 → Apple Fitness 深空渐变

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import SportCard from '@/components/SportCard';
import SportIcon from '@/components/SportIcon';
import {
  IconRuler,
  IconClock,
  IconBolt,
  IconChevronRight,
  IconInfo,
} from '@/components/Icons';
import { SPORT_TYPES, normalizeSportType } from '@/utils/sportTypes';
import { convertMovingTime2Sec } from '@/utils/utils';
import activities from '@/static/activities.json';
import type { Activity } from '@/utils/utils';
import type { SportCompat } from '@/utils/sportCompat';
import styles from './sports-overview.module.css';

// ====== 运动分类映射 ======
// 注：分类不写入 sportCompat.ts（数据模型）—— 而在这里做单点映射，
// 后续如要加 category 字段再迁。
type Category = 'all' | 'aerobic' | 'strength' | 'ball' | 'extreme';
const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'aerobic', label: '有氧' },
  { id: 'strength', label: '力量/核心' },
  { id: 'ball', label: '球类/搏击' },
  { id: 'extreme', label: '水上/极限' },
];

const CATEGORY_BY_KEY: Record<string, Category> = {
  // 有氧
  Run: 'aerobic',
  Walk: 'aerobic',
  Ride: 'aerobic',
  Hiking: 'aerobic',
  Elliptical: 'aerobic',
  Rowing: 'aerobic',
  // 力量 / 核心
  Strength: 'strength',
  Core: 'strength',
  Yoga: 'strength',
  StairStepper: 'strength',
  RopeSkipping: 'strength',
  // 球类 / 搏击
  Soccer: 'ball',
  Basketball: 'ball',
  Tennis: 'ball',
  Boxing: 'ball',
  Golf: 'ball',
  // 水上 / 极限
  Swim: 'extreme',
  Skiing: 'extreme',
  Surfing: 'extreme',
  Wheelchair: 'extreme',
  Other: 'extreme',
};

// ====== 格式化工具 ======

function formatTotalTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatLongNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ====== 类型 ======

interface SportStats {
  count: number;
  totalDistance: number; // 米
  totalTime: number; // 秒
  totalReps: number;
  totalElevation: number; // 米
  totalSpeedWeighted: number; // m/s · m
  lastDate?: string;
  /** 最近 30 天按 displayMetric 的每日聚合 */
  sparkline: number[];
}

const DAYS_IN_SPARK = 30;

// ====== 数据时效（从 activities.json 真实推导，不再硬编码） ======
// 2026-09-28 修复：之前硬编码 REF_DATE_ISO='2026-09-28'，导致：
//   - subtitle 显示"09-28 的每一步"但实际数据停在 09-15
//   - Sparkline 锚定 09-28，13 天前的位置也会被填（看起来有数据其实是 gap）
//   - footer 用 new Date() 显示"最近更新今天"——撒谎
const DATA_LATEST_ISO: string = (() => {
  let max = '';
  (activities as Activity[]).forEach((a) => {
    const d = a.start_date_local || a.start_date;
    if (d) {
      const day = d.slice(0, 10);
      if (day > max) max = day;
    }
  });
  return max;
})();

const NOW_ISO: string = new Date().toISOString().slice(0, 10);

const STALE_DAYS: number = (() => {
  if (!DATA_LATEST_ISO) return 0;
  const ms = new Date(NOW_ISO).getTime() - new Date(DATA_LATEST_ISO).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
})();

const IS_STALE = STALE_DAYS >= 7; // 超过 7 天提示
const IS_VERY_STALE = STALE_DAYS >= 14; // 超过 14 天强烈提示

// ====== 主组件 ======

const SportsOverview = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  // === 核心聚合：每个运动的统计 + sparkline ===
  const { sportStats, sparkByKey, longestStreak, topSportKey } = useMemo(() => {
    const stats: Record<string, SportStats> = {};
    const sparks: Record<string, number[]> = {};

    // 先初始化
    SPORT_TYPES.forEach((s) => {
      stats[s.key] = {
        count: 0,
        totalDistance: 0,
        totalTime: 0,
        totalReps: 0,
        totalElevation: 0,
        totalSpeedWeighted: 0,
        sparkline: new Array(DAYS_IN_SPARK).fill(0),
      };
      sparks[s.key] = new Array(DAYS_IN_SPARK).fill(0);
    });

    // === 长连击：所有活动的活跃日期集合 ===
    const activeDays = new Set<string>();

    activities.forEach((act: Activity) => {
      const key = normalizeSportType(act.type, act.name);
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          totalReps: 0,
          totalElevation: 0,
          totalSpeedWeighted: 0,
          sparkline: new Array(DAYS_IN_SPARK).fill(0),
        };
      }
      if (!sparks[key]) {
        sparks[key] = new Array(DAYS_IN_SPARK).fill(0);
      }

      const dist = act.distance || 0;
      stats[key].count += 1;
      stats[key].totalDistance += dist;
      const t = convertMovingTime2Sec((act.moving_time as string) || '0');
      stats[key].totalTime += t;
      const reps = (act as unknown as { reps?: number }).reps;
      if (typeof reps === 'number' && reps > 0) {
        stats[key].totalReps += reps;
      }
      const elev = act.elevation_gain;
      if (typeof elev === 'number' && elev > 0) {
        stats[key].totalElevation += elev;
      }
      const speed = act.average_speed;
      if (typeof speed === 'number' && speed > 0 && dist > 0) {
        stats[key].totalSpeedWeighted += speed * dist;
      }
      const date = act.start_date_local || act.start_date;
      if (!stats[key].lastDate || (date && date > stats[key].lastDate)) {
        stats[key].lastDate = date;
      }

      // === sparkline 填充 ===
      // 计算日期距今天 (new Date()) 的天数（0 = 今天，29 = 30 天前）
      // 改用真实今天而非硬编码 REF_DATE_ISO，让 stale 期的空缺如实呈现
      if (date) {
        const dayStr = date.slice(0, 10);
        const dayDate = new Date(dayStr);
        const refDate = new Date();
        const diffDays = Math.floor(
          (refDate.getTime() - dayDate.getTime()) / 86400000
        );
        if (diffDays >= 0 && diffDays < DAYS_IN_SPARK) {
          const idx = DAYS_IN_SPARK - 1 - diffDays; // 数组末位 = 今天
          // 按 sport 的 displayMetric 决定聚合维度
          const sportCfg = SPORT_TYPES.find((s) => s.key === key);
          const metric = sportCfg?.displayMetric || 'distance';
          let val = 0;
          if (metric === 'distance') val = dist;
          else if (metric === 'count') val = reps && reps > 0 ? reps : 0;
          else if (metric === 'duration') val = t;
          else if (metric === 'energy') val = 0; // 未采集
          sparks[key][idx] += val;
          // 同时累加到 stats 的 sparkline（同样的引用，后面会用）
          stats[key].sparkline[idx] += val;
        }
        activeDays.add(dayStr);
      }
    });

    // === 计算最长连击（按日期排序，连续日累加） ===
    let longestStreak = 0;
    let currentStreak = 0;
    const sortedDays = Array.from(activeDays).sort();
    let prevDate: Date | null = null;
    sortedDays.forEach((d) => {
      const cur = new Date(d);
      if (
        prevDate &&
        Math.floor((cur.getTime() - prevDate.getTime()) / 86400000) === 1
      ) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      prevDate = cur;
    });

    // === #1 运动（按 count 降序） ===
    let topSportKey = '';
    let topCount = 0;
    Object.entries(stats).forEach(([k, v]) => {
      if (v.count > topCount) {
        topCount = v.count;
        topSportKey = k;
      }
    });

    return {
      sportStats: stats,
      sparkByKey: sparks,
      longestStreak,
      topSportKey,
    };
  }, []);

  // === 总体 KPI ===
  const totalKPI = useMemo(() => {
    const totalCount = Object.values(sportStats).reduce(
      (s, v) => s + v.count,
      0
    );
    const totalDist = Object.values(sportStats).reduce(
      (s, v) => s + v.totalDistance,
      0
    );
    const totalTime = Object.values(sportStats).reduce(
      (s, v) => s + v.totalTime,
      0
    );
    const activeSports = SPORT_TYPES.filter(
      (s) => sportStats[s.key]?.count > 0
    ).length;
    return { totalCount, totalDist, totalTime, activeSports };
  }, [sportStats]);

  // === 排序 + 分类过滤 ===
  const sortedSports = useMemo(() => {
    const withData = SPORT_TYPES.filter(
      (s) => (sportStats[s.key]?.count || 0) > 0
    );
    const withoutData = SPORT_TYPES.filter(
      (s) => (sportStats[s.key]?.count || 0) === 0
    );
    withData.sort((a, b) => sportStats[b.key].count - sportStats[a.key].count);
    const combined = [...withData, ...withoutData];

    if (activeCategory === 'all') return combined;
    return combined.filter((s) => CATEGORY_BY_KEY[s.key] === activeCategory);
  }, [sportStats, activeCategory]);

  // === 各分类计数（用于 tab 角标） ===
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      all: 0,
      aerobic: 0,
      strength: 0,
      ball: 0,
      extreme: 0,
    };
    SPORT_TYPES.forEach((s) => {
      counts.all += 1;
      const cat = CATEGORY_BY_KEY[s.key];
      if (cat) counts[cat] += 1;
    });
    return counts;
  }, []);

  // === top sport 配置（用于 Hero 第 4 张卡） ===
  const topSportConfig = topSportKey
    ? SPORT_TYPES.find((s) => s.key === topSportKey)
    : null;

  return (
    <Layout>
      <Helmet>
        <title>运动总览 · Apple Fitness Premium</title>
      </Helmet>

      <div className={styles.page}>
        {/* === 页头 === */}
        <header className={styles.header}>
          <div className={styles.crumbs}>
            <Link to="/" className={styles.crumbLink}>
              ← 回到主页
            </Link>
          </div>
          <div className={styles.titleRow}>
            <div>
              <h1 className={styles.title}>运动总览</h1>
              <p className={styles.subtitle}>
                截至 {DATA_LATEST_ISO || '暂无数据'} · {SPORT_TYPES.length}{' '}
                种运动类型 · {totalKPI.activeSports} 项有数据 · 共{' '}
                {totalKPI.totalCount.toLocaleString()} 次活动
                {IS_STALE && (
                  <span
                    className={
                      IS_VERY_STALE ? styles.staleWarn : styles.staleHint
                    }
                  >
                    {' '}
                    · 已 {STALE_DAYS} 天未更新
                  </span>
                )}
              </p>
            </div>
            <div
              className={`${styles.titleBadge} ${
                IS_VERY_STALE
                  ? styles.titleBadgeStale
                  : IS_STALE
                    ? styles.titleBadgeWarn
                    : ''
              }`}
            >
              <span
                className={
                  IS_VERY_STALE
                    ? styles.titleBadgeDotStale
                    : IS_STALE
                      ? styles.titleBadgeDotWarn
                      : styles.titleBadgeDot
                }
              />
              <span>
                {IS_VERY_STALE
                  ? `数据滞后 ${STALE_DAYS} 天`
                  : IS_STALE
                    ? `待同步 · ${STALE_DAYS} 天前`
                    : '实时同步'}
              </span>
            </div>
          </div>
        </header>

        {/* === Hero KPI 区 === */}
        <section className={styles.hero} aria-label="运动总览 KPI">
          {/* 1. 总距离 */}
          <article className={`${styles.kpiCard} ${styles.kpiDistance}`}>
            <div className={styles.kpiLabel}>总距离</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNumber}>
                {(totalKPI.totalDist / 1000).toFixed(1)}
              </span>
              <span className={styles.kpiUnit}>km</span>
            </div>
            <div className={styles.kpiFoot}>
              <span
                className={styles.kpiIcon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'inherit',
                }}
              >
                <IconRuler size={14} aria-hidden="true" />
              </span>
              <span>累计移动距离</span>
            </div>
          </article>

          {/* 2. 总时长 */}
          <article className={`${styles.kpiCard} ${styles.kpiDuration}`}>
            <div className={styles.kpiLabel}>总时长</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNumber}>
                {formatTotalTime(totalKPI.totalTime)}
              </span>
            </div>
            <div className={styles.kpiFoot}>
              <span
                className={styles.kpiIcon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'inherit',
                }}
              >
                <IconClock size={14} aria-hidden="true" />
              </span>
              <span>累计运动时长</span>
            </div>
          </article>

          {/* 3. 最长连击 */}
          <article className={`${styles.kpiCard} ${styles.kpiStreak}`}>
            <div className={styles.kpiLabel}>最长连击</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNumber}>{longestStreak}</span>
              <span className={styles.kpiUnit}>天</span>
            </div>
            <div className={styles.kpiFoot}>
              <span
                className={styles.kpiIcon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'inherit',
                }}
              >
                <IconBolt size={14} aria-hidden="true" />
              </span>
              <span>坚持的轨迹</span>
            </div>
          </article>

          {/* 4. #1 运动 */}
          {topSportConfig && (
            <article
              className={styles.kpiCard}
              style={{
                background: `linear-gradient(135deg, ${topSportConfig.color}26 0%, ${topSportConfig.color}0a 100%)`,
                borderColor: `${topSportConfig.color}55`,
              }}
            >
              <div
                className={styles.kpiLabel}
                style={{ color: topSportConfig.color }}
              >
                #1 运动
              </div>
              <div className={styles.kpiValue}>
                <span
                  className={styles.kpiEmoji}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: topSportConfig.color,
                  }}
                >
                  <SportIcon iconName={topSportConfig.iconName} size={24} />
                </span>
                <span className={styles.kpiNumber}>{topSportConfig.label}</span>
              </div>
              <div className={styles.kpiFoot}>
                <span
                  className={styles.kpiIcon}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: topSportConfig.color,
                  }}
                >
                  <IconChevronRight size={14} aria-hidden="true" />
                </span>
                <span>
                  {formatLongNumber(sportStats[topSportKey].count)} 次活动
                </span>
              </div>
            </article>
          )}
        </section>

        {/* === 分类筛选 tab === */}
        <nav className={styles.tabs} aria-label="运动分类">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeCategory === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{categoryCounts[tab.id]}</span>
            </button>
          ))}
        </nav>

        {/* === 运动卡片网格 === */}
        <section className={styles.grid} aria-label="运动卡片列表">
          {sortedSports.length === 0 ? (
            <div className={styles.empty}>
              <span
                className={styles.emptyIcon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'rgba(148, 163, 184, 0.6)',
                }}
              >
                <IconChevronRight size={32} aria-hidden="true" />
              </span>
              <p>该分类下暂无运动</p>
            </div>
          ) : (
            sortedSports.map((sport) => {
              const stat = sportStats[sport.key] || {
                count: 0,
                totalDistance: 0,
                totalTime: 0,
                totalReps: 0,
                totalElevation: 0,
                totalSpeedWeighted: 0,
                sparkline: new Array(DAYS_IN_SPARK).fill(0),
              };
              const avgSpeed =
                stat.totalDistance > 0
                  ? stat.totalSpeedWeighted / stat.totalDistance
                  : 0;
              const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : 0;
              return (
                <SportCard
                  key={sport.key}
                  sport={sport}
                  count={stat.count}
                  totalDistance={stat.totalDistance}
                  totalTime={stat.totalTime}
                  totalReps={stat.totalReps}
                  totalElevation={stat.totalElevation}
                  avgPace={avgPace}
                  totalFloors={stat.totalReps}
                  lastDate={stat.lastDate}
                  sparkline={stat.sparkline}
                  href={`/sports/${sport.key}`}
                />
              );
            })
          )}
        </section>

        {/* === 底部说明 === */}
        <footer className={styles.footer}>
          <p>
            数据源：Strava + Keep + Apple HealthKit ·{' '}
            {IS_STALE ? (
              <>
                <span
                  className={
                    IS_VERY_STALE ? styles.staleWarn : styles.staleHint
                  }
                >
                  最新活动 {DATA_LATEST_ISO}（{STALE_DAYS} 天前）
                </span>{' '}
                · 建议在本地执行 <code>pnpm run data:download:garmin</code> +{' '}
                <code>python3 run_page/keep_sync.py</code> 拉取
              </>
            ) : (
              <>最新活动 {DATA_LATEST_ISO}</>
            )}
          </p>
        </footer>
      </div>
    </Layout>
  );
};

export default SportsOverview;
