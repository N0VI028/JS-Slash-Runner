/**
 * 判断局部正则是否被启用. 注意, 前端插件已经更新了 "自动启用局部正则" 选项, 所以你其实没必要用这个?
 *
 * 如果你是在被写在局部正则中的全局脚本调用这个函数, **请保证"在编辑时运行"被启用**, 这样这个脚本才会无视局部正则开启情况而运行.
 *
 * @returns 局部正则是否被启用
 */
function isCharacterRegexEnabled(): Promise<boolean> {
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
      if (event.data?.request === "iframe_is_character_regex_enabled_callback" && event.data.uid == uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_is_character_regex_enabled",
      uid: uid,
    }, "*");
  });
}

interface RegexData {
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

  min_depth: number | undefined;
  max_depth: number | undefined;
}

interface GetRegexDataOption {
  scope?: 'all' | 'global' | 'character';         // 按所在区域筛选正则; 默认为 `'all'`
  enable_state?: 'all' | 'enabled' | 'disabled';  // 按是否被开启筛选正则; 默认为 `'all'`
}

/**
 * 获取正则
 *
 * @param option 对获取正则进行可选设置
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是正则 `RegexData`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 *
 * @example
 * // 获取所有正则
 * const regexes = await getRegexData();
 * // 获取当前角色卡目前被启用的局部正则
 * const regexes = await getRegexData({scope: 'character', enable_state: 'enabled'});
 */
function getRegexData(option: GetRegexDataOption = {}): Promise<RegexData[]> {
  option = {
    scope: option.scope ?? 'all',
    enable_state: option.enable_state ?? 'all',
  } as Required<GetRegexDataOption>;
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
      if (event.data?.request === "iframe_get_regex_data_callback" && event.data.uid == uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_get_regex_data",
      uid: uid,
      option: option,
    }, "*");
  });
}
