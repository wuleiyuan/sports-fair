// Mini SVG sparkline — 30-day daily aggregate
// 设计：Apple Health 风格
//  - 折线 + 面积渐变
//  - 高亮最大点
//  - 当前支持两种 metric axis：'distance' / 'count' / 'duration'

import { useMemo } from 'react';

interface SparklineProps {
  /** 30 个数值（按时间顺序，旧 → 新） */
  values: number[];
  /** 主题色 (hex) */
  color: string;
  /** 单位标签（用于 aria） */
  unit?: string;
  /** 高度 px，默认 28 */
  height?: number;
  /** 宽度 px，默认 100（容器撑满） */
  width?: number;
}

export default function Sparkline({
  values,
  color,
  unit = '',
  height = 28,
  width = 100,
}: SparklineProps) {
  // 空数据：渲染一个静态占位线，避免 0 长 path 触发 React 警告
  const hasData = values.some((v) => v > 0);

  const { linePath, areaPath, maxIndex, maxVal } = useMemo(() => {
    const n = values.length;
    if (n === 0 || !hasData) {
      return { linePath: '', areaPath: '', maxIndex: -1, maxVal: 0 };
    }
    const max = Math.max(...values, 1); // 避免除零
    const min = Math.min(...values.filter((v) => v > 0), max); // 保留 0 在基线
    const range = max - min || 1;
    // 0 必须落在 baseline，不能塌缩
    const padTop = 4;
    const padBot = 4;
    const usableH = height - padTop - padBot;

    // x: 0..width
    // y: 大值=padTop(顶部)，小值=padTop+usableH(底部)
    const xStep = n > 1 ? width / (n - 1) : 0;
    const points = values.map((v, i) => {
      const x = i * xStep;
      // 把 min..max 映射到 (padTop+usableH)..padTop
      const y =
        v === 0
          ? padTop + usableH // 0 永远在底部
          : padTop + usableH * (1 - (v - min) / range);
      return { x, y };
    });

    const lineD = points
      .map((p, i) =>
        i === 0
          ? `M${p.x.toFixed(2)} ${p.y.toFixed(2)}`
          : `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      )
      .join(' ');

    const baseline = padTop + usableH;
    const areaD = `${lineD} L${width.toFixed(2)} ${baseline.toFixed(2)} L0 ${baseline.toFixed(2)} Z`;

    const mIdx = values.indexOf(max);

    return { linePath: lineD, areaPath: areaD, maxIndex: mIdx, maxVal: max };
  }, [values, hasData, height, width]);

  const gradId = useMemo(
    () => `sl-grad-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  if (!hasData) {
    // 空数据：单一基线，给人"暂无近期活动"的暗示
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="暂无近期活动"
      >
        <line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  // 标记点 x
  const maxX = maxIndex >= 0 ? (maxIndex / (values.length - 1)) * width : 0;
  // 标记点 y
  const max = Math.max(...values, 1);
  const min = Math.min(...values.filter((v) => v > 0), max);
  const range = max - min || 1;
  const padTop = 4;
  const padBot = 4;
  const usableH = height - padTop - padBot;
  const maxY = padTop + usableH * (1 - (maxVal - min) / range);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={`最近 30 天趋势，峰值 ${maxVal}${unit}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {maxIndex >= 0 && (
        <circle cx={maxX} cy={maxY} r={2.5} fill={color}>
          <animate
            attributeName="r"
            values="2.5;3.5;2.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  );
}
