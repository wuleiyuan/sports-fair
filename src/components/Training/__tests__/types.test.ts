/**
 * v2.3.1 — Training 类型 + 纯函数单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  getACWRZone,
  acwrZoneAdvice,
  ACWR_ZONES,
  ACWR_STATUS_LABEL,
  HR_ZONE_META,
} from '../types';

describe('getACWRZone', () => {
  it('ratio=0.5 → undertrained (紫)', () => {
    const z = getACWRZone(0.5);
    expect(z.label).toBe('恢复期');
    expect(z.cn).toBe('Detraining');
    expect(z.color).toBe('#a855f7');
  });

  it('ratio=1.0 → sweet_spot (绿)', () => {
    const z = getACWRZone(1.0);
    expect(z.label).toBe('最佳提升');
    expect(z.cn).toBe('Optimal');
    expect(z.color).toBe('#22c55e');
  });

  it('ratio=1.4 → caution (橙)', () => {
    const z = getACWRZone(1.4);
    expect(z.label).toBe('过度训练');
    expect(z.cn).toBe('Overreaching');
    expect(z.color).toBe('#f97316');
  });

  it('ratio=1.8 → high_risk (蓝)', () => {
    const z = getACWRZone(1.8);
    expect(z.label).toBe('高危预警');
    expect(z.cn).toBe('High Risk');
    expect(z.color).toBe('#3b82f6');
  });

  it('ratio=null → 默认 undertrained', () => {
    const z = getACWRZone(null);
    expect(z.label).toBe('恢复期');
  });

  it('ratio=0 → 边界 (0 不在区间内, 走 fallback)', () => {
    const z = getACWRZone(0);
    expect(z).toBeDefined();
  });
});

describe('acwrZoneAdvice', () => {
  it('null → 建议从低强度恢复', () => {
    const a = acwrZoneAdvice(null);
    expect(a).toMatch(/28 天无训练/);
  });

  it('< 0.8 → 训练不足', () => {
    expect(acwrZoneAdvice(0.5)).toMatch(/训练负荷偏低/);
  });

  it('0.8-1.3 → 维持训练', () => {
    expect(acwrZoneAdvice(1.0)).toMatch(/维持训练/);
  });

  it('1.3-1.5 → 减量 20%', () => {
    expect(acwrZoneAdvice(1.4)).toMatch(/减少 20%/);
  });

  it('> 1.5 → 紧急减量 50%', () => {
    expect(acwrZoneAdvice(1.8)).toMatch(/紧急减量/);
  });
});

describe('ACWR_ZONES', () => {
  it('包含 4 个区间 (4 个 status 状态)', () => {
    expect(ACWR_ZONES.length).toBe(4);
  });

  it('区间连续无重叠', () => {
    for (let i = 1; i < ACWR_ZONES.length; i++) {
      expect(ACWR_ZONES[i].min).toBeCloseTo(ACWR_ZONES[i - 1].max, 5);
    }
  });

  it('每个 zone 有 color/label/cn', () => {
    ACWR_ZONES.forEach((z) => {
      expect(z.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(z.label.length).toBeGreaterThan(0);
      expect(z.cn.length).toBeGreaterThan(0);
    });
  });
});

describe('ACWR_STATUS_LABEL', () => {
  it('5 个状态全覆盖', () => {
    expect(Object.keys(ACWR_STATUS_LABEL)).toEqual([
      'sweet_spot',
      'undertrained',
      'caution',
      'high_risk',
      'unknown',
    ]);
  });

  it('每个状态有 text + color', () => {
    Object.values(ACWR_STATUS_LABEL).forEach((s) => {
      expect(s.text.length).toBeGreaterThan(0);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe('HR_ZONE_META', () => {
  it('5 区齐全 (z1-z5)', () => {
    expect(Object.keys(HR_ZONE_META)).toEqual(['z1', 'z2', 'z3', 'z4', 'z5']);
  });

  it('每区有 hrr 百分比 + color', () => {
    Object.values(HR_ZONE_META).forEach((z) => {
      expect(z.hrr.length).toBeGreaterThan(0);
      expect(z.color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
