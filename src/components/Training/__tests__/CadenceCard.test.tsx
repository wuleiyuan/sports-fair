/**
 * v2.3.1 — CadenceCard 单元测试
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CadenceCard from '../CadenceCard';

describe('CadenceCard', () => {
  it('无数据 (cadence=null): 显示 "待接入" 空态 + v2.3.2 路线图', () => {
    render(<CadenceCard cadence={null} note="activities.json 无 cadence 字段" />);
    expect(screen.getByText('步频数据待接入')).toBeDefined();
    expect(screen.getByText(/activities.json 无 cadence 字段/)).toBeDefined();
    expect(screen.getByText(/v2.3.2 计划/)).toBeDefined();
    expect(screen.getByText(/keep_sync/)).toBeDefined();
  });

  it('有数据 (cadence=180): 显示 "理想"', () => {
    render(<CadenceCard cadence={180} note="" activityCount={50} />);
    expect(screen.getByText('180')).toBeDefined();
    expect(screen.getByText('spm')).toBeDefined();
    expect(screen.getByText(/✓ 理想/)).toBeDefined();
    expect(screen.getByText(/经济性最佳区间/)).toBeDefined();
  });

  it('低步频 (cadence=160): 显示 "步频偏低"', () => {
    render(<CadenceCard cadence={160} note="" />);
    expect(screen.getByText('160')).toBeDefined();
    expect(screen.getByText(/步频偏低/)).toBeDefined();
  });

  it('中等步频 (cadence=172): 显示 "可提升"', () => {
    render(<CadenceCard cadence={172} note="" />);
    expect(screen.getByText(/可提升/)).toBeDefined();
  });

  it('过高步频 (cadence=195): 显示 "偏高"', () => {
    render(<CadenceCard cadence={195} note="" />);
    expect(screen.getByText(/偏高/)).toBeDefined();
  });

  it('v2.3.2 徽章始终显示', () => {
    render(<CadenceCard cadence={null} note="" />);
    // "v2.3.2" 出现 2 次 (header badge + footer 路径提示)
    const matches = screen.getAllByText(/v2\.3\.2/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('footer 显示目标区间', () => {
    render(<CadenceCard cadence={null} note="" />);
    // "175-180 spm" 出现 2 次 (footer + 路线图)
    const matches = screen.getAllByText(/175-180 spm/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
