/**
 * v1.1.0 — 能力配置端点（读 + 写）
 *
 * GET  /api/config          读取当前套餐档位与每个能力的开关状态（不含任何 key）
 * POST /api/config          在后台直接拨开关，无需重新部署
 *
 * POST 需要带请求头 `x-admin-token`，值等于环境变量 DEEPSEEK_ADMIN_TOKEN。
 * 没配 DEEPSEEK_ADMIN_TOKEN 时写入一律拒绝（503），避免任何访客都能
 * 把付费能力全打开。不配存储（KV）时同样不可写，退化成只读。
 *
 * POST body：
 *   { "capability": "ocr", "enabled": true }   单开/单关
 *   { "capability": "ocr", "enabled": null }   清除覆盖，回到环境变量决定
 *   { "reset": true }                          清空全部覆盖
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  resolveDeepSeekConfigWithOverrides,
  isCapabilityOn,
  CAPABILITY_META,
  TIER_PRESET,
  type Capability,
  type DeepSeekConfig,
} from './_shared/deepseek.js';
import {
  storageAvailable,
  saveOverride,
  clearOverrides,
  STORAGE_ENV_HINT,
} from './_shared/overrides.js';

function payload(cfg: DeepSeekConfig) {
  const hasKey = !!process.env.DEEPSEEK_API_KEY;
  const writable = storageAvailable() && !!process.env.DEEPSEEK_ADMIN_TOKEN;
  return {
    provider: 'deepseek',
    hasKey,
    tier: cfg.tier,
    warnings: cfg.warnings,
    tiers: {
      lite: TIER_PRESET.lite,
      standard: TIER_PRESET.standard,
      pro: TIER_PRESET.pro,
    },
    capabilities: (Object.keys(CAPABILITY_META) as Capability[]).map((key) => ({
      key,
      label: CAPABILITY_META[key].label,
      description: CAPABILITY_META[key].description,
      enabled: isCapabilityOn(cfg, key),
      source: cfg.capabilities[key]?.source ?? 'tier',
      envVar: CAPABILITY_META[key].envVar,
    })),
    // 后台能不能真的拨开关：需要同时配了存储 + admin token
    writable,
    storageAvailable: storageAvailable(),
    tokenRequired: !process.env.DEEPSEEK_ADMIN_TOKEN,
    storageHint: writable ? undefined : STORAGE_ENV_HINT,
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const cfg = await resolveDeepSeekConfigWithOverrides();
    return res.status(200).json(payload(cfg));
  }

  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // ---- 写权限：必须有 admin token ----
  const expected = process.env.DEEPSEEK_ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({
      error: 'Write disabled',
      hint: '设置 DEEPSEEK_ADMIN_TOKEN 后才能在后台拨开关；未设置时配置由环境变量决定，面板只读。',
    });
  }
  const provided = req.headers['x-admin-token'];
  const token = Array.isArray(provided) ? provided[0] : provided;
  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  if (!storageAvailable()) {
    return res.status(503).json({
      error: 'No storage configured',
      hint: STORAGE_ENV_HINT,
    });
  }

  const body = (req.body ?? {}) as {
    capability?: string;
    enabled?: boolean | null;
    reset?: boolean;
  };

  // ---- 重置 ----
  if (body.reset) {
    const ok = await clearOverrides();
    if (!ok)
      return res.status(502).json({ error: 'Failed to clear overrides' });
    return res
      .status(200)
      .json({
        ok: true,
        reset: true,
        ...payload(await resolveDeepSeekConfigWithOverrides()),
      });
  }

  // ---- 单项 ----
  const cap = body.capability as Capability | undefined;
  if (!cap || !(cap in CAPABILITY_META)) {
    return res.status(400).json({
      error: 'capability is required',
      available: Object.keys(CAPABILITY_META),
    });
  }
  if (cap === 'chat' && body.enabled === false) {
    return res
      .status(400)
      .json({ error: 'chat is the base capability and cannot be disabled' });
  }
  const enabled =
    body.enabled === null || body.enabled === undefined
      ? null
      : Boolean(body.enabled);

  const ok = await saveOverride(cap, enabled);
  if (!ok) return res.status(502).json({ error: 'Failed to save override' });

  return res.status(200).json({
    ok: true,
    capability: cap,
    enabled,
    ...payload(await resolveDeepSeekConfigWithOverrides()),
  });
}
