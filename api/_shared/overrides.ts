/**
 * 能力开关的运行时覆盖（可选存储）
 *
 * 设计取舍：
 * - 默认（没配存储）→ 只读，配置完全由环境变量决定。fork 者零额外依赖。
 * - 配了 Upstash Redis REST（Vercel KV 会自动注入 KV_REST_API_URL /
 *   KV_REST_API_TOKEN）→ 打开后台就能直接拨开关，无需重新部署。
 *
 * 为什么用 Upstash REST 而不是 @vercel/kv：不想给仓库加运行时依赖，
 * 而且 REST 协议就是普通 fetch，没有 SDK 也能跑。
 *
 * 覆盖值与环境变量的关系：环境变量给的是默认值（由 DEEPSEEK_TIER +
 * DEEPSEEK_ENABLE_* 决定），覆盖是运行时双向开关，可以在不重新部署的
 * 情况下临时打开或关掉某个能力。
 *
 * 成本安全靠两层：
 * 1. 写覆盖必须带 DEEPSEEK_ADMIN_TOKEN（没配 token 则禁止写入，只读）。
 * 2. 没配 DEEPSEEK_API_KEY 时所有能力仍然一律不可用，删 key 即彻底关停。
 */
import type { Capability } from './deepseek.js';

export type OverrideMap = Partial<Record<Capability, boolean>>;

const KEY = 'sports-fair:deepseek:overrides:v1';

function endpoint(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

/** 是否配置了可写存储（决定后台能不能真的拨开关） */
export function storageAvailable(): boolean {
  return endpoint() !== null;
}

export const STORAGE_ENV_HINT =
  '要启用后台开关，请连接 Vercel KV（或 Upstash Redis）并注入 KV_REST_API_URL / KV_REST_API_TOKEN；未配置时开关由环境变量决定，面板为只读。';

/** 读覆盖表。任何异常都当作"没有覆盖"，不影响主流程 */
export async function loadOverrides(): Promise<OverrideMap> {
  const ep = endpoint();
  if (!ep) return {};
  try {
    const resp = await fetch(`${ep.url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${ep.token}` },
      // 覆盖表只影响能力开关，读失败就该回退到环境变量，不该拖慢请求
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return {};
    const body = (await resp.json()) as { result?: string | null };
    if (!body.result) return {};
    const parsed = JSON.parse(body.result) as OverrideMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 写单个能力的覆盖值。enabled 传 null 表示清除覆盖（回到环境变量决定）。
 * 返回是否写入成功——没有存储时返回 false，调用方据此提示用户。
 */
export async function saveOverride(
  cap: Capability,
  enabled: boolean | null
): Promise<boolean> {
  const ep = endpoint();
  if (!ep) return false;
  const current = await loadOverrides();
  const next: OverrideMap = { ...current };
  if (enabled === null) {
    delete next[cap];
  } else {
    next[cap] = enabled;
  }
  try {
    const resp = await fetch(`${ep.url}/set/${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ep.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(next),
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** 清空所有覆盖，回到纯环境变量 */
export async function clearOverrides(): Promise<boolean> {
  const ep = endpoint();
  if (!ep) return false;
  try {
    const resp = await fetch(`${ep.url}/del/${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ep.token}` },
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
