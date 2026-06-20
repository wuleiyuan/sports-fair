import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import { useTheme } from '@/hooks/useTheme';
import AssessmentCard from '@/components/HealthAssessment/AssessmentCard';
import AIDiagnosticsPanel from '@/components/HealthAssessment/AIDiagnosticsPanel';
import { SkeletonText } from '@/components/Skeleton';
import {
  assessHealth,
  fetchAIGuidanceWithCache,
  loadProviderPref,
  saveProviderPref,
  type AssessmentBundle,
  type AIGuidanceResponse,
  type LLMProvider,
} from '@/utils/healthAssessment';

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  mimo: 'MiMo (小米)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

const HealthAssessPage: React.FC = () => {
  const { theme } = useTheme();
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [provider, setProviderState] = useState<LLMProvider>(() => loadProviderPref());
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [aiResponse, setAiResponse] = useState<AIGuidanceResponse | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const bundle: AssessmentBundle = useMemo(
    () => assessHealth({ windowDays }),
    [windowDays]
  );

  const setProvider = (p: LLMProvider) => {
    setProviderState(p);
    saveProviderPref(p);
  };

  const isEmptyData = bundle.cards.every(
    (c) => c.status === 'nodata' || c.status === 'error'
  );

  // AI guidance
  const handleAskAI = async () => {
    if (aiState === 'loading') return;
    setAiState('loading');
    setAiResponse(null);
    try {
      const res = await fetchAIGuidanceWithCache(bundle, provider);
      if (res) {
        setAiResponse(res);
        setAiState('ok');
        setFromCache(res.fromCache ?? false);
      } else {
        setAiState('error');
        setAiResponse(null);
      }
    } catch (e: any) {
      setAiState('error');
      setAiResponse({ aiGuidance: '', error: e.message ?? 'unknown', requestId: '' });
    }
  };

  // v2.2.0: auto-ask AI on mount
  useEffect(() => {
    if (!isEmptyData && aiState === 'idle') {
      handleAskAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmptyData, bundle]);

  return (
    <Layout>
      <Helmet>
        <title>运动健康评估建议 · Sports Fair</title>
        <html lang="zh-CN" data-theme={theme} />
      </Helmet>

      <div data-kinetic className="k-page">
        <header className="k-page-header">
          <h1 className="k-page-title">运动健康评估建议</h1>
          <p className="k-page-subtitle">
            基于 Apple HealthKit（{bundle.windowDays} 天窗口）+ 训练记录综合分析
          </p>
        </header>

        {/* 时间窗口切换 */}
        <div className="k-tab-bar">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              className={`k-tab ${windowDays === d ? 'k-tab-active' : ''}`}
              onClick={() => setWindowDays(d)}
            >
              近 {d} 天
            </button>
          ))}
        </div>

        {/* LLM provider 切换 */}
        <div className="k-tab-bar" style={{ marginTop: 8 }}>
          <span className="k-tab-label">AI 模型：</span>
          {(Object.keys(PROVIDER_LABELS) as LLMProvider[]).map((p) => (
            <button
              key={p}
              className={`k-tab ${provider === p ? 'k-tab-active' : ''}`}
              onClick={() => setProvider(p)}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>

        {/* 空数据提示 */}
        {isEmptyData && (
          <div className="k-assess-banner">
            <p><strong>暂无可评估数据</strong>。请先同步 Apple HealthKit 数据，或导入运动记录（GPX / TCX / FIT 文件）。</p>
            <p className="k-assess-banner-sub">健康评估需要至少 {windowDays} 天的 {bundle.cards.length} 项核心指标。</p>
          </div>
        )}

        {/* AI 配置诊断面板 */}
        <AIDiagnosticsPanel autoOpenOnError={aiState === 'error'} />

        {/* AI 个性化建议 */}
        <section className="k-section">
          <div className="k-assess-section-header">
            <h2 className="k-section-title">
              {aiState === 'ok' ? 'AI 个性化建议' : '综合建议'}
            </h2>
            {aiState === 'ok' && aiResponse?.model && (
              <span className="k-assess-ai-badge">
                {PROVIDER_LABELS[aiResponse.provider ?? 'mimo']} · {aiResponse.model}
                {fromCache && <span className="k-assess-cache-mark"> · cached</span>}
              </span>
            )}
          </div>

          {aiState === 'loading' && (
            <div className="k-assess-text">
              <p style={{ color: '#FF8800', marginBottom: 12, fontWeight: 600 }}>
                AI 教练正在分析你的数据…
              </p>
              <SkeletonText lines={3} />
            </div>
          )}

          {aiState === 'ok' && aiResponse?.aiGuidance && (
            <div className="k-assess-text">
              {aiResponse.aiGuidance.split('\n').filter((l) => l.trim()).map((line, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '0.5em 0 0' }}>{line}</p>
              ))}
            </div>
          )}

          {aiState === 'error' && (
            <>
              <p className="k-assess-text">{bundle.overall}</p>
              <p className="k-assess-fallback">
                AI 建议暂不可用
                {aiResponse?.requestId && <code className="k-assess-code"> [{aiResponse.requestId.slice(0, 8)}]</code>}
                ：{aiResponse?.error || '未知错误'}，已显示静态建议。
              </p>
            </>
          )}

          {aiState === 'idle' && !isEmptyData && (
            <button className="k-assess-ask-btn" onClick={handleAskAI}>
              请求 AI 建议
            </button>
          )}
        </section>

        {/* 评估卡片网格 */}
        <div className="k-bento">
          {bundle.cards.map((card) => {
            const isTrainingLoad = card.key === 'training_load';
            const acwrRatio = isTrainingLoad ? parseFloat(card.main) || 0 : 0;
            return (
              <div key={card.key} className="k-bento-narrow" style={{ minWidth: 0 }}>
                <AssessmentCard
                  card={card}
                  acwrRatio={isTrainingLoad ? acwrRatio : undefined}
                />
              </div>
            );
          })}
        </div>

        {/* 医学免责声明 */}
        <footer className="k-formula-footer" style={{ marginTop: 24 }}>
          <details>
            <summary>声明</summary>
            <p style={{ margin: '8px 0', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              本评估基于公开医学/运动科学文献区间（AHA / NSF / ACWR），仅作参考。不替代医生意见。如有健康疑虑，请咨询专业医生。
            </p>
          </details>
        </footer>
      </div>
    </Layout>
  );
};

export default HealthAssessPage;
