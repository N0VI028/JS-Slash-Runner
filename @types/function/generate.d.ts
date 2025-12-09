/**
 * 自定义API配置
 */
type CustomApiConfig = {
  /** 自定义API地址 */
  apiurl: string;
  /** API密钥 */
  key?: string;
  /** 模型名称 */
  model: string;
  /** API源，默认为 'openai' */
  source?: string;

  /** 最大回复 tokens 度 */
  max_tokens?: 'same_as_preset' | 'unset' | number;
  /** 温度 */
  temperature?: 'same_as_preset' | 'unset' | number;
  /** 频率惩罚 */
  frequency_penalty?: 'same_as_preset' | 'unset' | number;
  /** 存在惩罚 */
  presence_penalty?: 'same_as_preset' | 'unset' | number;
  top_p?: 'same_as_preset' | 'unset' | number;
  top_k?: 'same_as_preset' | 'unset' | number;
};

type GenerateConfig = {
  /** 用户输入 */
  user_input?: string;

  /**
   * 图片输入，支持以下格式：
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string | (File | string)[];

  /**
   * 是否启用流式传输; 默认为 `false`.
   *
   * 若启用流式传输, 每次得到流式传输结果时, 函数将会发送事件:
   * - `iframe_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
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
  injects?: Omit<InjectionPrompt, 'id'>[];

  /** 最多使用多少条聊天历史; 默认为 'all' */
  max_chat_history?: 'all' | number;

  /** 自定义API配置 */
  custom_api?: CustomApiConfig;

  /**
   * 唯一id
   *
   * 可以并发生成，并可以通过stopGenerateById停止特定生成，不设置默认生成uuid，在发送的事件中也会返回该id
   */
  generation_id?: string;
};

type GenerateRawConfig = {
  /**
   * 用户输入.
   *
   * 如果设置, 则无论 ordered_prompts 中是否有 'user_input' 都会加入该用户输入提示词; 默认加入在 'chat_history' 末尾.
   */
  user_input?: string;

  /**
   * 图片输入，支持以下格式：
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string | (File | string)[];

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

  injects?: Omit<InjectionPrompt, 'id'>[];

  /**
   * 一个提示词数组, 数组元素将会按顺序发给 AI, 因而相当于自定义预设. 该数组允许存放两种类型:
   * - `BuiltinPrompt`: 内置提示词. 由于不使用预设, 如果需要 "角色描述" 等提示词, 你需要自己指定要用哪些并给出顺序
   *                      如果不想自己指定, 可通过 `builtin_prompt_default_order` 得到酒馆默认预设所使用的顺序 (但对于这种情况, 也许你更应该用 `generate`).
   * - `RolePrompt`: 要额外给定的提示词.
   */
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];

  /** 最多使用多少条聊天历史; 默认为 'all' */
  max_chat_history?: 'all' | number;

  /** 自定义API配置 */
  custom_api?: CustomApiConfig;

  /**
   * 唯一id
   *
   * 可以并发生成，并可以通过stopGenerateById停止特定生成，不设置默认生成uuid，在发送的事件中也会返回该id
   */
  generation_id?: string;
};

type RolePrompt = {
  role: 'system' | 'assistant' | 'user';
  content: string;
  image?: File | string | (File | string)[];
};

type Overrides = {
  world_info_before?: string;
  persona_description?: string;
  char_description?: string;
  char_personality?: string;
  scenario?: string;
  world_info_after?: string;
  dialogue_examples?: string;

  /**
   * 聊天历史
   * - `with_depth_entries`: 是否启用世界书中按深度插入的条目; 默认为 `true`
   * - `author_note`: 若设置, 覆盖 "作者注释" 为给定的字符串
   * - `prompts`: 若设置, 覆盖 "聊天历史" 为给定的提示词
   */
  chat_history?: {
    with_depth_entries?: boolean;
    author_note?: string;
    prompts?: RolePrompt[];
  };
};

/**
 * 预设为内置提示词设置的默认顺序
 */
declare const builtin_prompt_default_order: BuiltinPrompt[];

type BuiltinPrompt =
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
 * 使用酒馆当前启用的预设, 让 AI 生成一段文本.
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
 *   - `image?:File|string`: 图片输入
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:Omit<InjectionPrompt, 'id'>[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 * @returns 生成的最终文本
 *
 * @example
 * // 流式生成
 * const result = await generate({ user_input: '你好', should_stream: true });
 *
 * @example
 * // 图片输入
 * const result = await generate({ user_input: '你好', image: 'https://example.com/image.jpg' });
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
 *
 * @example
 * // 使用自定义API
 * const result = await generate({
 *   user_input: '你好',
 *   custom_api: {
 *     apiurl: 'https://your-proxy-url.com',
 *     key: 'your-api-key',
 *     model: 'gpt-4',
 *     source: 'openai'
 *   }
 * });
 */
declare function generate(config: GenerateConfig): Promise<string>;

/**
 * 不使用酒馆当前启用的预设, 让 AI 生成一段文本.
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
 *   - `image?:File|string`: 图片输入
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:Omit<InjectionPrompt, 'id'>[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 *   - `ordered_prompts?:(BuiltinPrompt|RolePrompt)[]`: 一个提示词数组, 数组元素将会按顺序发给 AI, 因而相当于自定义预设
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
 *
 * @example
 * // 使用自定义API和自定义提示词顺序
 * const result = await generateRaw({
 *   user_input: '你好',
 *   custom_api: {
 *     apiurl: 'https://your-proxy-url.com',
 *     key: 'your-api-key',
 *     model: 'gpt-4',
 *     source: 'openai'
 *   },
 *   ordered_prompts: [
 *     'char_description',
 *     'chat_history',
 *     'user_input',
 *   ]
 * })
 */
declare function generateRaw(config: GenerateRawConfig): Promise<string>;

/**
 * 根据生成ID停止特定的生成过程
 *
 * @param generationId 生成ID，用于标识要停止的生成过程
 * @returns Promise<boolean> 返回是否成功停止生成
 */
declare function stopGenerationById(generationId: string): Promise<boolean>;

/**
 * 停止所有正在进行的生成过程
 *
 * @returns Promise<boolean> 返回是否成功停止所有生成
 */
declare function stopAllGeneration(): Promise<boolean>;
