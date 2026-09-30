import React, { useMemo } from 'react';
import { Activity, pathForRun } from '@/utils/utils';
import { QRCodeSVG } from 'qrcode.react';
import styles from './poster.module.css';

interface PosterProps {
  activities: Activity[];
  totalDistanceKm: number;
  totalTimeHours: number;
  totalRuns: number;
  bestPace: string;
  avgPace: string;
}

const POSTER_W = 1080;
const POSTER_H = 1920;
const _PAD = 48; // 保留 padding 常量供未来扩展使用

/* Apple HIG 配色令牌 (Apple Fitness Share Card 风格)
 * 默认以跑步为主角, accent = System Green (#34C759)
 * 兼容未来其他运动: 调用方可通过 CSS 变量覆盖 */
const SPORT_COLOR = '#34C759'; // System Green (run)
const SPORT_COLOR_2 = '#007AFF'; // System Blue (ride)
const START_DOT = '#34C759'; // System Green (跑道起点)
const END_DOT = '#FF3B30'; // System Red (跑道终点, 语义合适)

/** Convert [lng, lat][] to SVG path commands, fitting to a viewBox */
function coordsToSvgPath(
  allRoutes: { path: [number, number][]; color: string }[]
): React.ReactNode {
  const allPoints = allRoutes.flatMap((r) => r.path);
  if (allPoints.length < 2) return null;

  const lats = allPoints.map((p) => p[1]);
  const lngs = allPoints.map((p) => p[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const bW = maxLng - minLng || 0.001;
  const bH = maxLat - minLat || 0.001;
  const svgPad = 8;
  const drawW = 600 - 2 * svgPad;
  const drawH = 300 - 2 * svgPad;

  const toSvg = (lng: number, lat: number): [number, number] => [
    svgPad + ((lng - minLng) / bW) * drawW,
    svgPad + ((maxLat - lat) / bH) * drawH,
  ];

  return allRoutes.map((route, ri) => {
    if (route.path.length < 2) return null;
    const d = route.path
      .map((c, i) => {
        const [x, y] = toSvg(c[0], c[1]);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

    return (
      <g key={ri}>
        <path
          d={d}
          fill="none"
          stroke={route.color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        {route.path.length > 0 && (
          <circle
            cx={toSvg(route.path[0][0], route.path[0][1])[0]}
            cy={toSvg(route.path[0][0], route.path[0][1])[1]}
            r={8}
            fill={START_DOT}
            stroke="#fff"
            strokeWidth={2}
          />
        )}
        {route.path.length > 1 && (
          <circle
            cx={
              toSvg(
                route.path[route.path.length - 1][0],
                route.path[route.path.length - 1][1]
              )[0]
            }
            cy={
              toSvg(
                route.path[route.path.length - 1][0],
                route.path[route.path.length - 1][1]
              )[1]
            }
            r={8}
            fill={END_DOT}
            stroke="#fff"
            strokeWidth={2}
          />
        )}
      </g>
    );
  });
}

const Poster = React.forwardRef<HTMLDivElement, PosterProps>(
  (
    {
      activities,
      totalDistanceKm,
      totalTimeHours,
      totalRuns,
      bestPace,
      avgPace,
    },
    ref
  ) => {
    const routes = useMemo(() => {
      /* 多路线配色 — Apple HIG 调色板 (System 7 色循环) */
      const colors = [
        SPORT_COLOR, // System Green
        SPORT_COLOR_2, // System Blue
        '#5AC8FA', // System Teal
        '#AF52DE', // System Purple
        '#FF9500', // System Orange (克制用)
        '#5856D6', // System Indigo
        '#FF2D55', // System Pink
      ];
      return activities
        .filter((a) => a.summary_polyline && a.type === 'Run')
        .slice(-10)
        .map((a, i) => ({
          path: pathForRun(a) as [number, number][],
          color: colors[i % colors.length],
        }));
    }, [activities]);

    const trackSvg = useMemo(() => coordsToSvgPath(routes), [routes]);

    const distText =
      totalDistanceKm >= 1000
        ? `${(totalDistanceKm / 1000).toFixed(1)}k`
        : `${totalDistanceKm.toFixed(0)}`;

    return (
      <div
        ref={ref}
        className={styles.posterRoot}
        style={
          {
            width: POSTER_W,
            height: POSTER_H,
            '--poster-accent': SPORT_COLOR,
            '--poster-accent-2': SPORT_COLOR_2,
          } as React.CSSProperties
        }
      >
        {/* 1. Brand header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandTitle}>SPORTS FAIR</div>
          <div className={styles.brandSubtitle}>运动 · 记录 · 成长</div>
        </div>

        {/* 2. Main big number */}
        <div className={styles.bigNumberBlock}>
          <div className={styles.bigNumber}>{distText}</div>
          <div className={styles.bigNumberLabel}>总跑量</div>
        </div>

        {/* 3. SVG track */}
        <div className={styles.trackWrap}>
          <svg width={600} height={300} viewBox="0 0 600 300">
            {trackSvg}
          </svg>
        </div>

        {/* 4. 2×2 data cards */}
        <div className={styles.dataCardGrid}>
          {[
            { label: '总次数', value: `${totalRuns}`, unit: '次' },
            {
              label: '总用时',
              value: `${totalTimeHours.toFixed(0)}`,
              unit: '小时',
            },
            { label: '平均配速', value: avgPace, unit: '/km' },
            { label: '最佳配速', value: bestPace, unit: '/km' },
          ].map((item) => (
            <div key={item.label} className={styles.dataCard}>
              <div className={styles.dataCardLabel}>{item.label}</div>
              <div className={styles.dataCardValue}>
                {item.value}
                <span className={styles.dataCardUnit}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 5. QR code */}
        <div className={styles.qrSection}>
          <QRCodeSVG
            value="https://myselfup.top"
            size={80}
            bgColor="transparent"
            fgColor="#1d1d1f"
          />
          <div>
            <div className={styles.qrText1}>扫码关注公众号</div>
            <div className={styles.qrText2}>获取更多运动数据</div>
          </div>
        </div>

        {/* 6. Footer */}
        <div className={styles.footer}>
          myselfup.top · {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>
    );
  }
);

Poster.displayName = 'Poster';
export default Poster;
