/**
 * v1.0.0 — DeepSeek 全家桶 Chat 核心实现
 *
 * 基于 DeepSeek Chat Completions 协议（POST /chat/completions, Bearer 鉴权）。
 * 通过 opts 把"三档套餐 + 独立开关"映射成实际请求参数：
 *   - webSearch / readUrl  → tools 数组里的 deepseek_web_search / deepseek_read_url
 *   - deepThink            → thinking: enabled（且强制带 webSearch，深度思考搜索必须声明该工具）
 *   - safety               → safety_check: { level: 'high' }
 *   - title                → title: { enabled: true }
 *
 * 不泄露 key，key 仅从 process.env.DEEPSEEK_API_KEY 读取。
 */
import type { LLMMessage } from '../providers/llm';
import {
  resolveDeepSeekConfig,
  isCapabilityOn,
  type DeepSeekConfig,
} from './capabilities';

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
  const cfg = resolveDeepSeekConfig();
  return callDeepSeekChat(messages, {
    ...optsFromConfig(cfg),
    ...(override || {}),
    timeoutMs,
  });
}
