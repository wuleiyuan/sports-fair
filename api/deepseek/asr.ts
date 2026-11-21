/**
 * v1.0.0 — DeepSeek ASR 语音转文字（独立接口）
 * POST /api/deepseek/asr
 * body: { fileBase64: string, filename: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gateCapability, callAsr } from './client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const gate = gateCapability('asr');
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const { fileBase64, filename } = req.body || {};
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ error: 'fileBase64 is required' });
  }
  try {
    const data = await callAsr(fileBase64, filename || 'audio.bin');
    return res.status(200).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
}
