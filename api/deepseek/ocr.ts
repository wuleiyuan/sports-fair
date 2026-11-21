/**
 * v1.0.0 — DeepSeek OCR（独立接口）
 * POST /api/deepseek/ocr
 * body: { fileBase64: string, filename: string, purpose?: 'text_recognition'|'rich_layout_recognition' }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gateCapability, callOcr } from './client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const gate = gateCapability('ocr');
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const { fileBase64, filename, purpose = 'text_recognition' } = req.body || {};
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ error: 'fileBase64 is required' });
  }
  try {
    const data = await callOcr(fileBase64, filename || 'upload.bin', purpose);
    return res.status(200).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
}
