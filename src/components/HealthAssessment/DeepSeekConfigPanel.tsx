/**
 * v1.0.0 — DeepSeek 全家桶配置面板（折叠式，只读）
 *
 * 点击展开 → fetch /api/config → 展示三档套餐 + 各能力开关状态。
 * 说明：开关来自环境变量（Vercel dashboard），此处只读展示 + 给出配置提示，
 *      不在浏览器里写入（无 KV / 无后端存储，符合开源自部署定位）。
 */
import React from 'react';
import {
  fetchDeepSeekConfig,
  type DeepSeekConfigResponse,
  type DeepSeekTier,
} from '@/utils/configClient';
import styles from './DeepSeekConfigPanel.module.css';

const TIER_LABELS: Record<DeepSeekTier, string> = {
  lite: '轻量',
  standard: '标准',
  pro: '专业',
};

const TIER_DESC: Record<DeepSeekTier, string> = {
  lite: '对话 + 安全，最低成本',
  standard: '+ 联网搜索 + 阅读链接 + 标题',
  pro: '全家桶：深度搜索 / 文件 / OCR / ASR / TTS',
};

const DeepSeekConfigPanel: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<DeepSeekConfigResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fetched, setFetched] = React.useState(false);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDeepSeekConfig());
      setFetched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !fetched && !loading) loadConfig();
  };

  const enabledCount = data?.capabilities.filter((c) => c.enabled).length ?? 0;

  return (
    <div className={styles.panel}>
      <button
        className={styles.toggle}
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span className={styles.chevron} data-open={open}>
          ▸
        </span>
        <span>DeepSeek 全家桶 · 能力配置</span>
        {data && !loading && (
          <span
            className={`${styles.badge} ${data.hasKey ? styles.badgeOk : styles.badgeWarn}`}
          >
            {data.hasKey
              ? `${TIER_LABELS[data.tier]} · ${enabledCount} 项开启`
              : '未配置 Key'}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.body}>
          {loading && <p className={styles.muted}>正在读取配置…</p>}

          {error && (
            <p className={styles.error}>
              ❌ 读取失败：{error}
              <button onClick={loadConfig} className={styles.retryBtn}>
                重试
              </button>
            </p>
          )}

          {data && !loading && (
            <>
              <p className={styles.summary}>
                <strong>当前档位：</strong>
                <code className={styles.code}>{data.tier}</code>
                {' · '}
                {TIER_LABELS[data.tier]}
                {' — '}
                {TIER_DESC[data.tier]}
                {' · API Key '}
                {data.hasKey ? (
                  <span className={styles.hasKey}>已配置</span>
                ) : (
                  <span className={styles.noKey}>未配置</span>
                )}
              </p>

              {data.warnings.map((w, i) => (
                <p className={styles.hint} key={i}>
                  ⚠ {w}
                </p>
              ))}

              <div className={styles.tierRow}>
                {(Object.keys(TIER_LABELS) as DeepSeekTier[]).map((t) => (
                  <div
                    key={t}
                    className={`${styles.tierCard} ${data.tier === t ? styles.tierActive : ''}`}
                  >
                    <div className={styles.tierName}>
                      {TIER_LABELS[t]} <code className={styles.code}>{t}</code>
                    </div>
                    <div className={styles.tierDesc}>{TIER_DESC[t]}</div>
                    <div className={styles.tierCount}>
                      {data.tiers[t]?.length ?? 0} 项能力
                    </div>
                  </div>
                ))}
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>能力</th>
                    <th>说明</th>
                    <th>状态</th>
                    <th>环境变量</th>
                  </tr>
                </thead>
                <tbody>
                  {data.capabilities.map((c) => (
                    <tr key={c.key}>
                      <td>{c.label}</td>
                      <td className={styles.descCell}>{c.description}</td>
                      <td>
                        <span
                          className={`${styles.switch} ${c.enabled ? styles.switchOn : styles.switchOff}`}
                          title={c.enabled ? '已开启' : '已关闭'}
                        >
                          <span className={styles.switchDot} />
                          {c.enabled ? '开' : '关'}
                        </span>
                      </td>
                      <td>
                        <code className={styles.code}>{c.envVar}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className={styles.footer}>
                开关由部署方的环境变量控制（
                <code className={styles.code}>
                  DEEPSEEK_TIER
                </code> 选套餐、各{' '}
                <code className={styles.code}>DEEPSEEK_ENABLE_*</code>{' '}
                单独微调）。要修改请在 Vercel
                环境变量里设置后重新部署——本面板只读。
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeepSeekConfigPanel;
