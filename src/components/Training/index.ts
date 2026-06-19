/**
 * v2.3.1 — 训练看板模块统一导出
 */
export { default as ACWRCard } from './ACWRCard';
export { default as HRZonesCard } from './HRZonesCard';
export { default as AdviceListCard } from './AdviceListCard';
export { default as CadenceCard } from './CadenceCard';
export {
  type TrainingLoad,
  type TrainingAdvice,
  type AdviceItem,
  type ACWRResult,
  type HRZones,
  type DataWindow,
  type ACWRStatus,
  type HRZoneKey,
  type AdviceSeverity,
  type AdviceCategory,
  ACWR_ZONES,
  HR_ZONE_META,
  ACWR_STATUS_LABEL,
  getACWRZone,
  acwrZoneAdvice,
} from './types';
