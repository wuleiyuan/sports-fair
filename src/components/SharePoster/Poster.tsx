import React, { useMemo } from 'react';
import { Activity, pathForRun } from '@/utils/utils';
import { QRCodeSVG } from 'qrcode.react';

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
        style={{
          width: POSTER_W,
          height: POSTER_H,
          background: '#0f0f0f',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: PAD,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 1. Brand header */}
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            paddingBottom: 20,
            borderBottom: `1px solid ${ORANGE_DIM}`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: ORANGE }}>
            SPORTS FAIR
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 4,
            }}
          >
            运动 · 记录 · 成长
          </div>
        </div>

        {/* 2. Main big number */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 32,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {distText}
          </div>
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 4,
            }}
          >
            总跑量
          </div>
        </div>

        {/* 3. SVG track */}
        <div
          style={{
            width: 600,
            height: 300,
            marginTop: 24,
            borderRadius: 16,
            overflow: 'hidden',
            background: ORANGE_DIM,
          }}
        >
          <svg width={600} height={300} viewBox="0 0 600 300">
            {trackSvg}
          </svg>
        </div>

        {/* 4. 2×2 data cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            width: 600,
            marginTop: 28,
          }}
        >
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
            <div
              key={item.label}
              style={{
                background: ORANGE_DIM,
                borderRadius: 12,
                padding: '16px 20px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.2,
                }}
              >
                {item.value}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.5)',
                    marginLeft: 4,
                  }}
                >
                  {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 5. QR code */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingTop: 24,
          }}
        >
          <QRCodeSVG
            value="https://myselfup.top"
            size={80}
            bgColor="transparent"
            fgColor="#fff"
          />
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.5,
              }}
            >
              扫码关注公众号
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
              }}
            >
              获取更多运动数据
            </div>
          </div>
        </div>

        {/* 6. Footer */}
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            paddingTop: 20,
            marginTop: 16,
            borderTop: `1px solid ${ORANGE_DIM}`,
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          myselfup.top · {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>
    );
  }
);

Poster.displayName = 'Poster';
export default Poster;
