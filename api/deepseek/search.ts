/**
 * v1.0.0 — DeepSeek 联网搜索（独立接口）
 * POST /api/deepseek/search
 * body: { query: string, count?: number, needContent?: boolean, oriQuestion?: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gateCapability, callSearch } from './client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const gate = gateCapability('webSearch');
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const {
    query,
    count = 10,
    needContent = false,
    oriQuestion,
  } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required (1-128 chars)' });
  }
  try {
    const data = await callSearch(query, count, needContent, oriQuestion);
    return res.status(200).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
}
