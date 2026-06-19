/**
 * v2.3.1 — AdviceListCard 单元测试
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdviceListCard from '../AdviceListCard';
import type { TrainingAdvice } from '../types';

const baseAdvice: TrainingAdvice = {
  generated_at: '2026-06-18T04:05:39',
  overall_status: 'urgent',
  overall_severity: 'high',
  overall_summary: '⚠️ 重点关注: 数据完整度不足',
  advice_count: 3,
  advice_items: [
    {
      id: 'data_completeness',
      category: 'data',
      severity: 'high',
      title: '数据完整度不足',
      description: '近 7d 仅 0 天有数据',
      action: '建议: 跑步时佩戴心率设备',
      evidence: '7d 0 天 / 28d 0 天',
    },
    {
      id: 'acwr_unknown',
      category: 'load',
      severity: 'info',
      title: '训练负荷数据不足',
      description: '无法计算 ACWR',
      action: '继续训练积累心率数据',
      evidence: '7d 0 天有数据',
    },
    {
      id: 'z2_insufficient_hr',
      category: 'intensity',
      severity: 'info',
      title: '心率数据不足',
      description: '近 90 天 0 个活动有 HR',
      action: '确保跑步时佩戴心率设备',
      evidence: '90 天窗口 0 个活动',
    },
  ],
  data_window: { earliest: '2019-05-25', latest: '2026-06-17', total_activities: 677 },
  config: {
    hr_max: 197,
    hr_rest: 60,
    method_hr_zones: 'Karvonen HRR',
    method_load: 'Banister TRIMP',
    method_acwr: 'Gabbett 7d/28d',
    thresholds: { acwr_under: 0.8, acwr_sweet_spot: [0.8, 1.3], acwr_caution: 1.5 },
  },
  source: 'training_load.json (v2.2.8) + rule-based engine (v2.2.9)',
  method: '0 LLM, 纯 stdlib rule-based 推导',
};

describe('AdviceListCard', () => {
  it('有建议: 渲染总览摘要 + 列表', () => {
    render(<AdviceListCard advice={baseAdvice} />);
    // 总览摘要
    expect(screen.getByText(/重点关注/)).toBeDefined();
    // 建议数
    expect(screen.getByText('3 条')).toBeDefined();
    // 3 条建议标题
    expect(screen.getByText('数据完整度不足')).toBeDefined();
    expect(screen.getByText('训练负荷数据不足')).toBeDefined();
    expect(screen.getByText('心率数据不足')).toBeDefined();
  });

  it('高危 severity 渲染红色徽章 + 边框', () => {
    render(<AdviceListCard advice={baseAdvice} />);
    // "紧急" 同时出现在 summary icon + 徽章里, 用 getAllByText
    const urgent = screen.getAllByText(/✕ 紧急/);
    expect(urgent.length).toBeGreaterThanOrEqual(1);
  });

  it('info severity 渲染蓝色徽章', () => {
    render(<AdviceListCard advice={baseAdvice} />);
    const infoBadges = screen.getAllByText(/ℹ 提示/);
    expect(infoBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('建议卡片包含 action + evidence', () => {
    render(<AdviceListCard advice={baseAdvice} />);
    // "跑步时佩戴心率设备" 出现 2 次 (1× action + 1× action for 另一条)
    const matches = screen.getAllByText(/跑步时佩戴心率设备/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // evidence 文本
    const ev = screen.getAllByText(/7d 0 天/);
    expect(ev.length).toBeGreaterThanOrEqual(1);
  });

  it('空 advice_items: 显示空态', () => {
    const empty: TrainingAdvice = {
      ...baseAdvice,
      advice_count: 0,
      advice_items: [],
      overall_status: 'good',
      overall_summary: '✓ 一切正常',
    };
    render(<AdviceListCard advice={empty} />);
    expect(screen.getByText('暂无建议')).toBeDefined();
    expect(screen.getByText('0 条')).toBeDefined();
  });

  it('footer 显示 method + source', () => {
    render(<AdviceListCard advice={baseAdvice} />);
    // footer 文本 "0 LLM, 纯 stdlib rule-based 推导 · training_load.json ..."
    const matches = screen.getAllByText(/rule-based 推导/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
