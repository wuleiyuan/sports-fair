/**
 * v1.0.0 — DeepSeek TTS 文字转语音（独立接口）
 * POST /api/deepseek/tts
 * body: { text: string, voiceId?: 'stella'|'tide', format?: 'wav'|'pcm' }
 * 返回 { audioBase64, format, contentType }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { gateCapability, callTts } from './client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const gate = gateCapability('tts');
  if (!gate.ok) return res.status(gate.status).json(gate.body);

  const { text, voiceId = 'stella', format = 'wav' } = req.body || {};
  if (!text || typeof text !== 'string' || text.length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }
  try {
    const { audioBase64, format: fmt } = await callTts(
      text,
      voiceId,
      format === 'pcm' ? 'pcm' : 'wav'
    );
    return res.status(200).json({
      audioBase64,
      format: fmt,
      contentType: fmt === 'pcm' ? 'audio/pcm' : 'audio/wav',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
}
