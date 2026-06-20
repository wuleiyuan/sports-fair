/**
 * 训练负荷看板页 (v2.4.0)
 *
 * Apple HIG Bento Box 布局：
 * - ACWR 主卡 (2x2) — 急慢性训练负荷比
 * - TSB 卡 (1x1) — 训练状态平衡
 * - HR Zones 卡 (1x1) — 心率区间分布
 * - Advice 卡 (1x1) — 训练建议列表
 *
 * 路由: /training
 * 数据源: import from src/static/training_load.json + src/static/training_advice.json
 *
 * 不做医学判断（声明）
 * 数据局限: HRV 未提供，cadence 待后续数据源就绪
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import {
  ACWRCard,
  HRZonesCard,
  AdviceListCard,
  TSBCard,
  type TrainingLoad,
  type TrainingAdvice,
} from '@/components/Training';
import trainingLoadData from '@/static/training_load.json';
import trainingAdviceData from '@/static/training_advice.json';
import styles from './training.module.css';

const load = trainingLoadData as TrainingLoad;
const advice = trainingAdviceData as TrainingAdvice;

const TrainingPage: React.FC = () => (
  <Layout>
    <Helmet>
      <title>训练负荷 · 运动集市</title>
      <meta name="description" content="基于 ACWR 训练负荷、心率区间、训练建议的 Apple HIG Bento 看板" />
    </Helmet>

    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>v2.4.0 · Apple HIG Bento</div>
          <h1 className={styles.title}>🏋️ 训练负荷</h1>
          <p className={styles.subtitle}>
            ACWR 急慢性训练负荷比 · TSB 训练状态 · HR 5 区分布 · 训练建议（rule-based 0 LLM）
          </p>
        </div>
        <div className={styles.dataWindow}>
          <div className={styles.dataWindowLabel}>数据窗口</div>
          <div className={styles.dataWindowValue}>
            {load.data_window.earliest} → {load.data_window.latest}
          </div>
          <div className={styles.dataWindowSub}>
            {load.data_window.total_activities} 个活动
          </div>
        </div>
      </header>

      {load && advice && (
        <div className={styles.bentoGrid}>
          <ACWRCard acwr={load.acwr} generatedAt={load.generated_at} />
          <TSBCard tsb={load.tsb} generatedAt={load.generated_at} />
          <HRZonesCard hrZones={load.hr_zones} windowDays={load.hr_zones.window_days || 90} />
          <AdviceListCard advice={advice} />
        </div>
      )}

      {load && (
        <footer className={styles.formulaFooter}>
          <details>
            <summary>📐 算法说明（点击展开）</summary>
            <div className={styles.formulaGrid}>
              <div>
                <strong>Banister TRIMP (1991)</strong>
                <p>心率加权训练冲量 = 时长 × y × 0.64 × exp(1.92 × y)</p>
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
                <strong>Coggan TSB (2003)</strong>
                <p>训练状态 = CTL − ATL</p>
                <p>CTL = 42d EMA / ATL = 7d EMA</p>
                <p>&gt; 15 充分恢复 / -5~15 最佳 / -15~-5 疲劳 / &lt; -15 过度</p>
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

export default TrainingPage;
