/**
 * v1.0.0 — DeepSeek 全家桶端点集成测试
 *
 * 覆盖两件事（都不依赖真实网络 / 真实 API key）：
 *   1. 路由与参数校验：/api/deepseek/:tool 的 tool 解析、方法限制、
 *      每个端点的入参校验（应当与密钥是否存在无关，恒为 400）。
 *   2. 请求形状：在 mock 掉 global.fetch 之后，验证真正发往
 *      api.deepseek.com 的 URL / 鉴权头 / body 字段是否符合官方文档，
 *      以及返回值如何被包装成 HTTP 响应。
 *
 * 为什么不打真实接口：CI 里没有 DEEPSEEK_API_KEY，且工具调用按次计费。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/deepseek';
import { resolveDeepSeekConfig } from '../../api/_shared/deepseek';

/** 构造一个最小的 VercelRequest / VercelResponse 替身 */
function makeReq(over: {
  method?: string;
  url?: string;
  query?: Record<string, string>;
  body?: unknown;
}) {
  return {
    method: over.method ?? 'POST',
    url: over.url ?? '/api/deepseek/search',
    query: over.query ?? {},
    body: over.body ?? {},
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 0,
    payload: undefined,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.payload = payload;
      return res;
    },
    send(payload: unknown) {
      res.payload = payload;
      return res;
    },
    setHeader(k: string, v: string) {
      res.headers[k] = v;
      return res;
    },
  };
  return res;
}

async function call(
  over: Parameters<typeof makeReq>[0]
): Promise<{ status: number; payload: any }> {
  const res = makeRes();
  await handler(makeReq(over), res);
  return { status: res.statusCode, payload: res.payload };
}

/** 记录 fetch 调用，并按需返回构造好的响应 */
function stubFetch(
  responder: (
    url: string,
    init: any
  ) => {
    status?: number;
    json?: unknown;
    text?: string;
    bytes?: Uint8Array;
  }
) {
  const calls: { url: string; init: any }[] = [];
  const spy = vi.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const r = responder(String(url), init);
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => r.json,
      text: async () => r.text ?? '',
      arrayBuffer: async () => (r.bytes ?? new Uint8Array()).buffer,
    } as any;
  });
  vi.stubGlobal('fetch', spy);
  return calls;
}

const ENV_KEYS = [
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_TIER',
  'DEEPSEEK_MODEL',
  'DEEPSEEK_ENABLE_WEB_SEARCH',
  'DEEPSEEK_ENABLE_READ_URL',
  'DEEPSEEK_ENABLE_OCR',
  'DEEPSEEK_ENABLE_ASR',
  'DEEPSEEK_ENABLE_TTS',
  'DEEPSEEK_ENABLE_SAFETY',
  'DEEPSEEK_ENABLE_FILE_INPUT',
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  // 默认：pro 档 + 有 key（只要不是故意测缺 key 的用例）
  process.env.DEEPSEEK_API_KEY = 'sk-test';
  process.env.DEEPSEEK_TIER = 'pro';
  for (const k of ENV_KEYS) {
    if (k.startsWith('DEEPSEEK_ENABLE_')) delete process.env[k];
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// ============================================================
// 路由解析
// ============================================================

describe('路由与工具名解析', () => {
  it('非 POST 一律 405', async () => {
    const r = await call({ method: 'GET', url: '/api/deepseek/search' });
    expect(r.status).toBe(405);
    expect(r.payload.error).toBe('Method not allowed');
  });

  it('未知 tool 返回 404 并列出可用端点', async () => {
    const r = await call({ query: { tool: 'badtool' } });
    expect(r.status).toBe(404);
    expect(r.payload.error).toContain('/api/deepseek/search');
    expect(r.payload.error).toContain('/api/deepseek/tts');
  });

  it('从 query.tool 解析工具名（vercel rewrite 后的形态）', async () => {
    stubFetch(() => ({ json: { results: [] } }));
    const r = await call({
      query: { tool: 'search' },
      url: '/api/deepseek?tool=search',
      body: { query: 'hi' },
    });
    expect(r.status).toBe(200);
  });

  it('query 缺失时退回 URL 末段', async () => {
    stubFetch(() => ({ json: { results: [] } }));
    const r = await call({
      query: {},
      url: '/api/deepseek/search',
      body: { query: 'hi' },
    });
    expect(r.status).toBe(200);
  });
});

// ============================================================
// 参数校验（必须与密钥无关，恒为 400）
// ============================================================

describe('参数校验：不依赖密钥', () => {
  beforeEach(() => {
    // 故意清掉 key：校验仍然应该先返回 400，而不是 500
    delete process.env.DEEPSEEK_API_KEY;
  });

  it('search：query 必填', async () => {
    const r = await call({ query: { tool: 'search' }, body: {} });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('query is required');
  });

  it('search：query 超过 128 字符被拒', async () => {
    const r = await call({
      query: { tool: 'search' },
      body: { query: 'a'.repeat(129) },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('128');
  });

  it('fetch：url 必填', async () => {
    const r = await call({ query: { tool: 'fetch' }, body: {} });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('url is required');
  });

  it('fetch：url 超过 8192 字符被拒', async () => {
    const r = await call({
      query: { tool: 'fetch' },
      body: { url: 'https://x.test/' + 'a'.repeat(8200) },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('8192');
  });

  it('ocr：fileBase64 必填', async () => {
    const r = await call({ query: { tool: 'ocr' }, body: {} });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('fileBase64 is required');
  });

  it('ocr：purpose 只接受两个枚举值', async () => {
    const r = await call({
      query: { tool: 'ocr' },
      body: { fileBase64: 'aGk=', purpose: 'whatever' },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('text_recognition');
  });

  it('asr：fileBase64 必填', async () => {
    const r = await call({ query: { tool: 'asr' }, body: {} });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('fileBase64 is required');
  });

  it('tts：text 必填', async () => {
    const r = await call({ query: { tool: 'tts' }, body: {} });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('text is required');
  });

  it('tts：text 超过 10000 字符被拒', async () => {
    const r = await call({
      query: { tool: 'tts' },
      body: { text: 'a'.repeat(10_001) },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('10000');
  });

  it('tts：format 只接受 wav / pcm', async () => {
    const r = await call({
      query: { tool: 'tts' },
      body: { text: 'hi', format: 'mp3' },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('wav');
  });
});

// ============================================================
// 密钥与能力开关
// ============================================================

describe('密钥与能力开关', () => {
  it('缺 key → 500 并给出配置提示', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const r = await call({
      query: { tool: 'search' },
      body: { query: 'hi' },
    });
    expect(r.status).toBe(500);
    expect(r.payload.error).toContain('DEEPSEEK_API_KEY not configured');
  });

  it('lite 档关掉 ocr → 403 且提示里是正确的 env 名', async () => {
    process.env.DEEPSEEK_TIER = 'lite';
    const r = await call({
      query: { tool: 'ocr' },
      body: { fileBase64: 'aGk=', purpose: 'text_recognition' },
    });
    expect(r.status).toBe(403);
    expect(r.payload.error).toContain('ocr');
    // 回归防护：曾经错误地生成出 W_E_B_ 这种逐字母拼接的名字
    expect(r.payload.hint).toContain('DEEPSEEK_ENABLE_OCR');
    expect(r.payload.hint).not.toContain('W_E_B');
  });

  it('独立开关可以覆盖套餐默认', async () => {
    process.env.DEEPSEEK_TIER = 'lite'; // lite 默认不含 ocr
    process.env.DEEPSEEK_ENABLE_OCR = 'true';
    stubFetch(() => ({ json: { pages: [], page_count: 1 } }));
    const r = await call({
      query: { tool: 'ocr' },
      body: { fileBase64: 'aGk=', purpose: 'text_recognition' },
    });
    expect(r.status).toBe(200);
  });

  it('DEEPSEEK_TIER 非法时回退 standard 并给 warning', () => {
    process.env.DEEPSEEK_TIER = 'enterprise';
    const cfg = resolveDeepSeekConfig();
    expect(cfg.tier).toBe('standard');
    expect(cfg.tierValid).toBe(false);
    expect(cfg.warnings.join(' ')).toContain('DEEPSEEK_TIER');
  });

  it('chat 在任何档位都保持开启', () => {
    process.env.DEEPSEEK_TIER = 'lite';
    const cfg = resolveDeepSeekConfig();
    expect(cfg.capabilities.chat.enabled).toBe(true);
  });
});

// ============================================================
// 上游请求形状（官方文档对齐）
// ============================================================

describe('上游请求形状', () => {
  it('search → POST /v1/tools/search，Bearer 鉴权，count 被夹到 1-50', async () => {
    const calls = stubFetch(() => ({
      json: { results: [{ title: 't', url: 'https://a.test' }] },
    }));
    const r = await call({
      query: { tool: 'search' },
      body: { query: 'DeepSeek', count: 999, needContent: true },
    });

    expect(r.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.deepseek.com/v1/tools/search');
    expect(calls[0].init.headers.Authorization).toBe('Bearer sk-test');
    const sent = JSON.parse(calls[0].init.body);
    expect(sent).toMatchObject({
      query: 'DeepSeek',
      count: 50, // 999 被夹到上限
      need_content: true,
    });
    expect(r.payload.results[0].url).toBe('https://a.test');
  });

  it('search → count 非法值回退为 10', async () => {
    const calls = stubFetch(() => ({ json: { results: [] } }));
    await call({
      query: { tool: 'search' },
      body: { query: 'x', count: 'abc' },
    });
    expect(JSON.parse(calls[0].init.body).count).toBe(10);
  });

  it('fetch → POST /v1/tools/fetch，body 是 { url }', async () => {
    const calls = stubFetch(() => ({
      json: { title: 'T', content: '# hi' },
    }));
    const r = await call({
      query: { tool: 'fetch' },
      body: { url: 'https://example.test/a' },
    });
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://api.deepseek.com/v1/tools/fetch');
    expect(JSON.parse(calls[0].init.body)).toEqual({
      url: 'https://example.test/a',
    });
  });

  it('ocr → POST /v1/tools/ocr，multipart 带 file + purpose', async () => {
    const calls = stubFetch(() => ({
      json: { page_count: 1, pages: [{ index: 0, text: 'hello' }] },
    }));
    const r = await call({
      query: { tool: 'ocr' },
      body: {
        fileBase64: Buffer.from('fake-png').toString('base64'),
        filename: 'a.png',
        purpose: 'text_recognition',
      },
    });
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://api.deepseek.com/v1/tools/ocr');
    const form = calls[0].init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('purpose')).toBe('text_recognition');
    expect(form.get('file')).toBeTruthy();
    // multipart 由运行时自动带 boundary，不能手写 Content-Type
    expect(calls[0].init.headers['Content-Type']).toBeUndefined();
  });

  it('asr → POST /v1/tools/asr，multipart 只有 file', async () => {
    const calls = stubFetch(() => ({
      json: { request_id: 'r1', text: '你好', duration_ms: 1200 },
    }));
    const r = await call({
      query: { tool: 'asr' },
      body: {
        fileBase64: Buffer.from('fake-audio').toString('base64'),
        filename: 'a.wav',
      },
    });
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://api.deepseek.com/v1/tools/asr');
    expect(r.payload.text).toBe('你好');
  });

  it('tts → POST /v1/tools/tts，返回 base64 音频 + contentType', async () => {
    const audio = Buffer.from('RIFF____fake_wav');
    const calls = stubFetch(() => ({ bytes: new Uint8Array(audio) }));
    const r = await call({
      query: { tool: 'tts' },
      body: { text: '你好', voiceId: 'tide', format: 'pcm' },
    });

    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://api.deepseek.com/v1/tools/tts');
    const sent = JSON.parse(calls[0].init.body);
    expect(sent).toMatchObject({
      text: '你好',
      voice_id: 'tide',
      format: 'pcm',
    });
    expect(r.payload.format).toBe('pcm');
    expect(r.payload.contentType).toBe('audio/pcm');
    expect(Buffer.from(r.payload.audioBase64, 'base64').toString()).toBe(
      'RIFF____fake_wav'
    );
  });
});

// ============================================================
// Files API（fileInput 能力）
// ============================================================

describe('files：文件上传与管理', () => {
  it('upload → POST /files，multipart 里 purpose 排在 file 之前', async () => {
    const calls = stubFetch(() => ({
      json: {
        id: 'file-api-abc',
        object: 'file',
        bytes: 10,
        created_at: 1,
        filename: 'a.png',
        purpose: 'user_data',
      },
    }));
    const r = await call({
      query: { tool: 'files' },
      body: {
        action: 'upload',
        fileBase64: Buffer.from('xx').toString('base64'),
        filename: 'a.png',
      },
    });

    expect(r.status).toBe(200);
    expect(r.payload.id).toBe('file-api-abc');
    // 官方要求：端点是 /files（不带 /v1）
    expect(calls[0].url).toBe('https://api.deepseek.com/files');
    const form = calls[0].init.body as FormData;
    // FormData 保持插入顺序，purpose 必须先于 file
    const keys = [...form.keys()];
    expect(keys.indexOf('purpose')).toBeLessThan(keys.indexOf('file'));
    expect(form.get('purpose')).toBe('user_data');
  });

  it('upload → 非法 purpose 被拒', async () => {
    const r = await call({
      query: { tool: 'files' },
      body: {
        action: 'upload',
        fileBase64: 'eA==',
        filename: 'a.pdf',
        purpose: 'user_datax',
      },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('purpose must be one of');
  });

  it('upload → expiry 超出 3600-2592000 被拒', async () => {
    const bad = await call({
      query: { tool: 'files' },
      body: {
        action: 'upload',
        fileBase64: 'eA==',
        filename: 'a.png',
        expiry: { anchor: 'created_at', seconds: 60 },
      },
    });
    expect(bad.status).toBe(400);
    expect(bad.payload.error).toContain('3600-2592000');

    // anchor 只支持 created_at
    const badAnchor = await call({
      query: { tool: 'files' },
      body: {
        action: 'upload',
        fileBase64: 'eA==',
        filename: 'a.png',
        expiry: { anchor: 'upload_at', seconds: 3600 },
      },
    });
    expect(badAnchor.status).toBe(400);
  });

  it('list → GET /files 并带上翻页与过滤参数', async () => {
    const calls = stubFetch(() => ({
      json: { object: 'list', data: [], has_more: false },
    }));
    const r = await call({
      query: { tool: 'files' },
      body: { action: 'list', limit: 5, order: 'desc', purpose: 'user_data' },
    });

    expect(r.status).toBe(200);
    expect(calls[0].url).toBe(
      'https://api.deepseek.com/files?limit=5&order=desc&purpose=user_data'
    );
    // 列文件是 GET
    expect(calls[0].init.method ?? 'GET').toBe('GET');
  });

  it('list → limit 超出 1-1000 被拒', async () => {
    const r = await call({
      query: { tool: 'files' },
      body: { action: 'list', limit: 5000 },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('limit must be 1-1000');
  });

  it('get / delete → 需要 fileId，且路径带转义', async () => {
    const noId = await call({
      query: { tool: 'files' },
      body: { action: 'get' },
    });
    expect(noId.status).toBe(400);
    expect(noId.payload.error).toBe('fileId is required');

    const calls = stubFetch(() => ({
      json: { id: 'file-api-x', object: 'file', deleted: true },
    }));
    const r = await call({
      query: { tool: 'files' },
      body: { action: 'delete', fileId: 'file-api-x' },
    });
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://api.deepseek.com/files/file-api-x');
    expect(calls[0].init.method).toBe('DELETE');
    expect(r.payload.deleted).toBe(true);
  });

  it('未知 action 被拒', async () => {
    const r = await call({
      query: { tool: 'files' },
      body: { action: 'rename' },
    });
    expect(r.status).toBe(400);
    expect(r.payload.error).toContain('upload, list, get, delete');
  });

  it('lite 档关掉 fileInput → 403 且提示正确的 env 名', async () => {
    process.env.DEEPSEEK_TIER = 'lite';
    const r = await call({
      query: { tool: 'files' },
      body: { action: 'list' },
    });
    expect(r.status).toBe(403);
    expect(r.payload.hint).toContain('DEEPSEEK_ENABLE_FILE_INPUT');
  });
});

// ============================================================
// 上游失败如何透传
// ============================================================

describe('上游错误透传', () => {
  it('上游返回 4xx → 端点回 502 并带上游信息', async () => {
    stubFetch(() => ({ status: 400, text: 'bad query' }));
    const r = await call({
      query: { tool: 'search' },
      body: { query: 'x' },
    });
    expect(r.status).toBe(502);
    expect(r.payload.error).toContain('400');
    expect(r.payload.error).toContain('bad query');
  });

  it('上游返回 5xx → 同样包成 502', async () => {
    stubFetch(() => ({ status: 503, text: 'overloaded' }));
    const r = await call({
      query: { tool: 'fetch' },
      body: { url: 'https://example.test' },
    });
    expect(r.status).toBe(502);
    expect(r.payload.error).toContain('503');
  });
});
