/**
 * v1.0.1 — DeepSeek 独立工具统一入口
 *
 * POST /api/deepseek/search  body: { query, count?, needContent?, oriQuestion? }
 * POST /api/deepseek/fetch   body: { url }
 * POST /api/deepseek/ocr     body: { fileBase64, filename, purpose? }
 * POST /api/deepseek/asr     body: { fileBase64, filename }
 * POST /api/deepseek/tts     body: { text, voiceId?, format? }
 *
 * v1.0.1 (2026-11-21): 五个端点合并为一个动态路由。
 * Vercel Hobby 计划每部署限 12 个 Serverless Function，
 * 拆成 5 个文件会把函数数推到上限之外（部署直接失败）。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  gateCapability,
  callSearch,
  callFetch,
  callOcr,
  callAsr,
  callTts,
} from '../../lib/deepseek/client';

const TOOLS = ['search', 'fetch', 'ocr', 'asr', 'tts'] as const;
type Tool = (typeof TOOLS)[number];

function fail(res: VercelResponse, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return res.status(502).json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // Vercel 动态路由参数：/api/deepseek/<tool>
  const raw = req.query.tool;
  const tool = (Array.isArray(raw) ? raw[0] : raw) as Tool | undefined;
  if (!tool || !TOOLS.includes(tool)) {
    return res.status(404).json({
      error: `Unknown tool. Available: ${TOOLS.map((t) => `/api/deepseek/${t}`).join(', ')}`,
    });
  }

  const body = req.body || {};

  switch (tool) {
    case 'search': {
      const gate = gateCapability('webSearch');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      const { query, count = 10, needContent = false, oriQuestion } = body;
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res
          .status(400)
          .json({ error: 'query is required (1-128 chars)' });
      }
      try {
        return res
          .status(200)
          .json(await callSearch(query, count, needContent, oriQuestion));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'fetch': {
      const gate = gateCapability('readUrl');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      const { url } = body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
      }
      try {
        return res.status(200).json(await callFetch(url));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'ocr': {
      const gate = gateCapability('ocr');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      const { fileBase64, filename, purpose = 'text_recognition' } = body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 is required' });
      }
      try {
        return res
          .status(200)
          .json(await callOcr(fileBase64, filename || 'upload.bin', purpose));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'asr': {
      const gate = gateCapability('asr');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      const { fileBase64, filename } = body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 is required' });
      }
      try {
        return res
          .status(200)
          .json(await callAsr(fileBase64, filename || 'audio.bin'));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'tts': {
      const gate = gateCapability('tts');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      const { text, voiceId = 'stella', format = 'wav' } = body;
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
      } catch (e) {
        return fail(res, e);
      }
    }
  }
}
