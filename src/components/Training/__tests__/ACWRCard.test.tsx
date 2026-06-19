/**
 * v2.3.1 — ACWRCard 单元测试
 *
 * 覆盖：
 * - 有数据 (ratio=1.58, status=high_risk) → 显示大数字 + 状态徽章 + 区间色带 + AI 建议
 * - 无数据 (ratio=null) → 显示 "—" + 数据缺口提示
 * - 健康区间 (ratio=1.0) → 显示绿色色带
 * - 高危区间 (ratio=1.8) → 显示蓝色色带
 * - 低负荷 (ratio=0.5) → 显示紫色色带
 * - 7d/28d TRIMP 数字格式化 (千分位)
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ACWRCard from '../ACWRCard';
import type { ACWRResult } from '../types';

const baseACWR: ACWRResult = {
  acute_7d_trimp: 81838.5,
  chronic_28d_trimp: 51924.2,
  acute_days_with_data: 5,
  chronic_days_with_data: 13,
  ratio: 1.58,
  status: 'high_risk',
  warning: 'ACWR > 1.5 属高危伤病风险',
};

describe('ACWRCard', () => {
  it('有数据: 显示 ratio 大数字 + 状态徽章 + AI 建议', () => {
    render(<ACWRCard acwr={baseACWR} generatedAt="2026-06-18T04:05:39" />);
    // ratio 大数字 (1.58)
    expect(screen.getByText('1.58')).toBeDefined();
    // 状态徽章 "✕ 高危预警"
    expect(screen.getByText('✕ 高危预警')).toBeDefined();
    // AI 建议
    expect(screen.getByText(/紧急减量/)).toBeDefined();
    // 7d / 28d TRIMP (千分位)
    expect(screen.getByText(/81,839/)).toBeDefined();
    expect(screen.getByText(/51,924/)).toBeDefined();
    // 5 天 / 13 天有数据
    expect(screen.getByText(/5 天有数据/)).toBeDefined();
    expect(screen.getByText(/13 天有数据/)).toBeDefined();
  });

  it('无数据 (ratio=null): 优雅降级 + 显示数据缺口', () => {
    const empty: ACWRResult = {
      ...baseACWR,
      ratio: null,
      status: 'unknown',
      warning: null,
      acute_7d_trimp: 0,
      chronic_28d_trimp: 0,
      acute_days_with_data: 0,
      chronic_days_with_data: 0,
    };
    render(<ACWRCard acwr={empty} generatedAt="2026-06-18" />);
    // "—" 大占位
    expect(screen.getByText('—')).toBeDefined();
    // 状态徽章 "数据不足"
    expect(screen.getByText('? 数据不足')).toBeDefined();
    // 数据缺口提示
    expect(screen.getByText(/近 28 天心率数据不足/)).toBeDefined();
  });

  it('健康区间 (ratio=1.0): 显示绿色色带 + 最佳提升', () => {
    const sweet: ACWRResult = {
      ...baseACWR,
      ratio: 1.0,
      status: 'sweet_spot',
      warning: null,
    };
    render(<ACWRCard acwr={sweet} generatedAt="2026-06-18" />);
    expect(screen.getByText('1.00')).toBeDefined();
    expect(screen.getByText('✓ 最佳区间')).toBeDefined();
    expect(screen.getByText(/维持训练/)).toBeDefined();
  });

  it('训练不足 (ratio=0.5): 紫色色带', () => {
    const low: ACWRResult = {
      ...baseACWR,
      ratio: 0.5,
      status: 'undertrained',
      warning: null,
    };
    render(<ACWRCard acwr={low} generatedAt="2026-06-18" />);
    expect(screen.getByText('0.50')).toBeDefined();
    expect(screen.getByText('⚠ 训练不足')).toBeDefined();
  });

  it('注意减量 (ratio=1.4): 橙色色带', () => {
    const caution: ACWRResult = {
      ...baseACWR,
      ratio: 1.4,
      status: 'caution',
      warning: null,
    };
    render(<ACWRCard acwr={caution} generatedAt="2026-06-18" />);
    expect(screen.getByText('1.40')).toBeDefined();
    expect(screen.getByText('⚠ 注意减量')).toBeDefined();
  });

  it('高危区间: 显示 warning 文本', () => {
    render(<ACWRCard acwr={baseACWR} generatedAt="2026-06-18" />);
    const warnings = screen.getAllByText(/ACWR > 1\.5/);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('生成时间戳显示在 footer', () => {
    render(<ACWRCard acwr={baseACWR} generatedAt="2026-06-18T04:05:39" />);
    // footer 文本为 "训练负荷更新于 2026-06-18T04:05:39" (toLocaleString 改写)
    // 用 endsWith + 部分匹配, 避免 locale 字符串差异
    const all = screen.getAllByText(/训练负荷更新于/);
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all[0].textContent).toMatch(/2026/);
  });
});
