/**
 * v1.0.0 — 能力配置只读端点
 *
 * GET /api/config
 * 返回当前 DeepSeek 全家桶的套餐档位与每个能力的开关状态（不含任何 key）。
 * 前端设置页据此渲染开关面板。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  resolveDeepSeekConfig,
  isCapabilityOn,
  CAPABILITY_META,
  TIER_PRESET,
  type Capability,
} from './_shared/deepseek.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const cfg = resolveDeepSeekConfig();
  const hasKey = !!process.env.DEEPSEEK_API_KEY;

  const capabilities = (Object.keys(CAPABILITY_META) as Capability[]).map(
    (key) => ({
      key,
      label: CAPABILITY_META[key].label,
      description: CAPABILITY_META[key].description,
      enabled: isCapabilityOn(cfg, key),
      envVar: CAPABILITY_META[key].envVar,
    })
  );

  return res.status(200).json({
    provider: 'deepseek',
    hasKey,
    tier: cfg.tier,
    warnings: cfg.warnings,
    tiers: {
      lite: TIER_PRESET.lite,
      standard: TIER_PRESET.standard,
      pro: TIER_PRESET.pro,
    },
    capabilities,
    timestamp: new Date().toISOString(),
  });
}
