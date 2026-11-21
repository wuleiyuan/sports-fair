/**
 * v1.0.0 — DeepSeek 全家桶能力开关中心
 *
 * 这是 sports-fair 接入 DeepSeek 应用 API 后，所有"能力开关"的**唯一事实来源**。
 * 设计原则（针对开源 + 别人自部署）：
 *   1. 开关 100% 来自环境变量，不引入任何额外服务（KV / DB 都不需要）
 *      → 每个下载者只需填 DEEPSEEK_API_KEY + 选一个 DEEPSEEK_TIER 即可跑
 *   2. 三档套餐（DEEPSEEK_TIER）决定"默认开哪些能力"
 *   3. 每个能力还有独立的环境变量开关（DEEPSEEK_ENABLE_*），
 *      可在套餐基础上单独微调（关掉某项 / 提前打开某项）
 *   4. 绝不读取 / 返回任何 key 内容
 *
 * 能力总览（对应 DeepSeek 全家桶应用 API）：
 *   - chat              基础对话（deepseek-flash）
 *   - webSearch        联网搜索（deepseek_web_search，非思考模式）
 *   - deepThinkSearch  深度思考搜索（deepseek_web_search + thinking）
 *   - readUrl          阅读链接（deepseek_read_url）
 *   - conversationTitle对话标题（title）
 *   - safety           模型安全（safety_check: high）
 *   - fileInput        文件输入（Files API）
 *   - ocr              OCR（/v1/tools/ocr）
 *   - asr              语音识别（/v1/tools/asr）
 *   - tts              语音合成（/v1/tools/tts）
 */

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
