/**
 * v2.3.1 — HRZonesCard 单元测试
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HRZonesCard from '../HRZonesCard';
import type { HRZones } from '../types';

const baseHRZones: HRZones = {
  z1_recovery: 50.3,
  z2_aerobic_base: 25.1,
  z3_aerobic: 21.6,
  z4_threshold: 0.0,
  z5_anaerobic: 3.0,
  dominant_zone: 'z1',
  z2_pct: 25.1,
  polarized_pct: 75.4,
  activities_with_hr: 32,
  window_days: 90,
};

describe('HRZonesCard', () => {
  it('有 HR 数据: 渲染 5 区 stacked bar + 关键指标', () => {
    render(<HRZonesCard hrZones={baseHRZones} />);
    // 主导区间徽章
    expect(screen.getByText(/主导: Z1 恢复/)).toBeDefined();
    // 5 区 label (Z1-Z5)
    expect(screen.getAllByText(/Z[1-5]/)).toBeDefined();
    // 极化训练 % = 75.4
    expect(screen.getByText('75.4%')).toBeDefined();
    // Z2 有氧底座
    expect(screen.getByText('25.1%')).toBeDefined();
  });

  it('无 HR 数据: 友好空态', () => {
    const empty: HRZones = {
      ...baseHRZones,
      activities_with_hr: 0,
      z1_recovery: 0,
      z2_aerobic_base: 0,
      z3_aerobic: 0,
      z4_threshold: 0,
      z5_anaerobic: 0,
      z2_pct: 0,
      polarized_pct: 0,
      dominant_zone: 'n/a',
    };
    render(<HRZonesCard hrZones={empty} />);
    // 空态徽章
    expect(screen.getByText('无 HR 数据')).toBeDefined();
    // 空态提示
    expect(screen.getByText(/近 90 天无 HR 数据/)).toBeDefined();
  });

  it('极化训练 >= 70%: 显示 "极化训练合理"', () => {
    render(<HRZonesCard hrZones={baseHRZones} />);
    // "极化训练合理" 出现 2 处 (key value + hint)
    const matches = screen.getAllByText('✓ 极化训练合理');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('极化训练 < 50%: 显示警告', () => {
    const lowPolarized: HRZones = {
      ...baseHRZones,
      polarized_pct: 30,
      z1_recovery: 10,
      z2_aerobic_base: 20,
    };
    render(<HRZonesCard hrZones={lowPolarized} />);
    expect(screen.getByText('? Z1+Z2 比例不足')).toBeDefined();
  });

  it('Z2 >= 40%: 显示 "充足"', () => {
    const richZ2: HRZones = {
      ...baseHRZones,
      z2_pct: 50,
    };
    render(<HRZonesCard hrZones={richZ2} />);
    expect(screen.getByText('✓ 充足')).toBeDefined();
  });

  it('Z2 < 25%: 显示 "不足"', () => {
    const poorZ2: HRZones = {
      ...baseHRZones,
      z2_pct: 10,
    };
    render(<HRZonesCard hrZones={poorZ2} />);
    expect(screen.getByText('✕ 不足')).toBeDefined();
  });

  it('footer 显示活动数 + 窗口天数', () => {
    render(<HRZonesCard hrZones={baseHRZones} />);
    // "基于 32 个有 HR 的活动（近 90 天）"
    const matches = screen.getAllByText(/基于 32 个有 HR 的活动/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const days = screen.getAllByText(/近 90 天/);
    expect(days.length).toBeGreaterThanOrEqual(1);
  });
});
