/**
 * v1.0.0 — DeepSeek 全家桶配置客户端
 *
 * 调 GET /api/config 拉当前套餐档位 + 各能力开关状态（只读，不泄露 key）。
 * 失败容错：抛给调用方处理（带 5s 超时）。
 */
export type DeepSeekTier = 'lite' | 'standard' | 'pro';

export interface DeepSeekCapability {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  envVar: string;
}

export interface DeepSeekConfigResponse {
  provider: 'deepseek';
  hasKey: boolean;
  tier: DeepSeekTier;
  warnings: string[];
  tiers: Record<DeepSeekTier, string[]>;
  capabilities: DeepSeekCapability[];
  timestamp: string;
}

export async function fetchDeepSeekConfig(): Promise<DeepSeekConfigResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const resp = await fetch('/api/config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }
    return (await resp.json()) as DeepSeekConfigResponse;
  } finally {
    clearTimeout(timeout);
  }
}
