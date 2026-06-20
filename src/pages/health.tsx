import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import { Sparkline, type SparklinePoint } from '@/components/Sparkline';
import healthStats from '@/static/health_stats.json';
import healthTrends from '@/static/health_trends.json';
import healthSvgUrl from '@assets/health.svg?url';

interface TopStats {
  hr: { mean_all: number; median: number; max_ever: number; days_with_data: number };
  rhr: { mean_all: number; median: number; min_ever: number; days_with_data: number };
  hrv: { mean_all: number; median: number; days_with_data: number };
  sleep: { median_hours: number; days_with_data: number };
  steps: { mean_daily: number; median_daily: number; total: number; days_with_data: number };
}

interface YearStat {
  hr_mean?: number;
  sleep_median_h?: number;
  steps_mean_daily?: number;
  steps_total?: number;
  hrv_mean?: number;
  days_with_data: number;
}

interface HealthStats {
  generated_at: string;
  top_stats: TopStats;
  by_year: Record<string, YearStat>;
}

interface TrendSeries {
  generated_at: string;
  hr: SparklinePoint[];
  rhr: SparklinePoint[];
  hrv: SparklinePoint[];
  sleep: SparklinePoint[];
  steps: SparklinePoint[];
}

function MetricColor(metric: string): string {
  switch (metric) {
    case 'hr': return '#ef4444';
    case 'rhr': return '#f97316';
    case 'hrv': return '#8b5cf6';
    case 'sleep': return '#3b82f6';
    case 'steps': return '#22c55e';
    default: return '#CCFF00';
  }
}

function MetricSparklineColor(metric: string): string {
  switch (metric) {
    case 'hr': return '#ef4444';
    case 'rhr': return '#f97316';
    case 'hrv': return '#a78bfa';
    case 'sleep': return '#60a5fa';
    case 'steps': return '#4ade80';
    default: return '#CCFF00';
  }
}

const HealthPage: React.FC = () => {
  const data = healthStats as HealthStats;
  const trends = healthTrends as TrendSeries;

  const yearKeys = useMemo(
    () => Object.keys(data.by_year).sort((a, b) => Number(b) - Number(a)),
    [data]
  );

  const safeByYear = useMemo(() => {
    const out: Record<string, YearStat> = {};
    for (const [y, s] of Object.entries(data.by_year)) {
      out[y] = {
        ...s,
        hr_mean: s.hr_mean !== undefined && s.hr_mean >= 30 && s.hr_mean <= 220 ? s.hr_mean : undefined,
        hrv_mean: s.hrv_mean !== undefined && s.hrv_mean >= 10 && s.hrv_mean <= 200 ? s.hrv_mean : undefined,
        sleep_median_h: s.sleep_median_h !== undefined && s.sleep_median_h >= 1 && s.sleep_median_h <= 14 ? s.sleep_median_h : undefined,
      };
    }
    return out;
  }, [data]);

  const ts = data.top_stats;

  const metrics: { key: string; label: string; main: string; sub: string; foot: string; spark: SparklinePoint[] }[] = [
    {
      key: 'hr',
      label: '心率（HR）',
      main: `${ts.hr.median.toFixed(1)} bpm`,
      sub: `均值 ${ts.hr.mean_all.toFixed(1)} · 最高 ${ts.hr.max_ever.toFixed(0)}`,
      foot: `${ts.hr.days_with_data} 天`,
      spark: trends.hr || [],
    },
    {
      key: 'rhr',
      label: '静息心率（RHR）',
      main: `${ts.rhr.median.toFixed(1)} bpm`,
      sub: `均值 ${ts.rhr.mean_all.toFixed(1)} · 最低 ${ts.rhr.min_ever.toFixed(0)}`,
      foot: `${ts.rhr.days_with_data} 天`,
      spark: trends.rhr || [],
    },
    {
      key: 'hrv',
      label: '心率变异性（HRV）',
      main: `${ts.hrv.median.toFixed(1)} ms`,
      sub: `均值 ${ts.hrv.mean_all.toFixed(1)}`,
      foot: `${ts.hrv.days_with_data} 天`,
      spark: trends.hrv || [],
    },
    {
      key: 'sleep',
      label: '睡眠',
      main: `${ts.sleep.median_hours.toFixed(2)} h`,
      sub: '中位数每晚',
      foot: `${ts.sleep.days_with_data} 晚`,
      spark: trends.sleep || [],
    },
    {
      key: 'steps',
      label: '步数',
      main: `${(ts.steps.total / 10000).toFixed(0)} 万`,
      sub: `日均 ${ts.steps.mean_daily.toLocaleString()}`,
      foot: `${ts.steps.days_with_data} 天`,
      spark: trends.steps || [],
    },
  ];

  return (
    <Layout>
      <Helmet>
        <title>健康分析 · Sports Fair</title>
      </Helmet>

      <div data-kinetic className="k-page">
        <header className="k-page-header">
          <div>
            <h1 className="k-page-title">健康分析</h1>
            <p className="k-page-subtitle">
              Apple HealthKit · {data.generated_at.slice(0, 10)}
            </p>
          </div>
          <div className="k-data-window">
            <strong>数据跨度</strong><br />
            {ts.hr.days_with_data} 天 HR · {ts.rhr.days_with_data} 天 RHR<br />
            {ts.hrv.days_with_data} 天 HRV · {ts.sleep.days_with_data} 晚睡眠
          </div>
        </header>

        <div className="k-bento">
          {metrics.map((m) => (
            <div key={m.key} className="k-card k-bento-narrow">
              <div className="k-card-header">
                <div>
                  <div className="k-card-kicker" style={{ color: MetricColor(m.key) }}>
                    ● {m.key.toUpperCase()}
                  </div>
                  <h3 className="k-card-title">{m.label}</h3>
                </div>
              </div>

              <div className="k-data-number" style={{ color: MetricColor(m.key) }}>
                {m.main}
              </div>
              <div style={{ fontSize: 12, color: 'var(--k-text-tertiary)', marginBottom: 4 }}>
                {m.sub}
              </div>

              {m.spark.length > 0 && (
                <div className="k-sparkline-wrap" style={{ marginTop: 6 }}>
                  <div className="k-sparkline-label">趋势</div>
                  <Sparkline data={m.spark} color={MetricSparklineColor(m.key)} height={32} />
                </div>
              )}

              <div className="k-stats-grid" style={{ gridTemplateColumns: '1fr', marginTop: 6 }}>
                <div className="k-stat-item">
                  <div className="k-stat-label">有数据天数</div>
                  <div className="k-stat-value" style={{ fontSize: 20 }}>{m.foot}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 按年汇总 */}
        <section className="k-section">
          <h2 className="k-section-title">按年汇总</h2>
          <div className="k-table-wrap">
            <table className="k-table">
              <thead>
                <tr>
                  <th>年份</th>
                  <th>HR 均值 (bpm)</th>
                  <th>HRV 均值 (ms)</th>
                  <th>睡眠中位 (h)</th>
                  <th>日均步数</th>
                  <th>总步数 (万)</th>
                  <th>有数据天</th>
                </tr>
              </thead>
              <tbody>
                {yearKeys.map((y) => {
                  const s = safeByYear[y];
                  return (
                    <tr key={y}>
                      <td><span className="k-table-year">{y}</span></td>
                      <td>{s.hr_mean?.toFixed(1) ?? '—'}</td>
                      <td>{s.hrv_mean?.toFixed(1) ?? '—'}</td>
                      <td>{s.sleep_median_h?.toFixed(2) ?? '—'}</td>
                      <td>{s.steps_mean_daily?.toLocaleString() ?? '—'}</td>
                      <td>{((s.steps_total ?? 0) / 10000).toFixed(0)}</td>
                      <td>{s.days_with_data}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SVG Dashboard */}
        <section className="k-section">
          <h2 className="k-section-title">Dashboard</h2>
          <div className="k-svg-wrap">
            <object
              data={healthSvgUrl}
              type="image/svg+xml"
              className="k-svg-embed"
              aria-label="Health dashboard"
            >
              <a href={healthSvgUrl}>下载 health.svg</a>
            </object>
          </div>
        </section>

        <footer className="k-formula-footer">
          <details>
            <summary>数据说明</summary>
            <p style={{ margin: '8px 0', lineHeight: 1.6 }}>
              数据来源 Apple HealthKit（2020-05 至今）<br />
              异常值已在客户端过滤（HR 30-220 / HRV 10-200 / 睡眠 1-14h）
            </p>
          </details>
        </footer>
      </div>
    </Layout>
  );
};

export default HealthPage;
