interface RolePrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InjectionPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
  position?: 'IN_PROMPT' | 'IN_CHAT' | 'BEFORE_PROMPT';
  depth?: number;
  scan?: boolean;
}

interface CustomPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 覆盖配置类型
interface OverrideConfig {
  world_info_before?: string;      // 世界书（角色定义之前的部分）
  persona_description?: string;    // 用户描述  
  char_description?: string;       // 角色描述
  char_personality?: string;       // 角色高级定义-性格
  scenario?: string;              // 场景
  world_info_after?: string;      // 世界书（角色定义之后的部分）
  world_info_depth?: string;     // 世界书深度
  dialogue_examples?: string;      // 角色高级定义-对话示例
  chat_history?: RolePrompt[];   // 聊天历史
  author_note?: string;           // 作者注释
}

// 内置提示词条目类型
type BuiltinPromptEntry =
  | 'world_info_before'      // 世界书(角色定义前)
  | 'persona_description'    // 用户描述
  | 'char_description'       // 角色描述
  | 'char_personality'       // 角色性格
  | 'scenario'              // 场景
  | 'world_info_after'      // 世界书(角色定义后)
  | 'dialogue_examples'      // 对话示例
  | 'chat_history'          // 聊天历史
  | 'user_input';           // 用户输入

// 生成参数类型
interface GenerateParams {
  user_input?: string;
  use_preset?: boolean;
  stream?: boolean;
  overrides?: OverrideConfig;
  max_chat_history?: number;
  inject?: InjectionPrompt[];
  order?: (BuiltinPromptEntry | CustomPrompt)[];
}

async function generateRequest(event: GenerateParams): Promise<void> {
  await detail.make_iframe_promise({
    request: 'iframe_generate',
    option: {
      ...event
    }
  });
}