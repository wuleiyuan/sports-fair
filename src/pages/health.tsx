import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import { Sparkline, type SparklinePoint } from '@/components/Sparkline';
import { IconHeart, IconMoon, IconWave, IconSleep, IconWalk } from '@/components/Icons';
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

type MetricKey = 'hr' | 'rhr' | 'hrv' | 'sleep' | 'steps';

const METRIC_CONFIG: Record<MetricKey, { label: string; icon: React.FC<{ size?: number; color?: string }>; color: string; sparkColor: string; unit: string }> = {
  hr:    { label: '心率（HR）', icon: IconHeart, color: '#FF2D55', sparkColor: '#FF2D55', unit: 'bpm' },
  rhr:   { label: '静息心率（RHR）', icon: IconMoon, color: '#FF9500', sparkColor: '#FF9500', unit: 'bpm' },
  hrv:   { label: '心率变异性（HRV）', icon: IconWave, color: '#AF52DE', sparkColor: '#AF52DE', unit: 'ms' },
  sleep: { label: '睡眠', icon: IconSleep, color: '#007AFF', sparkColor: '#007AFF', unit: 'h' },
  steps: { label: '步数', icon: IconWalk, color: '#30D158', sparkColor: '#30D158', unit: '' },
};

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

  const metrics: { key: MetricKey; main: string; sub: string; foot: string; spark: SparklinePoint[] }[] = [
    { key: 'hr', main: `${ts.hr.median.toFixed(1)}`, sub: `均值 ${ts.hr.mean_all.toFixed(1)} · 最高 ${ts.hr.max_ever.toFixed(0)}`, foot: `${ts.hr.days_with_data} 天`, spark: trends.hr || [] },
    { key: 'rhr', main: `${ts.rhr.median.toFixed(1)}`, sub: `均值 ${ts.rhr.mean_all.toFixed(1)} · 最低 ${ts.rhr.min_ever.toFixed(0)}`, foot: `${ts.rhr.days_with_data} 天`, spark: trends.rhr || [] },
    { key: 'hrv', main: `${ts.hrv.median.toFixed(1)}`, sub: `均值 ${ts.hrv.mean_all.toFixed(1)}`, foot: `${ts.hrv.days_with_data} 天`, spark: trends.hrv || [] },
    { key: 'sleep', main: `${ts.sleep.median_hours.toFixed(2)}`, sub: '中位数每晚', foot: `${ts.sleep.days_with_data} 晚`, spark: trends.sleep || [] },
    { key: 'steps', main: `${(ts.steps.total / 10000).toFixed(0)}`, sub: `日均 ${ts.steps.mean_daily.toLocaleString()}`, foot: `${ts.steps.days_with_data} 天`, spark: trends.steps || [] },
  ];

  return (
    <Layout>
      <Helmet>
        <title>健康分析 · Sports Fair</title>
      </Helmet>

      <div data-kinetic className="k-page">
        <header className="k-page-header">
          <h1 className="k-page-title">健康分析</h1>
          <p className="k-page-subtitle">Apple HealthKit · {data.generated_at.slice(0, 10)}</p>
          <div className="k-data-window">
            {ts.hr.days_with_data} 天 HR · {ts.rhr.days_with_data} 天 RHR · {ts.hrv.days_with_data} 天 HRV · {ts.sleep.days_with_data} 晚睡眠
          </div>
        </header>

        <div className="k-bento">
          {metrics.map((m) => {
            const cfg = METRIC_CONFIG[m.key];
            const Icon = cfg.icon;
            return (
              <div key={m.key} className="k-card k-bento-narrow">
                <div className="k-card-header">
                  <div className="k-card-header-left">
                    <div className="k-card-icon"><Icon size={18} color={cfg.color} /></div>
                    <div className="k-card-text">
                      <div className="k-card-kicker" style={{ color: cfg.color }}>{m.key.toUpperCase()}</div>
                      <h3 className="k-card-title">{cfg.label}</h3>
                    </div>
                  </div>
                </div>

                <div className="k-data-number" style={{ color: cfg.color }}>
                  {m.main}
                  <span className="k-data-unit">{cfg.unit}</span>
                </div>

                {m.spark.length > 0 && (
                  <div className="k-sparkline-wrap">
                    <Sparkline data={m.spark} color={cfg.sparkColor} height={32} />
                  </div>
                )}

                <div className="k-guidance" style={{ padding: '10px 14px' }}>
                  <p className="k-guidance-text" style={{ fontSize: 13 }}>{m.sub}</p>
                  <p className="k-guidance-text" style={{ fontSize: 12, marginTop: 4, color: 'var(--a-text-tertiary)' }}>{m.foot}</p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="k-section">
          <h2 className="k-section-title">按年汇总</h2>
          <div className="k-table-wrap">
            <table className="k-table">
              <thead>
                <tr>
                  <th>年份</th>
                  <th>HR 均值</th>
                  <th>HRV 均值</th>
                  <th>睡眠中位</th>
                  <th>日均步数</th>
                  <th>总步数</th>
                  <th>天数</th>
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

        <section className="k-section">
          <h2 className="k-section-title">Dashboard</h2>
          <div className="k-svg-wrap">
            <object data={healthSvgUrl} type="image/svg+xml" className="k-svg-embed" aria-label="Health dashboard">
              <a href={healthSvgUrl}>下载 health.svg</a>
            </object>
          </div>
        </section>

        <footer className="k-formula-footer">
          <details>
            <summary>数据说明</summary>
            <p style={{ margin: '8px 0', lineHeight: 1.6 }}>
              来源 Apple HealthKit（2020-05 至今）<br />
              异常值过滤：HR 30–220 / HRV 10–200 / 睡眠 1–14h
            </p>
          </details>
        </footer>
      </div>
    </Layout>
  );
};

export default HealthPage;
