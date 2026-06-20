import React from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import { Sparkline, type SparklinePoint } from '@/components/Sparkline';
import { IconBolt, IconArrowUpDown, IconHeart, IconClipboard, IconWarning } from '@/components/Icons';
import {
  getACWRZone,
  acwrZoneAdvice,
  ACWR_STATUS_LABEL,
  ACWR_ZONES,
  TSB_STATUS_LABEL,
  tsbStatusAdvice,
  HR_ZONE_META,
  type TrainingLoad,
  type TrainingAdvice,
} from '@/components/Training';
import trainingLoadData from '@/static/training_load.json';
import trainingAdviceData from '@/static/training_advice.json';

const load = trainingLoadData as TrainingLoad;
const advice = trainingAdviceData as TrainingAdvice;
const ACWR_TOTAL_SPAN = 0.8 + 0.5 + 0.2 + 0.5;
const ACWR_DISPLAY_MAX = 2.0;
const TSB_LOW = -30;
const TSB_HIGH = 30;

const SEV_COLORS: Record<string, string> = {
  high: '#FF2D55',
  low: '#FF9500',
  info: '#30D158',
};

function sevColor(s: string): string {
  return SEV_COLORS[s] || '#6b6b6b';
}

function sevLabel(s: string): string {
  return s === 'high' ? '紧急' : s === 'low' ? '关注' : '提示';
}

const acwr = load.acwr;
const tsb = load.tsb;
const hasAcwr = acwr.ratio !== null && acwr.ratio > 0;
const hasTsb = tsb.tsb !== null && !isNaN(tsb.tsb);
const acwrZone = getACWRZone(acwr.ratio);
const acwrBadge = ACWR_STATUS_LABEL[acwr.status];
const tsbBadge = TSB_STATUS_LABEL[tsb.status];
const acwrPercent = hasAcwr ? Math.min(100, ((acwr.ratio as number) / ACWR_DISPLAY_MAX) * 100) : 0;
const tsbClamped = Math.max(TSB_LOW, Math.min(TSB_HIGH, tsb.tsb));
const tsbPercent = ((tsbClamped - TSB_LOW) / (TSB_HIGH - TSB_LOW)) * 100;
const hrZones = load.hr_zones;
const zoneEntries = [
  { key: 'z1' as const, pct: hrZones.z1_recovery },
  { key: 'z2' as const, pct: hrZones.z2_aerobic_base },
  { key: 'z3' as const, pct: hrZones.z3_aerobic },
  { key: 'z4' as const, pct: hrZones.z4_threshold },
  { key: 'z5' as const, pct: hrZones.z5_anaerobic },
];
const totalPct = zoneEntries.reduce((s, z) => s + z.pct, 0) || 1;
const trimpSeries: SparklinePoint[] = (load as any).daily_trimp_series || [];

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const statItemStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)',
  borderRadius: 12,
  padding: '12px 14px',
};

const scaleLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 4,
  fontSize: 10,
  fontWeight: 600,
};

const TrainingPage: React.FC = () => (
  <Layout>
    <Helmet>
      <title>训练负荷 · 运动集市</title>
    </Helmet>
    <div data-kinetic className="k-page">
      <header className="k-page-header">
        <h1 className="k-page-title">训练负荷</h1>
        <p className="k-page-subtitle">ACWR · TSB · HR 5 区 · rule-based 训练建议</p>
        <div className="k-data-window">
          数据窗口 · {load.data_window.earliest} → {load.data_window.latest} · {load.data_window.total_activities} 个活动
        </div>
      </header>

      <div className="k-bento">
        {/* ── ACWR ── */}
        <div className="k-card k-bento-wide">
          <div className="k-card-header">
            <div className="k-card-header-left">
              <div className="k-card-icon"><IconBolt size={18} color="#30D158" /></div>
              <div className="k-card-text">
                <div className="k-card-kicker">Banister TRIMP · Gabbett 7/28</div>
                <h3 className="k-card-title">ACWR 训练负荷</h3>
              </div>
            </div>
            <span className="k-badge" style={{ background: acwrBadge.color, color: '#000' }}>
              {acwrBadge.text}
            </span>
          </div>

          {hasAcwr ? (
            <>
              <div className="k-data-number k-data-number-lg" style={{ color: acwrZone.color, textAlign: 'center' }}>
                {acwr.ratio!.toFixed(2)}
              </div>

              <div>
                <div className="k-label">ACWR 风险区间 0 — 2.0</div>
                <div className="k-scale">
                  {ACWR_ZONES.map((z, i) => {
                    const span = z.max === 99 ? 0.5 : (z.max - z.min);
                    const widthPct = (span / ACWR_TOTAL_SPAN) * 100;
                    return <div key={i} className="k-scale-seg" style={{ background: z.color, width: `${widthPct}%` }} />;
                  })}
                </div>
                <div className="k-scale-labels">
                  {ACWR_ZONES.map((z, i) => {
                    const span = z.max === 99 ? 0.5 : (z.max - z.min);
                    const widthPct = (span / ACWR_TOTAL_SPAN) * 100;
                    return <span key={i} style={{ color: z.color, width: `${widthPct}%` }}>{z.min}–{z.max === 99 ? '∞' : z.max}</span>;
                  })}
                </div>
                <div className="k-scale-marker-wrap">
                  <div className="k-scale-marker" style={{ left: `${acwrPercent}%`, background: acwrZone.color }} />
                </div>
              </div>

              <div style={statsGridStyle}>
                <div style={statItemStyle}>
                  <div className="k-stat-label">7d acute</div>
                  <div className="k-stat-value">{Math.round(acwr.acute_7d_trimp).toLocaleString()}<span className="k-data-unit">TRIMP</span></div>
                  <div className="k-stat-sub">{acwr.acute_days_with_data} 天有数据</div>
                </div>
                <div style={statItemStyle}>
                  <div className="k-stat-label">28d chronic</div>
                  <div className="k-stat-value">{Math.round(acwr.chronic_28d_trimp).toLocaleString()}<span className="k-data-unit">TRIMP</span></div>
                  <div className="k-stat-sub">{acwr.chronic_days_with_data} 天有数据</div>
                </div>
              </div>

              {trimpSeries.length > 0 && (
                <div className="k-sparkline-wrap">
                  <div className="k-sparkline-label">每日 TRIMP · 近 42 天</div>
                  <Sparkline data={trimpSeries} color="#30D158" height={36} />
                </div>
              )}
            </>
          ) : (
            <div className="k-empty">近 28 天心率数据不足</div>
          )}

          <div className="k-guidance">
            <span className="k-guidance-badge">训练建议</span>
            <p className="k-guidance-text">{acwrZoneAdvice(acwr.ratio)}</p>
            {acwr.warning && (
              <p className="k-guidance-text" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconWarning size={16} color="#FF9500" />
                {acwr.warning}
              </p>
            )}
          </div>

          <div className="k-card-footer">更新于 {new Date(load.generated_at).toLocaleString('zh-CN', { hour12: false })}</div>
        </div>

        {/* ── TSB ── */}
        <div className="k-card k-bento-narrow">
          <div className="k-card-header">
            <div className="k-card-header-left">
              <div className="k-card-icon"><IconArrowUpDown size={18} color="#AF52DE" /></div>
              <div className="k-card-text">
                <div className="k-card-kicker">Coggan · CTL 42d / ATL 7d</div>
                <h3 className="k-card-title">TSB 训练状态</h3>
              </div>
            </div>
            <span className="k-badge" style={{ background: tsbBadge.color, color: '#000' }}>
              {tsbBadge.text}
            </span>
          </div>

          {hasTsb ? (
            <div className="k-data-number" style={{ color: tsbBadge.color, textAlign: 'center' }}>
              {tsb.tsb > 0 ? '+' : ''}{tsb.tsb.toFixed(1)}
            </div>
          ) : (
            <div className="k-empty">数据不足</div>
          )}

          <div>
            <div className="k-label">疲劳 ← 状态 → 恢复</div>
            <div className="k-scale">
              <div className="k-scale-seg" style={{ flex: 3, background: '#FF2D55' }} />
              <div className="k-scale-seg" style={{ flex: 2, background: '#FF9500' }} />
              <div className="k-scale-seg" style={{ flex: 4, background: '#6366f1' }} />
              <div className="k-scale-seg" style={{ flex: 2, background: '#30D158' }} />
              <div className="k-scale-seg" style={{ flex: 4, background: '#30D158' }} />
            </div>
            <div className="k-scale-labels">
              <span style={{ color: '#FF2D55' }}>–30</span>
              <span style={{ color: '#FF9500' }}>–15</span>
              <span style={{ color: '#6366f1' }}>–5</span>
              <span style={{ color: '#30D158' }}>15</span>
              <span style={{ color: '#30D158' }}>30</span>
            </div>
            <div className="k-scale-marker-wrap">
              {hasTsb && <div className="k-scale-marker" style={{ left: `${tsbPercent}%`, background: tsbBadge.color }} />}
            </div>
          </div>

          <div style={statsGridStyle}>
            <div style={statItemStyle}>
              <div className="k-stat-label">CTL 体能</div>
              <div className="k-stat-value">{tsb.ctl.toFixed(1)}<span className="k-data-unit">TRIMP/d</span></div>
              <div className="k-stat-sub">42d 指数平均</div>
            </div>
            <div style={statItemStyle}>
              <div className="k-stat-label">ATL 疲劳</div>
              <div className="k-stat-value">{tsb.atl.toFixed(1)}<span className="k-data-unit">TRIMP/d</span></div>
              <div className="k-stat-sub">7d 指数平均</div>
            </div>
          </div>

          <div className="k-guidance">
            <span className="k-guidance-badge">状态解读</span>
            <p className="k-guidance-text">{tsbStatusAdvice(hasTsb ? tsb.tsb : null)}</p>
          </div>

          <div className="k-card-footer">TSB = CTL − ATL</div>
        </div>

        {/* ── HR 5 区间 ── */}
        <div className="k-card k-bento-narrow">
          <div className="k-card-header">
            <div className="k-card-header-left">
              <div className="k-card-icon"><IconHeart size={18} color="#FF2D55" /></div>
              <div className="k-card-text">
                <div className="k-card-kicker">Karvonen HRR · {hrZones.window_days || 90}d</div>
                <h3 className="k-card-title">HR 5 区间</h3>
              </div>
            </div>
            <span className="k-badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
              Z{hrZones.dominant_zone.slice(-1)} 主导
            </span>
          </div>

          <div>
            <div className="k-scale" style={{ height: 28 }}>
              {zoneEntries.map((z) => (
                <div key={z.key} className="k-scale-seg" style={{ flex: z.pct, background: HR_ZONE_META[z.key]?.color, minWidth: z.pct > 0 ? 4 : 0 }} />
              ))}
            </div>
            <div className="k-hr-legend">
              {zoneEntries.filter((z) => z.pct > 0).map((z) => {
                const meta = HR_ZONE_META[z.key];
                return (
                  <div key={z.key} className="k-hr-legend-item">
                    <span className="k-hr-legend-dot" style={{ background: meta?.color }} />
                    <span className="k-hr-legend-label">{meta?.label}</span>
                    <span className="k-hr-legend-value">{(z.pct / totalPct * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={statsGridStyle}>
            <div style={statItemStyle}>
              <div className="k-stat-label">Z2 占比</div>
              <div className="k-stat-value" style={{ color: hrZones.z2_pct >= 60 ? '#30D158' : '#FF9500' }}>
                {hrZones.z2_pct.toFixed(1)}<span className="k-data-unit">%</span>
              </div>
              <div className="k-stat-sub">{hrZones.z2_pct >= 60 ? '✓ 合理' : '需加强'}</div>
            </div>
            <div style={statItemStyle}>
              <div className="k-stat-label">极化指数</div>
              <div className="k-stat-value">{hrZones.polarized_pct.toFixed(0)}<span className="k-data-unit">%</span></div>
              <div className="k-stat-sub">{hrZones.polarized_pct >= 70 ? '极化合理' : '常规分布'}</div>
            </div>
          </div>

          <div className="k-card-footer">{hrZones.activities_with_hr} 个活动有心率 · {hrZones.window_days || 90}d 窗口</div>
        </div>

        {/* ── 训练建议 ── */}
        <div className="k-card k-bento-wide">
          <div className="k-card-header">
            <div className="k-card-header-left">
              <div className="k-card-icon"><IconClipboard size={18} color="#007AFF" /></div>
              <div className="k-card-text">
                <div className="k-card-kicker">Rule-based · 0 LLM</div>
                <h3 className="k-card-title">训练建议</h3>
              </div>
            </div>
            <span className="k-badge" style={{
              background: advice.overall_severity === 'high' ? '#FF2D55' : advice.overall_severity === 'low' ? '#FF9500' : 'rgba(255,255,255,0.08)',
              color: advice.overall_severity === 'high' || advice.overall_severity === 'low' ? '#fff' : 'rgba(255,255,255,0.7)',
            }}>
              {advice.advice_count} 条
            </span>
          </div>

          <div className="k-guidance">
            <span className="k-guidance-badge">总览</span>
            <p className="k-guidance-text">{advice.overall_summary}</p>
          </div>

          <ul className="k-advice-list">
            {advice.advice_items.map((item) => (
              <li key={item.id} className="k-advice-item" style={{ borderLeftColor: sevColor(item.severity) }}>
                <div className="k-advice-item-header">
                  <span className="k-advice-item-category">{item.category}</span>
                  <span className="k-advice-item-badge" style={{ background: sevColor(item.severity) }}>
                    {sevLabel(item.severity)}
                  </span>
                </div>
                <p className="k-advice-item-title">{item.title}</p>
                <p className="k-advice-item-desc">{item.description}</p>
                <div className="k-advice-item-action">
                  <span className="k-advice-item-action-label">行动 </span>{item.action}
                </div>
                <div>
                  <span className="k-advice-item-evidence-label">依据 </span>
                  <span className="k-advice-item-evidence">{item.evidence}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="k-card-footer">{advice.source} · {advice.method}</div>
        </div>
      </div>

      <footer className="k-formula-footer">
        <details>
          <summary>算法说明</summary>
          <div className="k-formula-grid">
            <div>
              <strong>Banister TRIMP (1991)</strong>
              <p>TRIMP = 时长 × y × 0.64 × exp(1.92 × y), y = (HRavg − HRrest) / (HRmax − HRrest)</p>
            </div>
            <div>
              <strong>Karvonen 5 区</strong>
              <p>Z1 &lt; 60% / Z2 60–70% / Z3 70–80% / Z4 80–90% / Z5 90%+</p>
            </div>
            <div>
              <strong>Gabbett ACWR (1998)</strong>
              <p>ACWR = 7d TRIMP / 28d TRIMP · &lt; 0.8 不足 / 0.8–1.3 最佳 / 1.3–1.5 注意 / &gt; 1.5 高危</p>
            </div>
            <div>
              <strong>Coggan TSB (2003)</strong>
              <p>TSB = CTL(42d EMA) − ATL(7d EMA) · &gt;15 恢复 / –5~15 最佳 / –15~–5 疲劳 / &lt;–15 过度</p>
            </div>
            <div>
              <strong>HRmax / HRrest</strong>
              <p>HRmax = {load.config.hr_max} · HRrest = {load.config.hr_rest}</p>
            </div>
          </div>
        </details>
      </footer>
    </div>
  </Layout>
);

export default TrainingPage;
