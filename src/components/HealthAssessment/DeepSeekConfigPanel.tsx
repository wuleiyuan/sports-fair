/**
 * v1.1.0 — DeepSeek 全家桶配置面板（折叠式，可开关）
 *
 * 展开 → GET /api/config → 展示三档套餐 + 各能力开关。
 * 配置了运行时存储（KV/Upstash）+ DEEPSEEK_ADMIN_TOKEN 时可以直接拨开关，
 * 无需重新部署；否则退化为只读展示 + 配置指引。
 *
 * 安全：admin token 只存 localStorage，随请求头 x-admin-token 发出，
 * 不写入代码库也不进 bundle。
 */
import React from 'react';
import {
  fetchDeepSeekConfig,
  setDeepSeekCapability,
  resetDeepSeekOverrides,
  loadAdminToken,
  saveAdminToken,
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
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [token, setToken] = React.useState(() => loadAdminToken());
  const [tokenSaved, setTokenSaved] = React.useState(false);

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

  const handleSaveToken = () => {
    saveAdminToken(token.trim());
    setTokenSaved(true);
    // 让提示自己消失，不额外装定时器
    setTimeout(() => setTokenSaved(false), 2000);
  };

  const handleSwitch = async (capability: string, next: boolean) => {
    setBusyKey(capability);
    setError(null);
    try {
      setData(await setDeepSeekCapability(capability, next));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  };

  const handleReset = async () => {
    setBusyKey('__reset__');
    setError(null);
    try {
      setData(await resetDeepSeekOverrides());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  };

  const enabledCount = data?.capabilities.filter((c) => c.enabled).length ?? 0;
  const canWrite = !!data?.writable;
  const overridden = data?.capabilities.filter((c) => c.source === 'override');

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
              ❌ {error}
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

              {!data.hasKey && (
                <div className={styles.notice}>
                  <div className={styles.noticeTitle}>
                    ⚠ 还没有配置 DEEPSEEK_API_KEY
                  </div>
                  <div className={styles.noticeBody}>
                    下面列出的能力是「档位打算开启什么」， 在填入 Key
                    之前所有工具端点都会返回{' '}
                    <code className={styles.code}>
                      DEEPSEEK_API_KEY not configured
                    </code>
                    。
                    <br />到 Vercel → Project → Settings → Environment Variables
                    添加 <code className={styles.code}>DEEPSEEK_API_KEY</code>
                    （在{' '}
                    <a
                      href="https://platform.deepseek.com/api_keys"
                      target="_blank"
                      rel="noreferrer"
                    >
                      platform.deepseek.com
                    </a>{' '}
                    申请）后重新部署即可生效。
                  </div>
                </div>
              )}

              {/* 只读模式下告诉部署者怎么把开关变成可写的 */}
              {!canWrite && (
                <div className={styles.notice}>
                  <div className={styles.noticeTitle}>🔒 当前为只读模式</div>
                  <div className={styles.noticeBody}>
                    下面的开关状态由环境变量决定。想直接在这里开关、
                    不必每次改环境变量再重新部署，需要两步：
                    <br />
                    1. 连接 Vercel KV（或 Upstash Redis）， 自动注入{' '}
                    <code className={styles.code}>KV_REST_API_URL</code> /{' '}
                    <code className={styles.code}>KV_REST_API_TOKEN</code>
                    ；
                    <br />
                    2. 添加环境变量{' '}
                    <code className={styles.code}>DEEPSEEK_ADMIN_TOKEN</code>
                    （自己随便生成一串长随机字符串），保存后填到下面的输入框。
                    {data.storageHint && (
                      <>
                        <br />
                        <span className={styles.muted}>{data.storageHint}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {canWrite && (
                <div className={styles.adminRow}>
                  <label className={styles.adminLabel}>
                    管理员令牌
                    <input
                      type="password"
                      className={styles.adminInput}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="DEEPSEEK_ADMIN_TOKEN"
                      autoComplete="off"
                    />
                  </label>
                  <button className={styles.retryBtn} onClick={handleSaveToken}>
                    {tokenSaved ? '已保存 ✓' : '保存令牌'}
                  </button>
                  <button
                    className={styles.retryBtn}
                    onClick={handleReset}
                    disabled={busyKey === '__reset__'}
                  >
                    {busyKey === '__reset__' ? '重置中…' : '重置为环境变量'}
                  </button>
                </div>
              )}

              {!!overridden?.length && (
                <p className={styles.hint}>
                  ⚙ 有 {overridden.length} 项被后台覆盖：
                  {overridden.map((c) => c.label).join('、')}
                  （「重置为环境变量」可清除）
                </p>
              )}

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
                    <th>{data.hasKey ? '状态' : '状态（缺 Key）'}</th>
                    <th>环境变量</th>
                  </tr>
                </thead>
                <tbody>
                  {data.capabilities.map((c) => {
                    const isChat = c.key === 'chat';
                    const clickable = canWrite && !isChat && busyKey !== c.key;
                    return (
                      <tr key={c.key}>
                        <td>{c.label}</td>
                        <td className={styles.descCell}>{c.description}</td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.switch} ${
                              c.enabled && data.hasKey
                                ? styles.switchOn
                                : c.enabled
                                  ? styles.switchIdle
                                  : styles.switchOff
                            } ${clickable ? styles.switchClickable : ''}`}
                            disabled={!clickable}
                            onClick={() => handleSwitch(c.key, !c.enabled)}
                            title={
                              isChat
                                ? '对话是基础能力，不可关闭'
                                : clickable
                                  ? c.enabled
                                    ? '点击关闭'
                                    : '点击开启'
                                  : c.enabled
                                    ? data.hasKey
                                      ? '已开启'
                                      : '档位已开，但缺 API Key 无法调用'
                                    : '已关闭'
                            }
                          >
                            <span className={styles.switchDot} />
                            {busyKey === c.key ? '…' : c.enabled ? '开' : '关'}
                          </button>
                        </td>
                        <td>
                          <code className={styles.code}>{c.envVar}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className={styles.footer}>
                默认配置来自环境变量（
                <code className={styles.code}>DEEPSEEK_TIER</code> 选套餐、各{' '}
                <code className={styles.code}>DEEPSEEK_ENABLE_*</code>{' '}
                单独微调）。配好 KV 与{' '}
                <code className={styles.code}>DEEPSEEK_ADMIN_TOKEN</code>{' '}
                后，上方开关可直接生效，无需重新部署；没配时本面板只读。
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeepSeekConfigPanel;
