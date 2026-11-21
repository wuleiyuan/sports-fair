/**
 * v1.0.0 — DeepSeek 阅读链接 / 抓取网页（独立接口）
 * POST /api/deepseek/fetch
 * body: { url: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gateCapability, callFetch } from './client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const gate = gateCapability('readUrl');
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  try {
    const data = await callFetch(url);
    return res.status(200).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
}
