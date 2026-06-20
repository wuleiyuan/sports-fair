import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

function withDefaults(
  children: React.ReactNode,
  { size = 24, color = 'currentColor', className }: IconProps
) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 跑步/训练 — figure.run */
export const IconRun: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <circle cx={12} cy={5} r={2} />
      <path d="M7 22l3-8 2 2 4-6" />
      <path d="M14 8l4 4" />
      <path d="M10 14l-3 4" />
      <path d="M18 5l-3 3" />
    </>,
    props
  );

/** 心脏/心率 — heart */
export const IconHeart: React.FC<IconProps> = (props) =>
  withDefaults(
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    props
  );

/** 静息心率 — moon.zzz */
export const IconMoon: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M9 9v.01" />
      <path d="M15 9v.01" />
      <path d="M9 15a3 3 0 0 0 6 0" />
    </>,
    props
  );

/** HRV — wave / pulse */
export const IconWave: React.FC<IconProps> = (props) =>
  withDefaults(
    <polyline points="2 13 6 13 8 7 12 17 14 11 16 13 22 13" />,
    props
  );

/** 睡眠 — moon.stars */
export const IconSleep: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M17 3v4" />
      <path d="M19 5h-4" />
    </>,
    props
  );

/** 步数 — figure.walk */
export const IconWalk: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <circle cx={13} cy={4} r={2} />
      <path d="M7 22l3-7 4 1 2-6" />
      <path d="M17 22l-2-6 5-4" />
      <path d="M9 11l3 4" />
    </>,
    props
  );

/** 闪电/能量 — bolt */
export const IconBolt: React.FC<IconProps> = (props) =>
  withDefaults(
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    props
  );

/** 时钟 — clock */
export const IconClock: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <circle cx={12} cy={12} r={10} />
      <polyline points="12 6 12 12 16 14" />
    </>,
    props
  );

/** 仪表盘 — gauge */
export const IconGauge: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
      <circle cx={12} cy={12} r={1} fill="currentColor" stroke="none" />
    </>,
    props
  );

/** 标尺/刻度 — ruler */
export const IconRuler: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M2 18L18 2l4 4-16 16-4-4z" />
      <path d="M6 14l2-2" />
      <path d="M10 10l2-2" />
      <path d="M14 6l2-2" />
    </>,
    props
  );

/** 列表/建议 — list.clipboard */
export const IconClipboard: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x={8} y={2} width={8} height={4} rx={1} ry={1} />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>,
    props
  );

/** 图表 — chart.bar */
export const IconChart: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </>,
    props
  );

/** 信息 — info.circle */
export const IconInfo: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 16v-4" />
      <circle cx={12} cy={8} r={0.5} fill="currentColor" stroke="none" />
    </>,
    props
  );

/** 警告 — exclamationmark.triangle */
export const IconWarning: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 3L2 21h20L12 3z" />
      <path d="M12 10v4" />
      <circle cx={12} cy={17} r={0.5} fill="currentColor" stroke="none" />
    </>,
    props
  );

/** 箭头右 — chevron.right */
export const IconChevronRight: React.FC<IconProps> = (props) =>
  withDefaults(
    <polyline points="9 18 15 12 9 6" />,
    props
  );

/** 箭头上 — arrow.up */
export const IconArrowUp: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </>,
    props
  );

/** 箭头下 — arrow.down */
export const IconArrowDown: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </>,
    props
  );

/** 箭头上下 — arrow.up.arrow.down */
export const IconArrowUpDown: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <path d="M17 3v18" />
      <path d="M12 8l5-5 5 5" />
      <path d="M7 21V3" />
      <path d="M12 16l-5 5-5-5" />
    </>,
    props
  );

/** 日历 — calendar */
export const IconCalendar: React.FC<IconProps> = (props) =>
  withDefaults(
    <>
      <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>,
    props
  );
