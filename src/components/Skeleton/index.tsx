/**
 * v2.3.0 — 通用骨架屏组件
 *
 * 纯 CSS 脉冲动画，无第三方依赖。
 * 提供 3 个变体：
 *   - <Skeleton />              通用矩形（默认）
 *   - <SkeletonText lines={3} /> 文本行
 *   - <SkeletonCard />           卡片轮廓
 *
 * 用法：
 *   {loading ? <SkeletonCard /> : <RealContent />}
 *
 * 设计：
 *   - 颜色跟随主题变量 (--color-run-row-hover-background / --color-text-tertiary)
 *   - 暗色模式自动适配
 *   - prefers-reduced-motion 时关闭动画
 */
import React from 'react';
import styles from './style.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 宽度 (CSS 值，默认 '100%') */
  width?: string | number;
  /** 高度 (CSS 值，默认 '1em') */
  height?: string | number;
  /** 圆角 (CSS 值，默认 '4px') */
  radius?: string;
  /** 自定义 className */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  radius = '4px',
  className = '',
  style,
  ...rest
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
};

interface SkeletonTextProps {
  /** 行数，默认 3 */
  lines?: number;
  /** 最后一行是否短一点（更真实），默认 true */
  lastShort?: boolean;
  /** 行间距（CSS 值），默认 '0.5em' */
  gap?: string;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastShort = true,
  gap = '0.5em',
  className = '',
}) => {
  return (
    <div
      className={`${styles.skeletonText} ${className}`}
      style={{ gap }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        const w = lastShort && isLast ? '70%' : '100%';
        return <Skeleton key={i} height="0.85em" width={w} />;
      })}
    </div>
  );
};

interface SkeletonCardProps {
  /** 卡片宽度 */
  width?: string | number;
  /** 卡片高度 */
  height?: string | number;
  className?: string;
}

/**
 * 卡片轮廓：标题 + 主指标 + 副标题 + 2 行文本
 * 匹配 AssessmentCard 的视觉结构
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = '100%',
  height = 180,
  className = '',
}) => {
  return (
    <div
      className={`${styles.skeletonCard} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    >
      <div className={styles.skeletonCardHeader}>
        <Skeleton width="40%" height="1rem" />
        <Skeleton width="50px" height="1.5rem" radius="10px" />
      </div>
      <Skeleton width="55%" height="2rem" />
      <Skeleton width="80%" height="0.75rem" />
      <div style={{ marginTop: 'auto' }}>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
};

/** 列表行骨架（用于 ActivityList / RunTable 等） */
export const SkeletonRow: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div className={`${styles.skeletonRow} ${className}`} aria-hidden="true">
    <Skeleton width="32px" height="32px" radius="50%" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4em' }}>
      <Skeleton width="60%" height="0.9em" />
      <Skeleton width="40%" height="0.7em" />
    </div>
    <Skeleton width="80px" height="1em" />
  </div>
);

export default Skeleton;
