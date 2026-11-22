/**
 * v1.0.1 — DeepSeek 独立工具统一入口
 *
 * POST /api/deepseek/search  body: { query, count?, needContent?, oriQuestion? }
 * POST /api/deepseek/fetch   body: { url }
 * POST /api/deepseek/ocr     body: { fileBase64, filename, purpose? }
 * POST /api/deepseek/asr     body: { fileBase64, filename }
 * POST /api/deepseek/tts     body: { text, voiceId?, format? }
 *
 * v1.0.2 (2026-11-21): 从动态路由 api/deepseek/[tool].ts 改为静态单函数
 * + vercel.json rewrite（/api/deepseek/:tool → /api/deepseek?tool=:tool）。
 * 原因：@vercel/node 不会把 [tool].ts 动态路由打成函数，线上只会 405；
 * 而拆成 5 个文件又会超过 Vercel Hobby 每部署 12 个 Serverless Function 的上限。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  gateCapability,
  callSearch,
  callFetch,
  callOcr,
  callAsr,
  callTts,
} from './_shared/deepseek.js';

const TOOLS = ['search', 'fetch', 'ocr', 'asr', 'tts'] as const;
type Tool = (typeof TOOLS)[number];

function fail(res: VercelResponse, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return res.status(502).json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // 工具名来源：优先从 URL 路径取（/api/deepseek/search，由 vercel.json
  // rewrite 把 /api/deepseek/:tool 重写到这里并保留 ?tool=），
  // 其次退回 query 参数（/api/deepseek?tool=search）。
  const fromQuery = req.query.tool;
  const queryTool = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  const fromPath = (req.url || '').split('?')[0].split('/').pop();
  const raw = queryTool || fromPath;
  const tool = raw as Tool | undefined;
  if (!tool || !TOOLS.includes(tool)) {
    return res.status(404).json({
      error: `Unknown tool. Available: ${TOOLS.map((t) => `/api/deepseek/${t}`).join(', ')}`,
    });
  }

  const body = req.body || {};

  switch (tool) {
    // 每个 case 的顺序：先校验入参（400，与密钥无关），再查能力开关（403/500），
    // 最后才真正发起上游请求。这样未配置 key 时也能得到明确的参数错误。
    case 'search': {
      const { query, count = 10, needContent = false, oriQuestion } = body;
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res
          .status(400)
          .json({ error: 'query is required (1-128 chars)' });
      }
      if (query.length > 128) {
        return res.status(400).json({ error: 'query must be <= 128 chars' });
      }
      // 官方限制：count 1-50，默认 10
      const n = Number(count);
      const safeCount = Number.isFinite(n)
        ? Math.min(50, Math.max(1, Math.trunc(n)))
        : 10;

      const gate = gateCapability('webSearch');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      try {
        return res
          .status(200)
          .json(await callSearch(query, safeCount, !!needContent, oriQuestion));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'fetch': {
      const { url } = body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
      }
      if (url.length > 8192) {
        return res.status(400).json({ error: 'url must be <= 8192 chars' });
      }

      const gate = gateCapability('readUrl');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      try {
        return res.status(200).json(await callFetch(url));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'ocr': {
      const { fileBase64, filename, purpose = 'text_recognition' } = body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 is required' });
      }
      // 官方只接受两个枚举值
      const PURPOSES = ['text_recognition', 'rich_layout_recognition'];
      if (!PURPOSES.includes(purpose)) {
        return res.status(400).json({
          error: `purpose must be one of: ${PURPOSES.join(', ')}`,
        });
      }

      const gate = gateCapability('ocr');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      try {
        return res
          .status(200)
          .json(await callOcr(fileBase64, filename || 'upload.bin', purpose));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'asr': {
      const { fileBase64, filename } = body;
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'fileBase64 is required' });
      }

      const gate = gateCapability('asr');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      try {
        return res
          .status(200)
          .json(await callAsr(fileBase64, filename || 'audio.bin'));
      } catch (e) {
        return fail(res, e);
      }
    }

    case 'tts': {
      const { text, voiceId = 'stella', format = 'wav' } = body;
      if (!text || typeof text !== 'string' || text.length === 0) {
        return res.status(400).json({ error: 'text is required' });
      }
      // 官方上限：单次 10000 计费字符，body 不超过 64KiB
      if (text.length > 10_000) {
        return res
          .status(400)
          .json({ error: 'text must be <= 10000 characters' });
      }
      if (format !== 'wav' && format !== 'pcm') {
        return res.status(400).json({ error: "format must be 'wav' or 'pcm'" });
      }

      const gate = gateCapability('tts');
      if (!gate.ok) return res.status(gate.status).json(gate.body);
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
