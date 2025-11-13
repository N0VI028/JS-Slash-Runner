declare const builtin: {
  /**
   * 向网页添加一条楼层渲染
   *
   * @param mes 要渲染的楼层数据
   * @param options 可选选项
   * - `type`: 楼层类型; 默认为 `'normal'`
   * - `insertAfter`: 插入到指定楼层后; 默认为 `null`
   * - `scroll`: 是否滚动到新楼层; 默认为 `true`
   * - `insertBefore`: 插入到指定楼层前; 默认为 `null`
   * - `forceId`: 强制使用指定楼层号; 默认为 `null`
   * - `showSwipes`: 是否显示滑动按钮; 默认为 `true`
   */
  addOneMessage: (
    mes: Record<string, any>,
    options?: {
      type?: string;
      insertAfter?: number;
      scroll?: boolean;
      insertBefore?: number;
      forceId?: number;
      showSwipes?: boolean;
    },
  ) => void;
  duringGenerating: () => boolean;
  getImageTokenCost: (data_url: string, quality: 'low' | 'auto' | 'high') => Promise<number>;
  getVideoTokenCost: (data_url: string) => Promise<number>;
  parseRegexFromString: (regex: string) => RegExp | null;
  promptManager: {
    messages: Array<{
      collection: Array<{
        identifier: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        tokens: number;
      }>;
      identifier: string;
    }>;
    getPromptCollection: () => {
      collection: Array<{
        identifier: string;
        name: string;
        enabled?: boolean;

        injection_position: 0 | 1;
        injection_depth: number;
        injection_order: number;

        role: 'user' | 'assistant' | 'system';
        content: string;

        system_prompt: boolean;
        marker?: boolean;

        extra?: Record<string, any>;

        forbid_overrides?: boolean;
      }>;
      [key: string]: any;
    };
    [key: string]: any;
  };
  /** 刷新当前聊天并触发 CHARACTER_MESSAGE_RENDERED 和 USER_MESSAGE_RENDERED 事件从而重新渲染 */
  reloadAndRenderChatWithoutEvents: () => Promise<void>;
  /** 刷新当前聊天但不触发任何事件 */
  reloadChatWithoutEvents: () => Promise<void>;
  /** 刷新世界书编辑器的显示 */
  reloadEditor: (file: string, load_if_not_selected?: boolean) => void;
  /** 刷新世界书编辑器的显示 (防抖) */
  reloadEditorDebounced: (file: string, load_if_not_selected?: boolean) => void;
  /** 将 markdown 渲染成 html */
  renderMarkdown: (string: string) => string;
  /** 刷新预设提示词列表 */
  renderPromptManager: (after_try_generate?: boolean) => void;
  /** 刷新预设提示词列表 (防抖) */
  renderPromptManagerDebounced: (after_try_generate?: boolean) => void;
  saveSettings: () => Promise<void>;
  uuidv4: () => string;
};
