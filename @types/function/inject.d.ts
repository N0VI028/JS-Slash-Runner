type InjectionPrompt = {
  id: string;
  /**
   * 要注入的位置
   * - 'in_chat': 插入到聊天中
   * - 'none': 不会发给 AI, 但能用来激活世界书条目.
   */
  position: 'in_chat' | 'none';
  depth: number;

  role: 'system' | 'assistant' | 'user';
  content: string;

  /** 提示词在什么情况下启用; 默认为始终 */
  filter?: (() => boolean) | (() => Promise<boolean>);
  /** 是否作为欲扫描文本, 加入世界书绿灯条目扫描文本中; 默认为任意 */
  should_scan?: boolean;
};

type injectPromptsOptions = {
  /** 是否只在下一次请求生成中有效; 默认为 false */
  once?: boolean;
};

/**
 * 注入提示词
 *
 * 这样注入的提示词仅在当前聊天文件中有效,
 * - 如果需要跨聊天文件注入或在新开聊天时重新注入, 你可以监听 `tavern_events.CHAT_CHANGED` 事件.
 * - 或者, 可以监听 `tavern_events.GENERATION_AFTER_COMMANDS` 事件, 在生成前注入.
 *
 * @param prompts 要注入的提示词
 * @param options 可选选项
 *   - `once:boolean`: 是否只在下一次请求生成中有效; 默认为 false
 *
 * @returns 后续操作
 *   - `uninject`: 取消这个提示词的注入
 */
declare function injectPrompts(prompts: InjectionPrompt[], options?: injectPromptsOptions): { uninject: () => void };

/**
 * 移除注入的提示词
 *
 * @param ids 要移除的提示词的 id 列表
 */
declare function uninjectPrompts(ids: string[]): void;
