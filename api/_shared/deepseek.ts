/**
 * v1.0.1 — DeepSeek 全家桶核心（单文件）
 *
 * 合并了能力开关中心 + Chat 实现 + 独立工具客户端。
 * 为什么合成一个文件：Vercel 只会把 api/ 目录内的代码打进函数包
 * （api/ 外的相对导入在运行时会找不到模块），而 Hobby 计划每部署
 * 上限 12 个 Serverless Function —— api/ 下每个 .ts 都占一个名额。
 *
 * 章节：
 *   1. 能力开关中心  Capability / Tier / TIER_PRESET / resolveDeepSeekConfig
 *   2. Chat 实现      callDeepSeekChat / chatWithDefaults
 *   3. 工具客户端     callSearch / callFetch / callOcr / callAsr / callTts
 */
import type { LLMMessage } from './llm.js';
import { storageAvailable, loadOverrides } from './overrides.js';

// ============================================================
// 1. 能力开关中心
// ============================================================

// ============================================================
// 1. 类型定义
// ============================================================

export type Capability =
  | 'chat'
  | 'webSearch'
  | 'deepThinkSearch'
  | 'readUrl'
  | 'conversationTitle'
  | 'safety'
  | 'fileInput'
  | 'ocr'
  | 'asr'
  | 'tts';

export type Tier = 'lite' | 'standard' | 'pro';

/** 每个能力的展示元信息（用于前端设置页） */
export interface CapabilityMeta {
  key: Capability;
  label: string;
  description: string;
  /** 对应的环境变量名（独立开关） */
  envVar: string;
}

export interface CapabilityState {
  key: Capability;
  /** 最终是否开启（套餐默认 ∪ 独立开关，经过校验） */
  enabled: boolean;
  /** 它来自套餐默认还是独立开关 */
  source: 'tier' | 'override';
  /** 独立开关是否被显式设置（用于前端区分"默认关"和"手动关"） */
  explicitlySet: boolean;
  meta: CapabilityMeta;
}

export interface DeepSeekConfig {
  /** 是否配置了 DEEPSEEK_API_KEY */
  configured: boolean;
  /** 当前档位（默认 standard） */
  tier: Tier;
  /** 档位是否合法（非法时回退 standard 并提示） */
  tierValid: boolean;
  capabilities: Record<Capability, CapabilityState>;
  /** 前端可读的档位 → 能力映射（用于展示"该档位含哪些"） */
  tierPreset: Record<Tier, Capability[]>;
  /** 给部署者的可读提示（如 tier 非法） */
  warnings: string[];
}

// ============================================================
// 2. 能力元信息
// ============================================================

export const CAPABILITY_META: Record<Capability, CapabilityMeta> = {
  chat: {
    key: 'chat',
    label: '基础对话',
    description: 'deepseek-flash 模型对话能力（全家桶的底座）',
    envVar: 'DEEPSEEK_ENABLE_CHAT',
  },
  webSearch: {
    key: 'webSearch',
    label: '联网搜索',
    description: '联网搜索（deepseek_web_search，非思考模式），回答带引用',
    envVar: 'DEEPSEEK_ENABLE_WEB_SEARCH',
  },
  deepThinkSearch: {
    key: 'deepThinkSearch',
    label: '深度思考搜索',
    description: '思考模式下的多步联网搜索与读页，最多约 20 次工具调用',
    envVar: 'DEEPSEEK_ENABLE_DEEP_THINK_SEARCH',
  },
  readUrl: {
    key: 'readUrl',
    label: '阅读链接',
    description: '模型自动识别消息里的链接并抓取网页内容（deepseek_read_url）',
    envVar: 'DEEPSEEK_ENABLE_READ_URL',
  },
  conversationTitle: {
    key: 'conversationTitle',
    label: '对话标题',
    description: '自动为对话生成标题（title）',
    envVar: 'DEEPSEEK_ENABLE_CONVERSATION_TITLE',
  },
  safety: {
    key: 'safety',
    label: '模型安全',
    description:
      '开启基础风控，审核输入输出，命中风险返回拒答（safety_check: high）',
    envVar: 'DEEPSEEK_ENABLE_SAFETY',
  },
  fileInput: {
    key: 'fileInput',
    label: '文件输入',
    description: '上传 PDF / Office / 图片，解析后拼入上下文（Files API）',
    envVar: 'DEEPSEEK_ENABLE_FILE_INPUT',
  },
  ocr: {
    key: 'ocr',
    label: 'OCR 文字识别',
    description: '独立 OCR 接口（/v1/tools/ocr），文档/图片转文字',
    envVar: 'DEEPSEEK_ENABLE_OCR',
  },
  asr: {
    key: 'asr',
    label: '语音识别 (ASR)',
    description: '独立语音转文字接口（/v1/tools/asr），用于语音输入',
    envVar: 'DEEPSEEK_ENABLE_ASR',
  },
  tts: {
    key: 'tts',
    label: '语音合成 (TTS)',
    description: '独立文字转语音接口（/v1/tools/tts），用于语音播报',
    envVar: 'DEEPSEEK_ENABLE_TTS',
  },
};

// ============================================================
// 3. 三档套餐预设
// ============================================================

/**
 * 三档套餐（"开成三个"）：
 *   lite     轻量：对话 + 模型安全。最低成本，纯推理。
 *   standard 标准：+ 联网搜索 + 阅读链接 + 对话标题。网页工具档。
 *   pro      专业：+ 深度思考搜索 + 文件输入 + OCR/ASR/TTS。全家桶。
 */
export const TIER_PRESET: Record<Tier, Capability[]> = {
  lite: ['chat', 'safety'],
  standard: ['chat', 'webSearch', 'readUrl', 'conversationTitle', 'safety'],
  pro: [
    'chat',
    'webSearch',
    'deepThinkSearch',
    'readUrl',
    'conversationTitle',
    'safety',
    'fileInput',
    'ocr',
    'asr',
    'tts',
  ],
};

const VALID_TIERS: Tier[] = ['lite', 'standard', 'pro'];

// ============================================================
// 4. 环境变量读取工具
// ============================================================

/** 解析布尔型 env：'true' / '1' / 'yes' 视为开；其余关。空 = 未设置 */
function readBoolEnv(name: string): { value: boolean; set: boolean } {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw.trim() === '') {
    return { value: false, set: false };
  }
  const v = raw.trim().toLowerCase();
  return {
    value: v === 'true' || v === '1' || v === 'yes' || v === 'on',
    set: true,
  };
}

function parseTier(raw: string | undefined): { tier: Tier; valid: boolean } {
  const t = (raw ?? 'standard').trim().toLowerCase();
  if ((VALID_TIERS as string[]).includes(t)) {
    return { tier: t as Tier, valid: true };
  }
  return { tier: 'standard', valid: false };
}

// ============================================================
// 5. 主入口：计算完整配置
// ============================================================

/**
 * 计算当前 DeepSeek 能力配置（纯函数，依赖 process.env）。
 * 合并规则：
 *   1. 先用 TIER_PRESET[tier] 作为默认开启集合
 *   2. 再应用每个能力的独立开关：
 *      - 显式 true  → 强制开（source=override）
 *      - 显式 false → 强制关（source=override）
 *      - 未设置    → 沿用套餐默认（source=tier）
 *   3. chat 永远至少为套餐默认（lite/standard/pro 都含 chat），兜底开启
 */
export function resolveDeepSeekConfig(): DeepSeekConfig {
  const warnings: string[] = [];

  const { tier, valid } = parseTier(process.env.DEEPSEEK_TIER);
  if (!valid) {
    warnings.push(
      `DEEPSEEK_TIER 值无效（收到 "${process.env.DEEPSEEK_TIER}"），已回退到 "standard"。可选：lite / standard / pro。`
    );
  }

  const preset = TIER_PRESET[tier];
  const configured = !!(
    process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 0
  );

  const capabilities = {} as Record<Capability, CapabilityState>;

  (Object.keys(CAPABILITY_META) as Capability[]).forEach((key) => {
    const meta = CAPABILITY_META[key];
    const inPreset = preset.includes(key);
    const { value: overrideVal, set: overrideSet } = readBoolEnv(meta.envVar);

    let enabled: boolean;
    let source: 'tier' | 'override';

    if (overrideSet) {
      enabled = overrideVal;
      source = 'override';
    } else {
      enabled = inPreset;
      source = 'tier';
    }

    // chat 兜底：任何套餐都默认开
    if (key === 'chat' && !enabled) {
      enabled = true;
      // 保持 source 语义：这里属于强制兜底，标注为 tier 默认
      source = 'tier';
    }

    capabilities[key] = {
      key,
      enabled,
      source,
      explicitlySet: overrideSet,
      meta,
    };
  });

  return {
    configured,
    tier,
    tierValid: valid,
    capabilities,
    tierPreset: TIER_PRESET,
    warnings,
  };
}

// ============================================================
// 6. 便捷判断函数（handler / provider 内调用）
// ============================================================

export function isCapabilityOn(cfg: DeepSeekConfig, key: Capability): boolean {
  return cfg.capabilities[key]?.enabled ?? false;
}

/**
 * 把运行时覆盖（后台开关）叠加到环境变量算出的配置上。
 *
 * 语义：环境变量 = 默认值，后台开关 = 运行时覆盖，可以双向拨。
 * 总闸仍然是 DEEPSEEK_API_KEY（没 key 一律不可用）和 DEEPSEEK_TIER（决定默认集合），
 * 覆盖不可能绕过这两者产生费用——真要彻底关停，删 key 即可。
 *
 * 安全：能写覆盖的只有持有 DEEPSEEK_ADMIN_TOKEN 的请求（见 api/config.ts），
 * 否则任何访客都能把付费能力全打开。
 */
export function applyOverrides(
  cfg: DeepSeekConfig,
  overrides: Partial<Record<Capability, boolean>>
): DeepSeekConfig {
  const capabilities = { ...cfg.capabilities };
  (Object.keys(CAPABILITY_META) as Capability[]).forEach((key) => {
    const override = overrides[key];
    if (typeof override !== 'boolean') return;
    const state = capabilities[key];
    if (!state) return;
    // chat 是基础设施，永远不能被关掉
    if (key === 'chat' && !override) return;
    capabilities[key] = {
      ...state,
      enabled: override,
      source: 'override',
      explicitlySet: true,
    };
  });
  return { ...cfg, capabilities };
}

/**
 * 与环境变量配置 + 后台覆盖合并后的完整配置。
 * 没配存储（fork 者默认情况）时退化成 resolveDeepSeekConfig()。
 *
 * 用静态 import 而不是动态 import：Vercel 的依赖追踪对动态 import 的
 * 静态字面量支持得并不稳，一旦漏打包就是运行时 500（这个坑踩过一次）。
 * overrides.ts 对 Capability 只有 type import，运行时擦除，不会形成循环依赖。
 */
export async function resolveDeepSeekConfigWithOverrides(): Promise<DeepSeekConfig> {
  const cfg = resolveDeepSeekConfig();
  try {
    if (!storageAvailable()) return cfg;
    const overrides = await loadOverrides();
    return applyOverrides(cfg, overrides);
  } catch {
    // 覆盖读不到就用环境变量配置，主流程不该因此失败
    return cfg;
  }
}

// ============================================================
// 2. Chat 实现
// ============================================================

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';

export interface DeepSeekChatOptions {
  /** 联网搜索（非思考模式） */
  webSearch?: boolean;
  /** 阅读链接 */
  readUrl?: boolean;
  /** 深度思考搜索（会强制开启 webSearch + thinking） */
  deepThink?: boolean;
  /** 模型安全 */
  safety?: boolean;
  /** 对话标题 */
  title?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface DeepSeekChatResult {
  content: string;
  model: string;
  /** 引用（来自 annotations.url_citation） */
  citations: { url: string; title: string }[];
  refusal: boolean;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    safety_tokens?: number;
  };
}

function buildTools(
  opts: DeepSeekChatOptions
): Array<Record<string, string>> | undefined {
  const tools: Array<Record<string, string>> = [];
  if (opts.webSearch || opts.deepThink) {
    tools.push({ type: 'deepseek_web_search', name: 'deepseek_web_search' });
  }
  if (opts.readUrl) {
    tools.push({ type: 'deepseek_read_url', name: 'deepseek_read_url' });
  }
  return tools.length > 0 ? tools : undefined;
}

export function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key.length === 0) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }
  return key;
}

/**
 * 把当前能力配置合并进 opts（供 buildProvider 包装用：默认只开 safety，不开 web 工具）。
 */
export function optsFromConfig(
  cfg: DeepSeekConfig,
  override?: DeepSeekChatOptions
): DeepSeekChatOptions {
  const base: DeepSeekChatOptions = {
    webSearch: isCapabilityOn(cfg, 'webSearch'),
    readUrl: isCapabilityOn(cfg, 'readUrl'),
    deepThink: isCapabilityOn(cfg, 'deepThinkSearch'),
    safety: isCapabilityOn(cfg, 'safety'),
    title: isCapabilityOn(cfg, 'conversationTitle'),
  };
  return { ...base, ...(override || {}) };
}

export async function callDeepSeekChat(
  messages: LLMMessage[],
  opts: DeepSeekChatOptions = {}
): Promise<DeepSeekChatResult> {
  const apiKey = getApiKey();
  const timeoutMs = opts.timeoutMs ?? 30_000;

  const tools = buildTools(opts);
  const thinking = opts.deepThink ? { type: 'enabled' as const } : undefined;

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 1024,
  };
  // 带 web 工具时这些参数被忽略，但填上无妨；不带时正常生效
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (tools) body.tools = tools;
  if (thinking) body.thinking = thinking;
  if (opts.safety) body.safety_check = { level: 'high' };
  if (opts.title) body.title = { enabled: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }

    const data = await resp.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};
    const content: string = message.content?.trim() || '';
    const finishReason: string = choice?.finish_reason || '';

    // 引用：message.annotations[].url_citation
    const citations: { url: string; title: string }[] = [];
    const annotations = message.annotations || [];
    for (const ann of annotations) {
      const c = ann?.url_citation;
      if (c?.url) citations.push({ url: c.url, title: c.title || c.url });
    }

    const refusal = finishReason === 'content_filter';

    return {
      content,
      model: data.model || DEEPSEEK_MODEL,
      citations,
      refusal,
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
            safety_tokens:
              data.usage.completion_tokens_details?.safety_tokens ??
              data.usage.output_tokens_details?.safety_tokens,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 便捷函数：用当前环境变量配置直接对话（默认能力档） */
export async function chatWithDefaults(
  messages: LLMMessage[],
  override?: DeepSeekChatOptions,
  timeoutMs?: number
): Promise<DeepSeekChatResult> {
  const cfg = await resolveDeepSeekConfigWithOverrides();
  return callDeepSeekChat(messages, {
    ...optsFromConfig(cfg),
    ...(override || {}),
    timeoutMs,
  });
}

// ============================================================
// 3. 独立工具客户端
// ============================================================

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
export async function gateCapability(cap: Capability): Promise<GateResult> {
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
  const cfg = await resolveDeepSeekConfigWithOverrides();
  if (!isCapabilityOn(cfg, cap)) {
    const meta = CAPABILITY_META[cap];
    return {
      ok: false,
      status: 403,
      body: {
        error: `Capability "${cap}" is disabled`,
        hint: `当前套餐/开关下未启用该能力。检查 DEEPSEEK_TIER，或在 ${meta.envVar} 中设为 true 单独开启。`,
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

// ============================================================
// Files API（fileInput 能力）
//
// 官方要点（api-docs.deepseek.com/zh-cn/guides/files_api）：
// - 端点是 /files（注意不是 /v1/files）
// - multipart 里 purpose 字段必须排在 file 之前，否则文档上传 400
// - purpose=user_data 收图片/纯文本/表格/电子书；PDF/Word/PPT 必须用
//   text_recognition 或 rich_layout_recognition，否则 400
// - 上传过程中完成解析，解析成功才返回，file_id 立即可用
// - 文件归属于账号，同账号所有 API key 共享
// ============================================================

export type FilePurpose =
  | 'user_data'
  | 'text_recognition'
  | 'rich_layout_recognition';

export interface DeepSeekFile {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: FilePurpose;
  expires_at?: number;
}

export interface FileExpiry {
  /** 有效期起点，目前只支持 created_at */
  anchor: 'created_at';
  /** 有效期秒数，3600–2592000（1 小时 ~ 30 天） */
  seconds: number;
}

async function bearerGetJson(path: string): Promise<any> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
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

/**
 * 上传文件。purpose 决定服务端如何解析：
 * - user_data：图片 / 纯文本 / 表格 / 电子书，模型能"看到"原内容
 * - text_recognition：PDF/Word/PPT，只取文字
 * - rich_layout_recognition：PDF/Word/PPT，图文混排一起给模型
 */
export async function callFileUpload(
  fileBase64: string,
  filename: string,
  purpose: FilePurpose = 'user_data',
  expiry?: FileExpiry
): Promise<DeepSeekFile> {
  const fields: Record<string, string> = {};
  // purpose 必须排在 file 之前：bearerPostMultipart 先写 fields 再 append file，
  // 正好满足这个顺序要求
  fields.purpose = purpose;
  if (expiry) {
    fields['expires_after[anchor]'] = expiry.anchor;
    fields['expires_after[seconds]'] = String(expiry.seconds);
  }
  return bearerPostMultipart('/files', fields, fileBase64, filename, 'file');
}

/** 列出已上传文件。limit 1–1000，order 默认 asc */
export async function callFileList(options?: {
  after?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  purpose?: FilePurpose;
}): Promise<{ object: string; data: DeepSeekFile[]; has_more: boolean }> {
  const qs = new URLSearchParams();
  if (options?.after) qs.set('after', options.after);
  if (options?.limit !== undefined) qs.set('limit', String(options.limit));
  if (options?.order) qs.set('order', options.order);
  if (options?.purpose) qs.set('purpose', options.purpose);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return bearerGetJson(`/files${suffix}`);
}

/** 查询单个文件信息 */
export async function callFileGet(fileId: string): Promise<DeepSeekFile> {
  return bearerGetJson(`/files/${encodeURIComponent(fileId)}`);
}

/** 删除文件。原始文件与解析结果本就不支持下载，删除只影响后续引用 */
export async function callFileDelete(
  fileId: string
): Promise<{ id: string; object: string; deleted: boolean }> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(
      `${DEEPSEEK_BASE_URL}/files/${encodeURIComponent(fileId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }
    );
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}
