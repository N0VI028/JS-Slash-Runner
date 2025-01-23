/**
 * 判断酒馆局部正则是否被启用. 注意, 前端插件已经更新了 "自动启用局部正则" 选项, 所以你其实没必要用这个?
 *
 * 如果你是在局部正则中调用这个函数, **请保证"在编辑时运行"被启用**, 这样这个脚本才会无视局部正则开启情况而运行.
 *
 * @returns 局部正则是否被启用
 */
async function isCharacterTavernRegexEnabled(): Promise<boolean> {
  return detail.make_iframe_promise({
    request: "iframe_is_character_tavern_regexes_enabled",
  });
}

interface TavernRegex {
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

interface GetTavernRegexesOption {
  scope?: 'all' | 'global' | 'character';         // 按所在区域筛选正则; 默认为 `'all'`
  enable_state?: 'all' | 'enabled' | 'disabled';  // 按是否被开启筛选正则; 默认为 `'all'`
}

/**
 * 获取酒馆正则
 *
 * @param option 可选设置
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 `TavernRegex`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 *
 * @example
 * // 获取所有酒馆正则
 * const regexes = await getTavernRegexes();
 *
 * @example
 * // 获取当前角色卡目前被启用的局部正则
 * const regexes = await getTavernRegexes({scope: 'character', enable_state: 'enabled'});
 */
async function getTavernRegexes(option: GetTavernRegexesOption = {}): Promise<TavernRegex[]> {
  option = {
    scope: option.scope ?? 'all',
    enable_state: option.enable_state ?? 'all',
  } as Required<GetTavernRegexesOption>;
  return detail.make_iframe_promise({
    request: "iframe_get_tavern_regexes",
    option: option,
  });
}

/**
 * 将酒馆正则信息修改回对应的酒馆正则, 如果某个字段不存在, 则该字段采用原来的值.
 *
 * 这只是修改信息, 不能创建新的酒馆正则, 因此要求酒馆正则已经实际存在.
 *
 * @param regexes 一个数组, 元素是各正则信息. 其中必须有 `id`, 而其他字段可选.
 *
 * @example
 * // 让所有酒馆正则开启 "仅格式提示词"
 * const regexes = await getTavernRegexes();
 * await setTavernRegexes(regexes.map(entry => ({ id: entry.id, destination: {prompt: true} })));
 *
 * @example
 * // 开启所有名字里带 "舞台少女" 的正则
 * const regexes = await getTavernRegexes();
 * regexes = regexes.filter(entry => entry.script_name.includes('舞台少女'));
 * await setTavernRegexes(regexes.map(entry => ({ id: entry.id, enabled: true })));
 */
async function setTavernRegexes(regexes: (Pick<TavernRegex, "id"> & Omit<Partial<TavernRegex>, "id">)[]): Promise<void> {
  return detail.make_iframe_promise({
    request: 'iframe_set_tavern_regexes',
    regexes: regexes,
  });
}

/**
 * 新增一个酒馆正则
 *
 * @param field_values 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值. 其中必须有 `script_name` 和 `scope`, **不能设置 `id`**.
 *
 * @returns 新酒馆正则的 `id`
 *
 * @example
 * const id = await createRegexData({scope: 'global', find_regex: '[\s\S]*', replace_string: ''});
 */
async function createTavernRegex(field_values: Pick<TavernRegex, "script_name" | "scope"> & Omit<Partial<TavernRegex>, "id" | "script_name" | "scope">): Promise<string> {
  return detail.make_iframe_promise({
    request: 'iframe_create_tavern_regex',
    field_values: field_values,
  });
}

/**
 * 删除某个酒馆正则
 *
 * @param id 要删除的酒馆正则 id
 *
 * @returns 是否成功删除, 可能因为酒馆正则不存在等原因失败
 */
async function deleteTavernRegex(id: string): Promise<boolean> {
  return detail.make_iframe_promise({
    request: 'iframe_delete_tavern_regex',
    id: id,
  });
}

//----------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们
/**
 * @deprecated 已弃用, 请使用 isCharacterTavernRegexEnabled
 */
const isCharacterRegexEnabled = isCharacterTavernRegexEnabled;

/**
 * @deprecated 已弃用, 请使用 TavernRegex
 */
type RegexData = TavernRegex;

/**
 * @deprecated 已弃用, 请使用 GetTavernRegexesOption
 */
type GetRegexDataOption = GetTavernRegexesOption;

/**
 * @deprecated 已弃用, 请使用 getTavernRegexes
 */
const getRegexData = getTavernRegexes;
