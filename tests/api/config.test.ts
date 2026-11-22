/**
 * v1.1.0 — /api/config 读写测试
 *
 * 重点验证「后台开关」这条链路本身是否真的成立，而不是只验证只读展示：
 *   1. 没配存储 / 没配 admin token 时必须严格只读，且不能误报可写。
 *   2. 配好之后 POST 能写入覆盖，GET 能把它叠加到环境变量配置上。
 *   3. chat 是基础能力，任何情况下都不能被关掉。
 *
 * 存储用内存假 KV 模拟 Upstash REST 协议（/get/:key、/set/:key、/del/:key），
 * 不打真实网络、不需要真的开一个 Redis。
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/config';
import {
  applyOverrides,
  resolveDeepSeekConfig,
} from '../../api/_shared/deepseek';

const ENV_KEYS = [
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_TIER',
  'DEEPSEEK_ADMIN_TOKEN',
  'DEEPSEEK_ENABLE_OCR',
  'DEEPSEEK_ENABLE_WEB_SEARCH',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

let saved: Record<string, string | undefined> = {};

function makeReq(over: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  return {
    method: over.method ?? 'GET',
    url: '/api/config',
    query: {},
    headers: over.headers ?? {},
    body: over.body ?? {},
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 0,
    payload: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.payload = payload;
      return res;
    },
  };
  return res;
}

async function call(over: Parameters<typeof makeReq>[0]) {
  const res = makeRes();
  await handler(makeReq(over), res);
  return { status: res.statusCode, payload: res.payload };
}

/** 内存版 Upstash REST，够用即可 */
function installFakeKv() {
  const store = new Map<string, string>();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: any, init: any) => {
      const u = String(url);
      const [, op, rawKey] = new URL(u).pathname.split('/');
      const key = decodeURIComponent(rawKey ?? '');
      if (op === 'get') {
        return {
          ok: true,
          json: async () => ({ result: store.get(key) ?? null }),
        } as any;
      }
      if (op === 'set') {
        store.set(key, String(init?.body ?? ''));
        return { ok: true, json: async () => ({ result: 'OK' }) } as any;
      }
      if (op === 'del') {
        store.delete(key);
        return { ok: true, json: async () => ({ result: 1 }) } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    })
  );
  return store;
}

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  // 默认：标准档 + 有 key，但没有任何存储与 admin token
  process.env.DEEPSEEK_API_KEY = 'sk-test';
  process.env.DEEPSEEK_TIER = 'standard';
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('GET /api/config', () => {
  it('没配存储和 token 时明确标记为只读', async () => {
    const { status, payload } = await call({ method: 'GET' });
    expect(status).toBe(200);
    expect(payload.writable).toBe(false);
    expect(payload.storageAvailable).toBe(false);
    expect(payload.tokenRequired).toBe(true);
    expect(payload.storageHint).toBeTruthy();
  });

  it('返回 10 个能力，且标准档下 ocr 关、webSearch 开', async () => {
    const { payload } = await call({ method: 'GET' });
    expect(payload.capabilities).toHaveLength(10);
    const byKey = Object.fromEntries(
      payload.capabilities.map((c: any) => [c.key, c])
    );
    expect(byKey.webSearch.enabled).toBe(true);
    expect(byKey.ocr.enabled).toBe(false);
    // 默认 source 来自档位
    expect(byKey.webSearch.source).toBe('tier');
    // 不泄露 key 本身
    expect(JSON.stringify(payload)).not.toContain('sk-test');
  });

  it('只配了存储但没配 admin token 时仍然不可写', async () => {
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'tok';
    installFakeKv();
    const { payload } = await call({ method: 'GET' });
    expect(payload.storageAvailable).toBe(true);
    expect(payload.writable).toBe(false);
  });
});

describe('POST /api/config 写权限', () => {
  it('没配 DEEPSEEK_ADMIN_TOKEN 时拒绝写入', async () => {
    const { status, payload } = await call({
      method: 'POST',
      body: { capability: 'ocr', enabled: true },
    });
    expect(status).toBe(503);
    expect(payload.error).toBe('Write disabled');
  });

  it('token 不对返回 401', async () => {
    process.env.DEEPSEEK_ADMIN_TOKEN = 'secret';
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'tok';
    installFakeKv();
    const { status } = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'wrong' },
      body: { capability: 'ocr', enabled: true },
    });
    expect(status).toBe(401);
  });

  it('token 对了但没配存储 → 503', async () => {
    process.env.DEEPSEEK_ADMIN_TOKEN = 'secret';
    const { status, payload } = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'ocr', enabled: true },
    });
    expect(status).toBe(503);
    expect(payload.error).toBe('No storage configured');
  });
});

describe('POST /api/config 开关行为', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_ADMIN_TOKEN = 'secret';
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'tok';
    installFakeKv();
  });

  it('可以在标准档下把 ocr 打开，GET 立刻反映出来', async () => {
    const before = await call({ method: 'GET' });
    expect(
      before.payload.capabilities.find((c: any) => c.key === 'ocr').enabled
    ).toBe(false);

    const posted = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'ocr', enabled: true },
    });
    expect(posted.status).toBe(200);
    expect(posted.payload.ok).toBe(true);

    const after = await call({ method: 'GET' });
    const ocr = after.payload.capabilities.find((c: any) => c.key === 'ocr');
    expect(ocr.enabled).toBe(true);
    expect(ocr.source).toBe('override');
  });

  it('也能把档位默认开启的能力关掉', async () => {
    await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'webSearch', enabled: false },
    });
    const after = await call({ method: 'GET' });
    expect(
      after.payload.capabilities.find((c: any) => c.key === 'webSearch').enabled
    ).toBe(false);
  });

  it('enabled=null 清除覆盖，回到档位默认', async () => {
    await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'ocr', enabled: true },
    });
    await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'ocr', enabled: null },
    });
    const after = await call({ method: 'GET' });
    const ocr = after.payload.capabilities.find((c: any) => c.key === 'ocr');
    expect(ocr.enabled).toBe(false);
    expect(ocr.source).toBe('tier');
  });

  it('reset 清空全部覆盖', async () => {
    await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'ocr', enabled: true },
    });
    const reset = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { reset: true },
    });
    expect(reset.status).toBe(200);
    expect(reset.payload.reset).toBe(true);
    expect(
      reset.payload.capabilities.find((c: any) => c.key === 'ocr').enabled
    ).toBe(false);
  });

  it('chat 不能被关闭', async () => {
    const { status, payload } = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'chat', enabled: false },
    });
    expect(status).toBe(400);
    expect(payload.error).toContain('chat');
  });

  it('未知能力名返回 400 并列出可用项', async () => {
    const { status, payload } = await call({
      method: 'POST',
      headers: { 'x-admin-token': 'secret' },
      body: { capability: 'teleport', enabled: true },
    });
    expect(status).toBe(400);
    expect(payload.available).toContain('ocr');
  });

  it('GET 显示是的（可写）状态', async () => {
    const { payload } = await call({ method: 'GET' });
    expect(payload.writable).toBe(true);
    expect(payload.storageAvailable).toBe(true);
    expect(payload.storageHint).toBeUndefined();
  });
});

describe('applyOverrides 纯函数', () => {
  it('覆盖可以把档位关着的打开，也能把档位开着的关掉', () => {
    const cfg = resolveDeepSeekConfig();
    const next = applyOverrides(cfg, { ocr: true, webSearch: false });
    expect(next.capabilities.ocr.enabled).toBe(true);
    expect(next.capabilities.webSearch.enabled).toBe(false);
    expect(next.capabilities.ocr.source).toBe('override');
  });

  it('chat 即使在覆盖里被写成 false 也保持开启', () => {
    const cfg = resolveDeepSeekConfig();
    const next = applyOverrides(cfg, { chat: false });
    expect(next.capabilities.chat.enabled).toBe(true);
  });

  it('不认识的键不会污染配置', () => {
    const cfg = resolveDeepSeekConfig();
    const next = applyOverrides(cfg, { bogus: true } as any);
    expect(next.capabilities.webSearch.enabled).toBe(
      cfg.capabilities.webSearch.enabled
    );
  });
});
