type FormatAsTavernRegexedStringOption = {
  /** 文本所在的深度; 不填则不考虑酒馆正则的`深度`选项: 无论该深度是否在酒馆正则的`最小深度`和`最大深度`范围内都生效 */
  depth?: number;
  /** 角色卡名称; 不填则使用当前角色卡名称 */
  character_name?: string;
}

/**
 * 对 `text` 应用酒馆正则
 *
 * @param text 要应用酒馆正则的文本
 * @param source 文本来源, 例如来自用户输入或 AI 输出. 对应于酒馆正则的`作用范围`选项.
 * @param destination 文本将作为什么而使用, 例如用于显示或作为提示词. 对应于酒馆正则的`仅格式显示`和`仅格式提示词`选项.
 * @param option 可选选项
 *   - `depth?:number`: 文本所在的深度; 不填则不考虑酒馆正则的`深度`选项: 无论该深度是否在酒馆正则的`最小深度`和`最大深度`范围内都生效
 *   - `character_name?:string`: 角色卡名称; 不填则使用当前角色卡名称
 *
 * @example
 * // 获取最后一楼文本, 将它视为将会作为显示的 AI 输出, 对它应用酒馆正则
 * const message = getChatMessages(-1)[0];
 * const result = formatAsTavernRegexedString(message.message, 'ai_output', 'display', { depth: 0 });
 */
declare function formatAsTavernRegexedString(
  text: string,
  source: 'user_input' | 'ai_output' | 'slash_command' | 'world_info' | 'reasoning',
  destination: 'display' | 'prompt',
  { depth, character_name }?: FormatAsTavernRegexedStringOption,
);

type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;
  run_on_edit: boolean;
  scope: 'global' | 'character';
  find_regex: string;
  replace_string: string;
  source: {
    user_input: boolean;
    ai_output: boolean;
    slash_command: boolean;
    world_info: boolean;
  };
  destination: {
    display: boolean;
    prompt: boolean;
  };
  min_depth: number | null;
  max_depth: number | null;
}

/**
 * 判断局部正则是否启用
 */
declare function isCharacterTavernRegexesEnabled(): boolean;

type GetTavernRegexesOption = {
  scope?: 'all' | 'global' | 'character';
  enable_state?: 'all' | 'enabled' | 'disabled';
}

/**
 * 获取酒馆正则
 *
 * @param option 可选选项
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 `TavernRegex`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 */
declare function getTavernRegexes({ scope, enable_state }?: GetTavernRegexesOption): TavernRegex[];

type ReplaceTavernRegexesOption = {
  scope?: 'all' | 'global' | 'character';
}

/**
 * 完全替换酒馆正则为 `regexes`.
 * - **这是一个很慢的操作!** 尽量对正则做完所有事后再一次性 replaceTavernRegexes.
 * - **为了重新应用正则, 它会重新载入整个聊天消息**, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载楼层消息.
 *
 * 之所以提供这么直接的函数, 是因为你可能需要调换正则顺序等.
 *
 * @param regexes 要用于替换的酒馆正则
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 */
declare function replaceTavernRegexes(regexes: TavernRegex[], { scope }: ReplaceTavernRegexesOption): Promise<void>;

type TavernRegexUpdater =
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);

/**
 * 用 `updater` 函数更新酒馆正则
 *
 * @param updater 用于更新酒馆正则的函数. 它应该接收酒馆正则作为参数, 并返回更新后的酒馆正则.
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 *
 * @returns 更新后的酒馆正则
 *
 * @example
 * // 开启所有名字里带 "舞台少女" 的正则
 * await updateTavernRegexesWith(regexes => {
 *   regexes.forEach(regex => {
 *     if (regex.script_name.includes('舞台少女')) {
 *       regex.enabled = true;
 *     }
 *   });
 *   return regexes;
 * });
 */
declare function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  option?: ReplaceTavernRegexesOption,
): Promise<TavernRegex[]>;
