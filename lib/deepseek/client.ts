/**
 * v1.0.0 — DeepSeek 独立工具客户端 + 能力闸门
 *
 * 封装 Search / Fetch / OCR / ASR / TTS 的独立调用，并统一做：
 *   1. DEEPSEEK_API_KEY 校验（缺失直接返回错误体，不抛栈）
 *   2. 当前套餐/开关下该能力是否开启（resolveDeepSeekConfig + isCapabilityOn）
 *
 * 提供给各 Vercel 端点（api/deepseek/*.ts）复用。
 */
import { DEEPSEEK_BASE_URL, getApiKey } from './provider';
import {
  resolveDeepSeekConfig,
  isCapabilityOn,
  type Capability,
} from './capabilities';

export interface GateResultOk {
  ok: true;
}
export interface GateResultErr {
  ok: false;
  status: number;
  body: Record<string, unknown>;
}
export type GateResult = GateResultOk | GateResultErr;

/** 校验 key + 能力开关；不通过时返回可直接 res.status().json() 的错误体 */
export function gateCapability(cap: Capability): GateResult {
  try {
    getApiKey();
  } catch {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'DEEPSEEK_API_KEY not configured',
        hint: '在 Vercel 环境变量里设置 DEEPSEEK_API_KEY，并确认对应能力开关已开启。',
      },
    };
  }
  const cfg = resolveDeepSeekConfig();
  if (!isCapabilityOn(cfg, cap)) {
    return {
      ok: false,
      status: 403,
      body: {
        error: `Capability "${cap}" is disabled`,
        hint: `当前套餐/开关下未启用该能力。检查 DEEPSEEK_TIER 或在 DEEPSEEK_ENABLE_${cap
          .toUpperCase()
          .replace(/[A-Z]/g, (m) => '_' + m)
          .replace(/^_/, '')} 中开启。`,
      },
    };
  }
  return { ok: true };
}

async function bearerPostJson(
  path: string,
  payload: unknown,
  timeoutMs = 30_000
): Promise<any> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function callSearch(
  query: string,
  count = 10,
  needContent = false,
  oriQuestion?: string
): Promise<any> {
  return bearerPostJson('/v1/tools/search', {
    query,
    count,
    need_content: needContent,
    ...(oriQuestion ? { ori_question: oriQuestion } : {}),
  });
}

export async function callFetch(url: string): Promise<any> {
  return bearerPostJson('/v1/tools/fetch', { url });
}

/** OCR / ASR 共用：把 base64 文件转 Blob 后以 multipart 转发 */
async function bearerPostMultipart(
  path: string,
  fields: Record<string, string>,
  fileBase64: string,
  filename: string,
  fileField = 'file',
  timeoutMs = 120_000
): Promise<any> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const bin = Buffer.from(fileBase64, 'base64');
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append(fileField, new Blob([bin]), filename);

    const resp = await fetch(`${DEEPSEEK_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function callOcr(
  fileBase64: string,
  filename: string,
  purpose: string
): Promise<any> {
  return bearerPostMultipart(
    '/v1/tools/ocr',
    { purpose },
    fileBase64,
    filename,
    'file'
  );
}

export async function callAsr(
  fileBase64: string,
  filename: string
): Promise<any> {
  return bearerPostMultipart('/v1/tools/asr', {}, fileBase64, filename, 'file');
}

/** TTS 返回音频（base64）。format=wav|pcm */
export async function callTts(
  text: string,
  voiceId = 'stella',
  format: 'wav' | 'pcm' = 'wav'
): Promise<{ audioBase64: string; format: string }> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/v1/tools/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text, voice_id: voiceId, format }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return { audioBase64: buf.toString('base64'), format };
  } finally {
    clearTimeout(timer);
  }
}
