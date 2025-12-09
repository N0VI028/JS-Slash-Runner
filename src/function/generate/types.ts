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
 * 自定义API配置接口
 */
export type CustomApiConfig = {
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
};

/**
 * 生成配置接口（使用预设）
 */
export type GenerateConfig = {
  generation_id?: string;
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  overrides?: Overrides;
  injects?: Omit<InjectionPrompt, 'id'>[];
  max_chat_history?: 'all' | number;
  custom_api?: CustomApiConfig;
};

/**
 * 原始生成配置接口（不使用预设）
 */
export type GenerateRawConfig = {
  generation_id?: string;
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  overrides?: Overrides;
  injects?: Omit<InjectionPrompt, 'id'>[];
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
  max_chat_history?: 'all' | number;
  custom_api?: CustomApiConfig;
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
export type BuiltinPrompt =
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
export const builtin_prompt_default_order: BuiltinPrompt[] = [
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
    oaiMessages: RolePrompt[];
    oaiMessageExamples: string[];
    promptBias: string[];
  };
  worldInfo: {
    worldInfoAfter: Array<string>;
    worldInfoBefore: Array<string>;
    worldInfoDepth: Array<{ entries: string; depth: number; role: number }>;
    worldInfoExamples: Array<string>;
    worldInfoString: Array<string>;
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
    overrides?: OverrideConfig;
    max_chat_history?: number;
    inject?: Omit<InjectionPrompt, 'id'>[];
    order?: Array<BuiltinPromptEntry | CustomPrompt>;
    custom_api?: CustomApiConfig;
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
