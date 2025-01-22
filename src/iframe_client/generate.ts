interface GenerateParams {
  userInput?: string;  // 用户输入的文本
  usePreset?: boolean;  // 是否使用预设
  promptConfig?: PromptConfig;  // 提示词配置
}
interface PromptConfig {
  filter?: string[];  // 用于过滤提示词的数组
  overrides?: (Override | ChatHistoryOverride)[];  // 要覆盖的提示词
  maxChatHistory?: number;  // 聊天记录的最高插入数
  inject?: {
    role: 'system' | 'user' | 'assistant';  // 消息角色
    content: string;  // 提示词内容
    position?: 'IN_PROMPT' | 'IN_CHAT' | 'BEFORE_PROMPT' | 'NONE';  // 注入位置
    depth?: number;  // 注入深度
    scan?: boolean;  // 是否允许扫描
  }[];
  order?: (string | {
    role: 'system' | 'user' | 'assistant';
    content: string;
  })[];  // 混合类型的提示词顺序配置
}
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Override {
  id: string;
  content: string;
}
interface ChatHistoryOverride {
  id: 'chatHistory';
  content: ChatMessage[];
}
async function generateRequest(event: GenerateParams) {
  return detail.make_iframe_promise({
    request: 'iframe_generate',
    userInput: event.userInput,
    usePreset: event.usePreset,
    promptConfig: event.promptConfig,
  });
}
