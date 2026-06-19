/**
 * 训练负荷看板页 (v2.3.1)
 *
 * Apple HIG Bento Box 布局：
 * - ACWR 主卡 (2x2) — 训练负荷核心
 * - HR Zones 卡 (1x1) — 心率区间分布
 * - Advice 卡 (1x1) — 训练建议列表
 * - Cadence 占位卡 (1x1) — v2.3.2 接入
 *
 * 路由: /training
 * 数据源: src/static/training_load.json + src/static/training_advice.json
 *
 * 不做医学判断（声明）
 * 数据局限: HRV 未提供，cadence 待 v2.3.2 接入
 */
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import {
  ACWRCard,
  HRZonesCard,
  AdviceListCard,
  CadenceCard,
  type TrainingLoad,
  type TrainingAdvice,
} from '@/components/Training';
import { SkeletonCard } from '@/components/Skeleton';
import styles from './training.module.css';

/** fetch + 简单 cache 避免重复 IO */
let _loadCache: TrainingLoad | null = null;
let _adviceCache: TrainingAdvice | null = null;

async function fetchTrainingLoad(): Promise<TrainingLoad> {
  if (_loadCache) return _loadCache;
  // 加 cache-bust 防 SW 缓存太狠
  const resp = await fetch('/training_load.json', { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  _loadCache = await resp.json();
  return _loadCache!;
}

async function fetchTrainingAdvice(): Promise<TrainingAdvice> {
  if (_adviceCache) return _adviceCache;
  const resp = await fetch('/training_advice.json', { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  _adviceCache = await resp.json();
  return _adviceCache!;
}

const TrainingPage: React.FC = () => {
  const [load, setLoad] = useState<TrainingLoad | null>(null);
  const [advice, setAdvice] = useState<TrainingAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTrainingLoad(), fetchTrainingAdvice()])
      .then(([l, a]) => {
        if (cancelled) return;
        setLoad(l);
        setAdvice(a);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || '加载失败');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <Helmet>
        <title>训练负荷 · 运动集市</title>
        <meta name="description" content="基于 ACWR 训练负荷、心率区间、训练建议的 Apple HIG Bento 看板" />
      </Helmet>

      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <div className={styles.kicker}>v2.3.1 · Apple HIG Bento</div>
            <h1 className={styles.title}>🏋️ 训练负荷</h1>
            <p className={styles.subtitle}>
              ACWR 急慢性训练负荷比 · HR 5 区分布 · 训练建议（rule-based 0 LLM）
            </p>
          </div>
          {load && (
            <div className={styles.dataWindow}>
              <div className={styles.dataWindowLabel}>数据窗口</div>
              <div className={styles.dataWindowValue}>
                {load.data_window.earliest} → {load.data_window.latest}
              </div>
              <div className={styles.dataWindowSub}>
                {load.data_window.total_activities} 个活动
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className={styles.errorBox}>
            <strong>加载失败:</strong> {error}
            <br />
            请检查 <code>src/static/training_load.json</code> + <code>src/static/training_advice.json</code> 是否已生成。
          </div>
        )}

        {!load && !error && (
          <div className={styles.bentoGrid}>
            <div className={styles.bentoMain}>
              <SkeletonCard lines={5} />
            </div>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        )}

        {load && advice && (
          <div className={styles.bentoGrid}>
            <ACWRCard acwr={load.acwr} generatedAt={load.generated_at} />
            <HRZonesCard hrZones={load.hr_zones} windowDays={load.hr_zones.window_days || 90} />
            <AdviceListCard advice={advice} />
            <CadenceCard
              cadence={load.cadence}
              note={load.cadence_note}
              activityCount={load.data_window.total_activities}
            />
          </div>
        )}

        {load && (
          <footer className={styles.formulaFooter}>
            <details>
              <summary>📐 算法说明（点击展开）</summary>
              <div className={styles.formulaGrid}>
                <div>
                  <strong>Banister TRIMP (1991)</strong>
                  <p>心率加权训练冲量 = 时长 × ΔHR × 0.64 × exp(1.92 × y)</p>
                  <p>y = (HRavg - HRrest) / (HRmax - HRrest)，HRR 比例 0-1</p>
                </div>
                <div>
                  <strong>Karvonen 5 区 (HRR 百分比)</strong>
                  <p>Z1 &lt; 60% 恢复 / Z2 60-70% 有氧底座 / Z3 70-80% 有氧 / Z4 80-90% 乳酸阈 / Z5 90%+ 无氧</p>
                </div>
                <div>
                  <strong>Gabbett ACWR (1998)</strong>
                  <p>急慢性训练负荷比 = 7d TRIMP / 28d TRIMP</p>
                  <p>&lt; 0.8 训练不足 / 0.8-1.3 最佳 / 1.3-1.5 注意 / &gt; 1.5 高危</p>
                </div>
                <div>
                  <strong>HRmax / HRrest (用户实测)</strong>
                  <p>HRmax = {load.config.hr_max}（health_stats.top_stats.hr.max_ever）</p>
                  <p>HRrest = {load.config.hr_rest}（health_stats.top_stats.rhr.median）</p>
                </div>
              </div>
            </details>
          </footer>
        )}
      </div>
    </Layout>
  );
};

export default TrainingPage;
