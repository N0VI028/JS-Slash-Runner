interface GenerateConfig {
  /** 用户输入 */
  user_input?: string;

  /**
   * 是否启用流式传输; 默认为 `false`.
   *
   * 若启用流式传输, 每次得到流式传输结果时, 函数将会发送事件:
   * - `ifraem_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
   * - `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
   *
   * @example
   * eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, text => console.info(text));
   */
  should_stream?: boolean;

  /**
   * 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词.
   *   如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述.
   */
  overrides?: Overrides;

  /** 要额外注入的提示词 */
  injects?: InjectionPrompt[];

  /** 最多使用多少条聊天历史; 默认为 'all' */
  max_chat_history?: 'all' | number;
};

/**
 * 使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - `iframe_events.GENERATION_STARTED`: 生成开始
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - `iframe_events.GENERATION_ENDED`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - `user_input?:string`: 用户输入
 *   - `should_stream?:boolean`: 是否启用流式传输; 默认为 'false'
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:InjectionPrompt[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 * @returns 生成的最终文本
 *
 * @example
 * // 流式生成
 * const result = await generate({ user_input: '你好', should_stream: true });
 *
 * @example
 * // 注入、覆盖提示词
 * const result = await generate({
 *   user_input: '你好',
 *   injects: [{ role: 'system', content: '思维链...', position: 'in_chat', depth: 0, should_scan: true, }]
 *   overrides: {
 *     char_personality: '温柔',
 *     world_info_before: '',
 *     chat_history: {
 *       prompts: [],
 *     }
 *   }
 * });
 */
async function generate(config: GenerateConfig): Promise<string> {
  return await detail.make_iframe_promise({
    request: '[Generate][generate]',
    config: config,
  });
}

//----------------------------------------------------------------------------------------------------------------------
interface GenerateRawConfig {
  /**
   * 用户输入.
   *
   * 如果设置, 则无论 ordered_prompts 中是否有 'user_input' 都会加入该用户输入提示词; 默认加入在末尾.
   */
  user_input?: string;

  /**
   * 是否启用流式传输; 默认为 `false`.
   *
   * 若启用流式传输, 每次得到流式传输结果时, 函数将会发送事件:
   * - `ifraem_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
   * - `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
   *
   * @example
   * eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, text => console.info(text));
   */
  should_stream?: boolean;

  /**
   * 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词.
   *   如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖提示词
   */
  overrides?: Overrides;

  /* 要注入的提示词 */
  injects?: InjectionRawPrompt[];

  /**
   * 一个提示词数组, 数组元素将会按顺序发给 ai, 因而相当于自定义预设. 该数组允许存放两种类型:
   * - `BuiltinPrompt`: 内置提示词. 由于不使用预设, 如果需要 "角色描述" 等提示词, 你需要自己指定要用哪些并给出顺序
   *                      如果不想自己指定, 可通过 `builtin_prompt_default_order` 得到酒馆默认预设所使用的顺序 (但对于这种情况, 也许你更应该用 `generate`).
   * - `RolePrompt`: 要额外给定的提示词.
   */
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
};

/**
 * 不使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - `iframe_events.GENERATION_STARTED`: 生成开始
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - `iframe_events.GENERATION_ENDED`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - `user_input?:string`: 用户输入
 *   - `should_stream?:boolean`: 是否启用流式传输; 默认为 'false'
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:InjectionPrompt[]`: 要额外注入的提示词
 *   - `ordered_prompts?:(BuiltinPrompt|RolePrompt)[]`: 一个提示词数组, 数组元素将会按顺序发给 ai, 因而相当于自定义预设
 * @returns 生成的最终文本
 *
 * @example
 * // 自定义内置提示词顺序, 未在 ordered_prompts 中给出的将不会被使用
 * const result = await generateRaw({
 *   user_input: '你好',
 *   ordered_prompts: [
 *     'char_description',
 *     { role: 'system', content: '系统提示' },
 *     'chat_history',
 *     'user_input',
 *   ]
 * })
 */
async function generateRaw(config: GenerateRawConfig): Promise<string> {
  return await detail.make_iframe_promise({
    request: '[Generate][generateRaw]',
    config: config,
  });
}

//----------------------------------------------------------------------------------------------------------------------
interface RolePrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

interface InjectionPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;

  /** 要注入的位置. 'none' 不会发给 ai, 但能用来激活世界书条目. */
  position: 'before_prompt' | 'in_chat' | 'after_prompt' | 'none';

  depth: number;

  /** 是否要加入世界书扫描中 */
  should_scan: boolean;
};

interface InjectionRawPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;

  /** 要注入的位置. 'none' 不会发给 ai, 但能用来激活世界书条目. */
  position: 'in_chat' | 'none';

  depth: number;

  /** 是否要加入世界书扫描中 */
  should_scan: boolean;
};

interface Overrides {
  world_info_before?: string;    // 世界书(角色定义前)
  persona_description?: string;  // 用户描述
  char_description?: string;     // 角色描述
  char_personality?: string;     // 角色性格
  scenario?: string;             // 场景
  world_info_after?: string;     // 世界书(角色定义后)
  dialogue_examples?: string;    // 对话示例

  /**
   * 聊天历史
   * - `with_depth_entries`: 是否启用世界书中按深度插入的条目; 默认为 `true`
   * - `author_note`: 若设置, 覆盖 "作者注释" 为给定的字符串
   * - `prompts`: 若设置, 覆盖 "聊天历史" 为给定的提示词
   */
  chat_history?: {
    with_depth_entries?: boolean,
    author_note?: string;
    prompts?: RolePrompt[];
  };
};

/**
 * 预设为内置提示词设置的默认顺序
 */
const builtin_prompt_default_order: BuiltinPrompt[] = [
  'world_info_before',    // 世界书(角色定义前)
  'persona_description',  // 用户描述
  'char_description',     // 角色描述
  'char_personality',     // 角色性格
  'scenario',             // 场景
  'world_info_after',     // 世界书(角色定义后)
  'dialogue_examples',    // 对话示例
  'chat_history',         // 聊天历史 (含世界书中按深度插入的条目、作者注释)
  'user_input',           // 用户输入
]

type BuiltinPrompt =
  | 'world_info_before'    // 世界书(角色定义前)
  | 'persona_description'  // 用户描述
  | 'char_description'     // 角色描述
  | 'char_personality'     // 角色性格
  | 'scenario'             // 场景
  | 'world_info_after'     // 世界书(角色定义后)
  | 'dialogue_examples'    // 对话示例
  | 'chat_history'         // 聊天历史 (含世界书中按深度插入的条目、作者注释)
  | 'user_input'           // 用户输入
  ;
