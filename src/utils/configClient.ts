/**
 * v1.1.0 — DeepSeek 全家桶配置客户端
 *
 * GET  /api/config  拉当前套餐档位 + 各能力开关状态（不泄露 key）
 * POST /api/config  带 admin token 在后台直接拨开关
 *
 * 写入需要 DEEPSEEK_ADMIN_TOKEN。token 只存在浏览器 localStorage，
 * 不进代码库、不进 bundle；填错会拿到 401。
 */
export type DeepSeekTier = 'lite' | 'standard' | 'pro';

export interface DeepSeekCapability {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  source: 'tier' | 'override';
  envVar: string;
}

export interface DeepSeekConfigResponse {
  provider: 'deepseek';
  hasKey: boolean;
  tier: DeepSeekTier;
  warnings: string[];
  tiers: Record<DeepSeekTier, string[]>;
  capabilities: DeepSeekCapability[];
  /** 后台能否真的写：需要同时配了存储 + admin token */
  writable: boolean;
  storageAvailable: boolean;
  tokenRequired: boolean;
  storageHint?: string;
  timestamp: string;
}

const TOKEN_KEY = 'sports-fair:deepseek:admin-token';

export function loadAdminToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略 */
  }
}

type RequestOptions = {
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
};

async function request(
  init: RequestOptions,
  timeoutMs = 8_000
): Promise<DeepSeekConfigResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch('/api/config', {
      headers: { Accept: 'application/json', ...(init.headers || {}) },
      signal: controller.signal,
      ...init,
    });
    const text = await resp.text();
    if (!resp.ok) {
      // 尽量把后端的 hint 带出来，方便用户知道缺哪个环境变量
      let hint = text.slice(0, 200);
      try {
        const parsed = JSON.parse(text) as { error?: string; hint?: string };
        hint = [parsed.error, parsed.hint].filter(Boolean).join(' — ') || hint;
      } catch {
        /* 非 JSON 错误体，用原文 */
      }
      throw new Error(`HTTP ${resp.status}: ${hint}`);
    }
    return JSON.parse(text) as DeepSeekConfigResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDeepSeekConfig(): Promise<DeepSeekConfigResponse> {
  return request({ method: 'GET' });
}

/** 拨单个能力的开关。enabled 传 null 表示清除覆盖，回到环境变量决定。 */
export async function setDeepSeekCapability(
  capability: string,
  enabled: boolean | null
): Promise<DeepSeekConfigResponse> {
  return request({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': loadAdminToken(),
    },
    body: JSON.stringify({ capability, enabled }),
  });
}

/** 清空所有运行时覆盖，回到纯环境变量配置。 */
export async function resetDeepSeekOverrides(): Promise<DeepSeekConfigResponse> {
  return request({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': loadAdminToken(),
    },
    body: JSON.stringify({ reset: true }),
  });
}
