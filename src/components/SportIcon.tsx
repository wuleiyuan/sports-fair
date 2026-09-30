// SportIcon - 按 sport.iconName 分发到 SVG 图标
// 替代原来的 emoji 渲染（ui-ux-pro-max 反模式："禁止用 emoji 作为结构图标"）
//
// 用法：
//   <SportIcon iconName="run" size={24} color="#5eb0ff" />
//   <SportIcon iconName={sport.iconName} size={32} />  // 在 sport-detail 头部使用
//
// 设计：所有图标统一 24x24 viewBox、stroke-width 1.8、stroke-linecap round
//      尺寸由 size 控制，颜色由 color 控制（默认 currentColor 跟随父级）

import React from 'react';
import {
  IconSportRun,
  IconSportHike,
  IconSportWalk,
  IconSportRide,
  IconSportSwim,
  IconSportStrength,
  IconSportCore,
  IconSportYoga,
  IconSportElliptical,
  IconSportStairs,
  IconSportRowing,
  IconSportBoxing,
  IconSportRope,
  IconSportSoccer,
  IconSportBasketball,
  IconSportTennis,
  IconSportSkiing,
  IconSportSurfing,
  IconSportGolf,
  IconSportGeneric,
  IconSportMedal,
} from './Icons';

export type SportIconName =
  | 'run'
  | 'hike'
  | 'walk'
  | 'ride'
  | 'swim'
  | 'strength'
  | 'core'
  | 'yoga'
  | 'elliptical'
  | 'stairs'
  | 'rowing'
  | 'boxing'
  | 'rope'
  | 'soccer'
  | 'basketball'
  | 'tennis'
  | 'skiing'
  | 'surfing'
  | 'golf'
  | 'generic';

interface SportIconProps {
  iconName: SportIconName | string;
  size?: number;
  color?: string;
  className?: string;
  /** 强制实心（部分图标可选填充） */
  filled?: boolean;
}

// 图标分发表：iconName → 组件
// 加新运动时只需在这里加一行 + Icons.tsx 加一个 IconSportXxx
const ICON_MAP: Record<SportIconName, React.FC<any>> = {
  run: IconSportRun,
  hike: IconSportHike,
  walk: IconSportWalk,
  ride: IconSportRide,
  swim: IconSportSwim,
  strength: IconSportStrength,
  core: IconSportCore,
  yoga: IconSportYoga,
  elliptical: IconSportElliptical,
  stairs: IconSportStairs,
  rowing: IconSportRowing,
  boxing: IconSportBoxing,
  rope: IconSportRope,
  soccer: IconSportSoccer,
  basketball: IconSportBasketball,
  tennis: IconSportTennis,
  skiing: IconSportSkiing,
  surfing: IconSportSurfing,
  golf: IconSportGolf,
  generic: IconSportGeneric,
};

const SportIcon: React.FC<SportIconProps> = ({
  iconName,
  size = 24,
  color,
  className,
}) => {
  // 兜底：未知 iconName → generic（不该发生，但保证渲染不挂）
  const IconComp = ICON_MAP[iconName as SportIconName] ?? IconSportGeneric;
  return <IconComp size={size} color={color} className={className} />;
};

export default SportIcon;

/**
 * 取"运动总览"装饰图标（用在卡片左上角、Header 装饰等）
 */
export const IconSportOverview: React.FC<{
  size?: number;
  color?: string;
  className?: string;
}> = (props) => <IconSportMedal {...props} />;

export {
  IconSportRun,
  IconSportHike,
  IconSportWalk,
  IconSportRide,
  IconSportSwim,
  IconSportStrength,
  IconSportCore,
  IconSportYoga,
  IconSportElliptical,
  IconSportStairs,
  IconSportRowing,
  IconSportBoxing,
  IconSportRope,
  IconSportSoccer,
  IconSportBasketball,
  IconSportTennis,
  IconSportSkiing,
  IconSportSurfing,
  IconSportGolf,
  IconSportGeneric,
  IconSportMedal,
};
