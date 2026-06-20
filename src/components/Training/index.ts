/**
 * v2.3.2 — 训练看板模块统一导出
 */
export { default as ACWRCard } from './ACWRCard';
export { default as HRZonesCard } from './HRZonesCard';
export { default as AdviceListCard } from './AdviceListCard';
export { default as CadenceCard } from './CadenceCard';
export { default as TSBCard } from './TSBCard';
export {
  type TrainingLoad,
  type TrainingAdvice,
  type AdviceItem,
  type ACWRResult,
  type TSBResult,
  type TSBStatus,
  type HRZones,
  type DataWindow,
  type ACWRStatus,
  type HRZoneKey,
  type AdviceSeverity,
  type AdviceCategory,
  ACWR_ZONES,
  HR_ZONE_META,
  ACWR_STATUS_LABEL,
  TSB_STATUS_LABEL,
  getACWRZone,
  acwrZoneAdvice,
  tsbStatusAdvice,
} from './types';
