type Preset = {
  settings: {
    /** 最大上下文 token 数 */
    max_context: number;
    /** 最大回复 token 数 */
    max_completion_tokens: number;
    /** 每次生成几个回复 */
    reply_count: number;

    /** 是否流式传输 */
    should_stream: boolean;

    /** 温度 */
    temperature: number;
    /** 频率惩罚 */
    frequency_penalty: number;
    /** 存在惩罚 */
    presence_penalty: number;
    top_p: number;
    /** 重复惩罚 */
    repetition_penalty: number;
    min_p: number;
    top_k: number;
    top_a: number;

    /** 种子, -1 表示随机 */
    seed: number;

    /** 压缩系统消息: 将连续的系统消息合并为一条消息 */
    squash_system_messages: boolean;

    /** 推理强度, 即内置思维链的投入程度. 例如, 如果酒馆直连 gemini-2.5-flash, 则 `min` 将会不使用内置思维链 */
    reasoning_effort: 'auto' | 'min' | 'low' | 'medium' | 'high' | 'max';
    /** 请求思维链: 允许模型返回内置思维链的思考过程; 注意这只影响内置思维链显不显示, 不决定模型是否使用内置思维链 */
    request_thoughts: boolean;
    /** 请求图片: 允许模型在回复中返回图片 */
    request_images: boolean;
    /** 启用函数调用: 允许模型使用函数调用功能; 比如 cursor 借此在回复中读写文件、运行命令 */
    enable_function_calling: boolean;
    /** 启用网络搜索: 允许模型使用网络搜索功能 */
    enable_web_search: boolean;

    /** 是否允许发送图片作为提示词 */
    allow_sending_images: 'disabled' | 'auto' | 'low' | 'high';
    /** 是否允许发送视频作为提示词 */
    allow_sending_videos: boolean;

    /**
     * 角色名称前缀: 是否要为消息添加角色名称前缀, 以及怎么添加
     * - `none`: 不添加
     * - `default`: 为与角色卡不同名的消息添加角色名称前缀, 添加到 `content` 字段开头 (即发送的消息内容是 `角色名: 消息内容`)
     * - `content`: 为所有消息添加角色名称前缀, 添加到 `content` 字段开头 (即发送的消息内容是 `角色名: 消息内容`)
     * - `completion`: 在发送给模型时, 将角色名称写入到 `name` 字段; 仅支持字母数字和下划线, 不适用于 Claude、Google 等模型
     */
    character_name_prefix: 'none' | 'default' | 'content' | 'completion';
    /** 用引号包裹用户消息: 在发送给模型之前, 将所有用户消息用引号包裹 */
    wrap_user_messages_in_quotes: boolean;
  };

  /** 提示词列表里已经添加的提示词 */
  prompts: PresetPrompt[];
  /** 下拉框里的, 没有添加进提示词列表的提示词 */
  prompts_unused: PresetPrompt[];

  /** 额外字段, 用于为预设绑定额外数据 */
  extensions: Record<string, any>;
};

type PresetPrompt = {
  /**
   * 根据 id, 预设提示词分为以下三类:
   * - 普通提示词 (`isPresetNormalPrompt`): 预设界面上可以手动添加的提示词
   * - 系统提示词 (`isPresetSystemPrompt`): 酒馆所设置的系统提示词, 但其实相比于手动添加的提示词没有任何优势, 分为 `main`、`nsfw`、`jailbreak`、`enhance_definitions`
   * - 占位符提示词 (`isPresetPlaceholderPrompt`): 用于表示世界书条目、角色卡、玩家角色、聊天记录等提示词的插入位置, 分为 `world_info_before`、`persona_description`、`char_description`、`char_personality`、`scenario`、`world_info_after`、`dialogue_examples`、`chat_history`
   */
  id: LiteralUnion<
    | 'main'
    | 'nsfw'
    | 'jailbreak'
    | 'enhanceDefinitions'
    | 'worldInfoBefore'
    | 'personaDescription'
    | 'charDescription'
    | 'charPersonality'
    | 'scenario'
    | 'worldInfoAfter'
    | 'dialogueExamples'
    | 'chatHistory',
    string
  >;
  name: string;
  enabled: boolean;

  /**
   * 插入位置, 仅用于普通和占位符提示词
   *   - `'relative'`: 按提示词相对位置插入
   *   - `'in_chat'`: 插入到聊天记录的对应深度, 需要设置对应的深度 `depth` 和顺序 `order`
   */
  position:
    | {
        type: 'relative';
        depth?: never;
        order?: never;
      }
    | { type: 'in_chat'; depth: number; order: number };
  role: 'system' | 'user' | 'assistant';
  /** 仅用于普通和系统提示词 */
  content?: string;

  /** 额外字段, 用于为预设提示词绑定额外数据 */
  extra?: Record<string, any>;
};
type PresetNormalPrompt = SetRequired<{ id: string } & Omit<PresetPrompt, 'id'>, 'position' | 'content'>;
type PresetSystemPrompt = SetRequired<
  { id: 'main' | 'nsfw' | 'jailbreak' | 'enhanceDefinitions' } & Omit<PresetPrompt, 'id'>,
  'content'
>;
type PresetPlaceholderPrompt = SetRequired<
  {
    id:
      | 'worldInfoBefore'
      | 'personaDescription'
      | 'charDescription'
      | 'charPersonality'
      | 'scenario'
      | 'worldInfoAfter'
      | 'dialogueExamples'
      | 'chatHistory';
  } & Omit<PresetPrompt, 'id'>,
  'position'
>;
declare function isPresetNormalPrompt(prompt: PresetPrompt): prompt is PresetNormalPrompt;
declare function isPresetSystemPrompt(prompt: PresetPrompt): prompt is PresetSystemPrompt;
declare function isPresetPlaceholderPrompt(prompt: PresetPrompt): prompt is PresetPlaceholderPrompt;

declare const default_preset: Preset;

/**
 * 获取预设名称列表
 *
 * @returns 预设名称列表
 */
declare function getPresetNames(): string[];

/**
 * 获取酒馆正在使用的预设 (`'in_use'`) 是从哪个预设加载来的.
 *
 * 请务必注意这个说法, `'in_use'` 预设虽然是从 `getLoadedPresetName()` 预设加载而来, 但它的预设内容可能与 `getLoadedPresetName()` 预设不同.
 *   请回忆一下: 在酒馆中编辑预设后, 编辑结果会立即在聊天中生效 (`'in_use'` 预设被更改),
 *   但我们没有点击保存按钮 (将 `'in_use'` 预设内容保存回 `getLoadedPresetName()` 预设), 一旦切换预设, 编辑结果就会丢失.
 *
 * @returns 预设名称
 */
declare function getLoadedPresetName(): string;

/**
 * 加载 `preset_name` 预设作为酒馆正在使用的预设 (`'in_use'`)
 *
 * @param preset_name 预设名称
 * @returns 是否成功切换, 可能因预设不存在等原因而失败
 */
declare function loadPreset(preset_name: Exclude<string, 'in_use'>): boolean;

/**
 * 新建 `preset_name` 预设, 内容为 `preset`
 *
 * @param preset_name 预设名称
 * @param preset 预设内容; 不填则使用默认内容
 *
 * @returns 是否成功创建, 如果已经存在同名预设或尝试创建名为 `'in_use'` 的预设会失败
 *
 * @throws 如果创建的预设内容中存在重复的系统/占位提示词, 将会抛出异常
 */
declare function createPreset(preset_name: Exclude<string, 'in_use'>, preset?: Preset): Promise<boolean>;

/**
 * 创建或替换名为 `preset_name` 的预设, 内容为 `preset`
 *
 * @param preset_name 预设名称
 * @param preset 预设内容; 不填则使用默认内容
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 如果对 `'in_use'` 预设进行操作, 应该防抖重新渲染 (debounced) 还是立即重新渲染 (immediate) 预设界面? 默认为性能更好的防抖渲染
 *
 * @returns 如果发生创建, 则返回 `true`; 如果发生替换, 则返回 `false`
 */
declare function createOrReplacePreset(
  preset_name: LiteralUnion<'in_use', string>,
  preset?: Preset,
  { render }?: ReplacePresetOptions,
): Promise<boolean>;

/**
 * 删除 `preset_name` 预设
 *
 * @param preset_name 预设名称
 *
 * @returns 是否成功删除, 可能因预设不存在等原因而失败
 */
declare function deletePreset(preset_name: Exclude<string, 'in_use'>): Promise<boolean>;

/**
 * 重命名 `preset_name` 预设为 `new_name`
 *
 * @param preset_name 预设名称
 * @param new_name 新名称
 *
 * @returns 是否成功重命名, 可能因预设不存在等原因而失败
 */
declare function renamePreset(preset_name: Exclude<string, 'in_use'>, new_name: string): Promise<boolean>;

/**
 * 获取 `preset_name` 预设的内容
 *
 * @param preset_name 预设名称
 *
 * @returns 预设内容
 *
 * @throws 如果预设不存在, 将会抛出异常
 */
declare function getPreset(preset_name: LiteralUnion<'in_use', string>): Preset;

type ReplacePresetOptions = {
  /** 如果对 `'in_use'` 预设进行操作, 应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染 */
  render?: 'debounced' | 'immediate';
};
/**
 * 完全替换 `preset_name` 预设的内容为 `preset`
 *
 * @param preset_name 预设名称
 * @param preset 预设内容
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 如果对 `'in_use'` 预设进行操作, 应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @throws 如果预设不存在, 将会抛出异常
 * @throws 如果替换的预设内容中存在重复的系统/占位提示词, 将会抛出异常
 *
 * @example
 * // 为酒馆正在使用的预设开启流式传输
 * const preset = getPreset('in_use');
 * preset.settings.should_stream = true;
 * await replacePreset('in_use', preset);
 *
 * @example
 * // 为酒馆正在使用的预设添加一个提示词条目
 * const preset = getPreset('in_use');
 * preset.prompts.push({
 *   id: 'new_prompt',
 *   name: '新提示词',
 *   enabled: true,
 *   position: { type: 'relative' },
 *   role: 'user',
 *   content: '新提示词内容',
 * });
 * await replacePreset('in_use', preset);
 *
 * @example
 * // 将 '预设A' 的条目按顺序复制到 '预设B' 开头
 * const preset_a = getPreset('预设A');
 * const preset_b = getPreset('预设B');
 * preset_b.prompts = [...preset_a.prompts, ...preset_b.prompts];
 * await replacePreset('预设B', preset_b);
 */
declare function replacePreset(
  preset_name: LiteralUnion<'in_use', string>,
  preset: Preset,
  { render }?: ReplacePresetOptions,
): Promise<void>;

type PresetUpdater = ((preset: Preset) => Preset) | ((preset: Preset) => Promise<Preset>);
/**
 * 用 `updater` 函数更新 `preset_name` 预设
 *
 * @param preset_name 预设名称
 * @param updater 用于更新预设的函数. 它应该接收预设内容作为参数, 并返回更新后的预设内容.
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 如果对 `'in_use'` 预设进行操作, 应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的预设内容
 *
 * @throws 如果预设不存在, 将会抛出异常
 * @throws 如果替换的预设内容中存在重复的系统/占位提示词, 将会抛出异常
 *
 * @example
 * // 为酒馆正在使用的预设开启流式传输
 * await updatePresetWith('in_use', preset => {
 *   preset.settings.should_stream = true;
 *   return preset;
 * });
 *
 * @example
 * // 为酒馆正在使用的预设添加一个提示词条目
 * await updatePresetWith('in_use', preset => {
 *   preset.prompts.push({
 *     id: 'new_prompt',
 *     name: '新提示词',
 *     enabled: true,
 *     position: { type: 'relative' },
 *     role: 'user',
 *     content: '新提示词内容',
 *   });
 *   return preset;
 * });
 *
 * @example
 * // 将 '预设A' 的条目按顺序复制到 '预设B' 开头
 * await updatePresetWith('预设B', preset => {
 *   const another_preset = getPreset('预设A');
 *   preset.prompts = [...another_preset.prompts, ...preset.prompts];
 *   return preset;
 * });
 */
declare function updatePresetWith(
  preset_name: LiteralUnion<'in_use', string>,
  updater: PresetUpdater,
  { render }?: ReplacePresetOptions,
): Promise<Preset>;

/**
 * 将预设内容修改回预设中, 如果某个内容不存在, 则该内容将会采用原来的值
 *
 * @param preset_name 预设名称
 * @param preset 预设内容
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 如果对 `'in_use'` 预设进行操作, 应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的预设内容
 *
 * @throws 如果预设不存在, 将会抛出异常
 * @throws 如果替换的预设内容中存在重复的系统/占位提示词, 将会抛出异常
 *
 * @example
 * // 为酒馆正在使用的预设开启流式传输
 * await setPreset('in_use', { settings: { should_stream: true } });
 *
 * @example
 * // 将 '预设A' 的条目按顺序复制到 '预设B' 开头
 * await setPreset('预设B', {
 *   prompts: [...getPreset('预设A').prompts, ...getPreset('预设B').prompts],
 * });
 */
declare function setPreset(
  preset_name: LiteralUnion<'in_use', string>,
  preset: PartialDeep<Preset>,
  { render }?: ReplacePresetOptions,
): Promise<Preset>;
