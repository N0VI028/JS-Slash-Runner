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
 *   - `should_silence?:boolean`: 是否静默生成; 默认为 'false'
 *   - `image?:File|string`: 图片输入
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:Omit<InjectionPrompt, 'id'>[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 * @returns 生成的最终文本
 *
 * @example
 * // 请求生成
 * const result = await generate({ user_input: '你好' });
 * console.info('收到回复: ', result);
 *
 * @example
 * // 图片输入
 * const result = await generate({ user_input: '你好', image: 'https://example.com/image.jpg' });
 * console.info('收到回复: ', result);
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
 * console.info('收到回复: ', result);
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
 * console.info('收到回复: ', result);
 *
 * @example
 * // 流式生成
 *
 * // 需要预先监听事件来接收流式回复
 * eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, text => {
 *   console.info('收到流式回复: ', text);
 * });
 *
 * // 然后进行生成
 * const result = await generate({ user_input: '你好', should_stream: true });
 * console.info('收到最终回复: ', result);
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
 *   - `should_silence?:boolean`: 是否静默生成; 默认为 'false'
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
 * console.info('收到回复: ', result);
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
 * console.info('收到回复: ', result);
 */
declare function generateRaw(config: GenerateRawConfig): Promise<string>;

/**
 * 获取模型列表
 *
 * @param custom_api 自定义API配置
 * @returns Promise<string[]> 模型列表
 * @throws 获取模型列表失败
 */
declare function getModelList(custom_api: { apiurl: string; key?: string }): Promise<string[]>;

/**
 * 根据生成请求唯一标识符停止特定的生成请求
 *
 * @param generation_id 生成请求唯一标识符, 用于标识要停止的生成请求
 * @returns boolean 是否成功停止生成
 */
declare function stopGenerationById(generation_id: string): boolean;

/**
 * 停止所有正在进行的生成请求
 *
 * @returns boolean 是否成功停止所有生成
 */
declare function stopAllGeneration(): boolean;

type GenerateConfig = {
  /**
   * 请求生成的唯一标识符, 不设置则默认生成一个随机标识符.
   *
   * 当有多个 generate/generateRaw 同时请求生成时, 可以为每个请求指定唯一标识符, 从而能用 `stopGenerationById` 停止特定生成请求, 或正确监听对应的生成事件.
   */
  generation_id?: string;

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
   * 是否静默生成; 默认为 `false`.
   * - `false`: 酒馆页面的发送按钮将会变为停止按钮, 点击停止按钮会中断所有非静默生成请求
   * - `true`: 不影响酒馆停止按钮状态, 点击停止按钮不会中断该生成
   *
   * 虽然静默生成不能通过停止按钮中断, 但可以在代码中使用以下方式停止生成:
   * - 使用该生成请求的 `generation_id` 调用 `stopGenerationById`
   * - 调用 `stopAllGeneration`
   */
  should_silence?: boolean;

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
};

type GenerateRawConfig = GenerateConfig & {
  /**
   * 一个提示词数组, 数组元素将会按顺序发给 AI, 因而相当于自定义预设. 该数组允许存放两种类型:
   * - `BuiltinPrompt`: 内置提示词. 由于不使用预设, 如果需要 "角色描述" 等提示词, 你需要自己指定要用哪些并给出顺序
   *                      如果不想自己指定, 可通过 `builtin_prompt_default_order` 得到酒馆默认预设所使用的顺序 (但对于这种情况, 也许你更应该用 `generate`).
   * - `RolePrompt`: 要额外给定的提示词.
   */
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
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
 * 自定义API配置
 */
type CustomApiConfig = {
  /** 自定义API地址 */
  apiurl: string;
  /** API密钥 */
  key?: string;
  /** 模型名称 */
  model: string;
  /** API源, 默认为 'openai'. 目前支持的源请查看酒馆官方代码[`SillyTavern/src/constants.js`](https://github.com/SillyTavern/SillyTavern/blob/2e3dff73a127679f643e971801cd51173c2c34e7/src/constants.js#L164) */
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
