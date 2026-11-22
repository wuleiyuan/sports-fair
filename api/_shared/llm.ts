/**
 * LLM Provider 抽象层（mimo / openai / anthropic / deepseek）
 * 原在仓库根 lib/，现迁入 api/_shared/（原因见 api/_shared/deepseek.ts 顶部说明）。
 *
 * deepseek 分支走共享的 chat 实现（含能力开关），因此运行时依赖 ./deepseek；
 * 而 ./deepseek 只在类型层面引用本文件的 LLMMessage（`import type`，运行时擦除），
 * 所以不存在运行时循环依赖。
 */
import { chatWithDefaults } from './deepseek.js';

export type ProviderName = 'mimo' | 'openai' | 'anthropic' | 'deepseek';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  /** 短超时（毫秒），provider 内部实现 */
  timeoutMs?: number;
}

export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** DeepSeek 安全审核 token（单独计费，仅 DeepSeek 开启 safety 时返回） */
  safety_tokens?: number;
}

export interface LLMCitation {
  url: string;
  title: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: LLMUsage;
  /** provider 标识（用于前端徽章 / 日志） */
  provider: ProviderName;
  /**
   * 引用来源（仅 DeepSeek 开启联网搜索时返回）。
   * 来自 message.annotations[].url_citation，用于在建议下方列出出处。
   */
  citations?: LLMCitation[];
}

export interface LLMProvider {
  name: ProviderName;
  /** 用户在 dashboard 配的 env key 名（用于启动时校验 + 文档） */
  envKeyName: string;
  /** 默认模型 */
  defaultModel: string;
  /** provider 自己的 base URL（可被 env 覆盖） */
  defaultBaseUrl: string;
  /** 实际发请求 */
  call(req: LLMRequest): Promise<LLMResponse>;
}

// ============================================================
// 1. MiMo (小米, OpenAI 兼容)
// ============================================================

interface MiMoProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

function createMimoProvider(opts: MiMoProviderOptions): LLMProvider {
  const baseUrl = opts.baseUrl || 'https://api.xiaomimimo.com/v1';
  const model = opts.model || 'mimo-v2-flash';

  return {
    name: 'mimo',
    envKeyName: 'MIMO_API_KEY',
    defaultModel: 'mimo-v2-flash',
    defaultBaseUrl: 'https://api.xiaomimimo.com/v1',

    async call(req: LLMRequest): Promise<LLMResponse> {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        req.timeoutMs ?? 10_000
      );

      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify({
            model: req.model ?? model,
            messages: req.messages,
            temperature: req.temperature ?? 0.7,
            max_tokens: req.maxTokens ?? 400,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`MiMo HTTP ${resp.status}: ${err.slice(0, 200)}`);
        }

        const data = await resp.json();
        return {
          content: data.choices?.[0]?.message?.content?.trim() || '',
          model: data.model ?? model,
          usage: data.usage,
          provider: 'mimo',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

// ============================================================
// 2. OpenAI (gpt-4o-mini / gpt-3.5-turbo / o4-mini 等)
// ============================================================

function createOpenAIProvider(opts: MiMoProviderOptions): LLMProvider {
  const baseUrl = opts.baseUrl || 'https://api.openai.com/v1';
  const model = opts.model || 'gpt-4o-mini';

  return {
    name: 'openai',
    envKeyName: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',

    async call(req: LLMRequest): Promise<LLMResponse> {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        req.timeoutMs ?? 10_000
      );

      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify({
            model: req.model ?? model,
            messages: req.messages,
            temperature: req.temperature ?? 0.7,
            max_tokens: req.maxTokens ?? 400,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`OpenAI HTTP ${resp.status}: ${err.slice(0, 200)}`);
        }

        const data = await resp.json();
        return {
          content: data.choices?.[0]?.message?.content?.trim() || '',
          model: data.model ?? model,
          usage: data.usage,
          provider: 'openai',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

// ============================================================
// 3. Anthropic (claude-haiku / claude-sonnet 等，API 格式不一样)
// ============================================================

interface AnthropicProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

function createAnthropicProvider(opts: AnthropicProviderOptions): LLMProvider {
  const baseUrl = opts.baseUrl || 'https://api.anthropic.com/v1';
  const model = opts.model || 'claude-haiku-4-5';

  return {
    name: 'anthropic',
    envKeyName: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-haiku-4-5',
    defaultBaseUrl: 'https://api.anthropic.com/v1',

    async call(req: LLMRequest): Promise<LLMResponse> {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        req.timeoutMs ?? 12_000
      );

      try {
        // Anthropic Messages API 格式与 OpenAI 不同：system 单独字段
        const systemMsg = req.messages.find((m) => m.role === 'system');
        const userMsgs = req.messages.filter((m) => m.role !== 'system');

        const body: Record<string, unknown> = {
          model: req.model ?? model,
          max_tokens: req.maxTokens ?? 400,
          temperature: req.temperature ?? 0.7,
          messages: userMsgs,
        };
        if (systemMsg) {
          body.system = systemMsg.content;
        }

        const resp = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': opts.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(
            `Anthropic HTTP ${resp.status}: ${err.slice(0, 200)}`
          );
        }

        const data = await resp.json();
        return {
          content: data.content?.[0]?.text?.trim() || '',
          model: data.model ?? model,
          usage: data.usage
            ? {
                prompt_tokens: data.usage.input_tokens,
                completion_tokens: data.usage.output_tokens,
                total_tokens:
                  (data.usage.input_tokens ?? 0) +
                  (data.usage.output_tokens ?? 0),
              }
            : undefined,
          provider: 'anthropic',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

// ============================================================
// Factory
// ============================================================

export interface BuildProviderOptions {
  /** 用户在 env 指定的 provider 名，默认 'mimo' */
  providerName?: ProviderName;
}

export function buildProvider(opts: BuildProviderOptions = {}): LLMProvider {
  const name: ProviderName = opts.providerName ?? 'mimo';

  switch (name) {
    case 'mimo': {
      const apiKey = process.env.MIMO_API_KEY;
      if (!apiKey) throw new Error('MIMO_API_KEY not configured');
      return createMimoProvider({
        apiKey,
        baseUrl: process.env.MIMO_BASE_URL,
        model: process.env.MIMO_MODEL,
      });
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
      return createOpenAIProvider({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
      });
    }
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
      return createAnthropicProvider({
        apiKey,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        model: process.env.ANTHROPIC_MODEL,
      });
    }
    case 'deepseek': {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');
      return createDeepSeekProvider({
        apiKey,
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      });
    }
    default:
      throw new Error(`Unknown LLM provider: ${name}`);
  }
}

// ============================================================
// 4. DeepSeek（全家桶应用 API, Chat Completions 协议）
// ============================================================

interface DeepSeekProviderOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * DeepSeek 全功能 provider：复用 api/_shared/deepseek.ts 的 chatWithDefaults，
 * 让三档套餐 + 每个 DEEPSEEK_ENABLE_* 开关真正作用于主对话（web 工具 / thinking /
 * safety / title 都由能力中心决定，而不是在这里写死一个朴素 chat 请求）。
 */
function createDeepSeekProvider(opts: DeepSeekProviderOptions): LLMProvider {
  return {
    name: 'deepseek',
    envKeyName: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-flash',
    defaultBaseUrl: 'https://api.deepseek.com',
    async call(req: LLMRequest): Promise<LLMResponse> {
      const result = await chatWithDefaults(
        req.messages,
        undefined,
        req.timeoutMs ?? 30_000
      );
      if (result.refusal) {
        throw new Error(
          'DeepSeek safety check refused this request (content_filter)'
        );
      }
      return {
        content: result.content,
        model: result.model || opts.model || 'deepseek-flash',
        provider: 'deepseek',
        usage: result.usage
          ? {
              prompt_tokens: result.usage.prompt_tokens,
              completion_tokens: result.usage.completion_tokens,
              total_tokens: result.usage.total_tokens,
              // 安全审核 token 单独计费，这里透传供上层统计
              ...(result.usage.safety_tokens !== undefined
                ? { safety_tokens: result.usage.safety_tokens }
                : {}),
            }
          : undefined,
        // 联网搜索的引用来源：不传下去用户就看不到出处了
        ...(result.citations && result.citations.length > 0
          ? { citations: result.citations }
          : {}),
      };
    },
  };
}
