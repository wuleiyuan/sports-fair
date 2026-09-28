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
const PAD = 48;
const ORANGE = '#F59E0B';
const ORANGE_DIM = 'rgba(245,158,11,0.15)';

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
            fill="#22c55e"
            stroke="#fff"
            strokeWidth={2}
          />
        )}
        {route.path.length > 1 && (
          <circle
            cx={toSvg(
              route.path[route.path.length - 1][0],
              route.path[route.path.length - 1][1]
            )[0]}
            cy={toSvg(
              route.path[route.path.length - 1][0],
              route.path[route.path.length - 1][1]
            )[1]}
            r={8}
            fill="#ef4444"
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
      const colors = ['#F59E0B', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'];
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
    const distUnit = totalDistanceKm >= 1000 ? 'km' : 'km';

    return (
      <div
        ref={ref}
        className={styles.posterRoot}
        style={{ width: POSTER_W, height: POSTER_H }}
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
        <div className={styles.trackWrap} style={{ width: 600 }}>
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
            fgColor="#fff"
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
