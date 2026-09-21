import { InjectionPrompt } from '@/function/inject';

/**
 * 角色类型（复制自@sillytavern/script以避免依赖）
 */
export const extension_prompt_roles = {
  SYSTEM: 0,
  USER: 1,
  ASSISTANT: 2,
} as const;

/**
 * Tool function 定义
 */
export type ToolFunction = {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
};

/**
 * Tool 定义（OpenAI 格式）
 */
export type ToolDefinition = {
  type: 'function';
  function: ToolFunction;
};

/**
 * Tool choice 选项
 */
export type ToolChoice = 'auto' | 'required' | 'none' | 'any' | { type: 'function'; function: { name: string } };

/**
 * JSON Schema 定义，用于强制模型输出符合指定 schema 的 JSON
 */
export type JsonSchema = {
  name: string;
  description?: string;
  value: Record<string, any>;
  strict?: boolean;
};

/**
 * 单条 tool call（对外统一形态）
 */
export type GenerateToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
  /** 加密的 reasoning/thought 签名（若 provider 返回），多轮 tool call 时需回传 */
  thought_signature?: string;
};

/**
 * 当模型返回 tool_calls 时的结构化结果
 */
export type GenerateToolCallResult = {
  content: string;
  /** 模型思维链正文，推理模型返回 */
  readonly reasoning?: string;
  tool_calls: GenerateToolCall[];
  /**
   * 顶层 reasoning 签名（非绑定到具体 tool_call 的那一份）。
   * 同样用于多轮场景下把 thinking 上下文回传给下一轮请求。
   */
  reasoning_signature?: string;
};

/**
 * generate / generateRaw 的统一详情对象：有 reasoning 或 tool_calls 时返回
 */
export interface GenerateResult {
  readonly content: string;
  /** 模型思维链正文（推理模型且后端返回时存在；保持后端原文，不做 cleanUpMessage） */
  readonly reasoning?: string;
  /** 顶层 reasoning 签名（多轮 tool call 场景回传用） */
  readonly reasoning_signature?: string;
  readonly tool_calls?: GenerateToolCall[];
}

/**
 * 有 reasoning、无 tool call 时的 String 子类包装：
 * 字符串方法照常可用，兼有 .content / .reasoning。
 * 注意 declare 修饰：纯类型声明，不生成值为 undefined 的自有属性，
 * 保证「字段不存在」语义（'reasoning' in result 不被污染）。
 */
export class BoxedGenerateDetails extends String implements GenerateResult {
  declare readonly reasoning?: string;
  declare readonly reasoning_signature?: string;

  get content(): string {
    return String.prototype.valueOf.call(this);
  }
}

/**
 * - 有 tool_calls → plain object（存量形态 + 可选 reasoning）
 * - 有 reasoning / reasoning_signature、无 tool_calls → BoxedGenerateDetails
 * - 都没有 → primitive string（与旧版逐字节一致）
 * 字段用条件展开构造，确保「无值时字段真正不存在」而非 undefined。
 */
export function createGenerateResult(
  content: string,
  details: {
    reasoning?: string;
    reasoning_signature?: string;
    tool_calls?: GenerateToolCall[];
  } = {},
): string | GenerateResult {
  const metadata = {
    ...(details.reasoning ? { reasoning: details.reasoning } : {}),
    ...(details.reasoning_signature ? { reasoning_signature: details.reasoning_signature } : {}),
  };
  if (details.tool_calls?.length) {
    return { content, tool_calls: details.tool_calls, ...metadata };
  }
  if (!details.reasoning && !details.reasoning_signature) {
    return content;
  }
  return Object.assign(new BoxedGenerateDetails(content), metadata);
}

/**
 * 自定义API配置接口
 */
export type CustomApiConfig = {
  proxy_preset?: string;
  apiurl?: string;
  key?: string;
  model?: string;
  source?: string;
  max_tokens?: 'same_as_preset' | 'unset' | number;
  temperature?: 'same_as_preset' | 'unset' | number;
  frequency_penalty?: 'same_as_preset' | 'unset' | number;
  presence_penalty?: 'same_as_preset' | 'unset' | number;
  top_p?: 'same_as_preset' | 'unset' | number;
  top_k?: 'same_as_preset' | 'unset' | number;
  custom_include_body?: Record<string, any>;
  custom_exclude_body?: string[];
  custom_include_headers?: Record<string, any>;
};

/**
 * 生成配置接口（使用预设）
 */
export type GenerateConfig = {
  preset_name?: 'in_use' | string;
  generation_id?: string;
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  should_silence?: boolean;
  overrides?: Overrides;
  injects?: Omit<InjectionPrompt, 'id'>[];
  max_chat_history?: 'all' | number;
  custom_api?: CustomApiConfig;
  tools?: ToolDefinition[];
  tool_choice?: ToolChoice;
  json_schema?: JsonSchema;
};

/**
 * 原始生成配置接口（不使用预设）
 */
export type GenerateRawConfig = {
  generation_id?: string;
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  should_silence?: boolean;
  overrides?: Overrides;
  injects?: Omit<InjectionPrompt, 'id'>[];
  ordered_prompts?: (PlaceholderPrompt | RolePrompt)[];
  max_chat_history?: 'all' | number;
  custom_api?: CustomApiConfig;
  tools?: ToolDefinition[];
  tool_choice?: ToolChoice;
  json_schema?: JsonSchema;
};

/**
 * 角色提示词接口
 */
export type RolePrompt = {
  role: 'system' | 'assistant' | 'user';
  content: string;
  image?: File | string | (File | string)[];
};

/**
 * 覆盖配置接口
 */
export type Overrides = {
  world_info_before?: string; // 世界书(角色定义前)
  persona_description?: string; // 用户描述
  char_description?: string; // 角色描述
  char_personality?: string; // 角色性格
  scenario?: string; // 场景
  world_info_after?: string; // 世界书(角色定义后)
  dialogue_examples?: string; // 对话示例
  chat_history?: {
    with_depth_entries?: boolean;
    author_note?: string;
    prompts?: RolePrompt[];
  };
};

/**
 * 内置提示词类型
 */
export type PlaceholderPrompt =
  | 'world_info_before'
  | 'persona_description'
  | 'char_description'
  | 'char_personality'
  | 'scenario'
  | 'world_info_after'
  | 'dialogue_examples'
  | 'chat_history'
  | 'user_input';

/**
 * 默认内置提示词顺序
 */
export const placeholder_prompt_default_order: PlaceholderPrompt[] = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'chat_history',
  'user_input',
];

/**
 * 基础数据接口
 */
export type BaseData = {
  characterInfo: {
    description: string;
    personality: string;
    persona: string;
    scenario: string;
    system: string;
    jailbreak: string;
  };
  chatContext: {
    oaiMessages: any[];
    oaiMessageExamples: any[];
    promptBias: string;
  };
  worldInfo: {
    worldInfoAfter: string | null;
    worldInfoBefore: string | null;
    worldInfoDepth: any[] | null;
    worldInfoExamples: any[];
    worldInfoString: string;
  };
};

/**
 * 详细配置命名空间
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace detail {
  export type CustomPrompt = {
    role: 'system' | 'user' | 'assistant';
    content: string;
  };

  // 覆盖配置类型
  export type OverrideConfig = {
    world_info_before?: string; // 世界书（角色定义之前的部分）
    persona_description?: string; // 用户描述
    char_description?: string; // 角色描述
    char_personality?: string; // 角色高级定义-性格
    scenario?: string; // 场景
    world_info_after?: string; // 世界书（角色定义之后的部分）
    dialogue_examples?: string; // 角色高级定义-对话示例

    with_depth_entries?: boolean; // 世界书深度
    author_note?: string; // 作者注释
    chat_history?: RolePrompt[]; // 聊天历史
  };

  // 内置提示词条目类型
  export type BuiltinPromptEntry =
    | 'world_info_before' // 世界书(角色定义前)
    | 'persona_description' // 用户描述
    | 'char_description' // 角色描述
    | 'char_personality' // 角色性格
    | 'scenario' // 场景
    | 'world_info_after' // 世界书(角色定义后)
    | 'dialogue_examples' // 对话示例
    | 'chat_history' // 聊天历史
    | 'user_input'; // 用户输入

  // 生成参数类型
  export type GenerateParams = {
    generation_id?: string;
    user_input?: string;
    use_preset?: boolean;
    image?: File | string | (File | string)[];
    stream?: boolean;
    bindToStopButton?: boolean;
    overrides?: OverrideConfig;
    max_chat_history?: number;
    inject?: Omit<InjectionPrompt, 'id'>[];
    order?: Array<BuiltinPromptEntry | CustomPrompt>;
    custom_api?: CustomApiConfig;
    tools?: ToolDefinition[];
    tool_choice?: ToolChoice;
    json_schema?: JsonSchema;
  };
}

/**
 * 角色类型映射
 */
export const roleTypes: Record<
  'system' | 'user' | 'assistant',
  (typeof extension_prompt_roles)[keyof typeof extension_prompt_roles]
> = {
  system: extension_prompt_roles.SYSTEM,
  user: extension_prompt_roles.USER,
  assistant: extension_prompt_roles.ASSISTANT,
};

/**
 * 默认提示词顺序
 */
export const default_order: detail.BuiltinPromptEntry[] = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'chat_history',
  'user_input',
];

/**
 * 角色名称行为常量
 */
export const character_names_behavior = {
  NONE: -1,
  DEFAULT: 0,
  COMPLETION: 1,
  CONTENT: 2,
};
