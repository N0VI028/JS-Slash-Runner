export const iframe_client_tavern_regex = `
/**
 * 判断酒馆局部正则是否被启用. 注意, 前端插件已经更新了 "自动启用局部正则" 选项, 所以你其实没必要用这个?
 *
 * 如果你是在局部正则中调用这个函数, **请保证"在编辑时运行"被启用**, 这样这个脚本才会无视局部正则开启情况而运行.
 *
 * @returns 局部正则是否被启用
 */
async function isCharacterTavernRegexEnabled() {
    return detail.make_iframe_promise({
        request: "[TavernRegex][isCharacterTavernRegexesEnabled]",
    });
}
/**
 * 获取酒馆正则
 *
 * @param option 可选选项
 *   - \`scope?:'all'|'global'|'character'\`:         // 按所在区域筛选酒馆正则; 默认为 \`'all'\`
 *   - \`enable_state?:'all'|'enabled'|'disabled'\`:  // 按是否被开启筛选酒馆正则; 默认为 \`'all'\`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 \`TavernRegex\`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 *
 * @example
 * // 获取所有酒馆正则
 * const regexes = await getTavernRegexes();
 *
 * @example
 * // 获取当前角色卡目前被启用的局部正则
 * const regexes = await getTavernRegexes({scope: 'character', enable_state: 'enabled'});
 */
async function getTavernRegexes(option = {}) {
    option = {
        scope: option.scope ?? 'all',
        enable_state: option.enable_state ?? 'all',
    };
    return detail.make_iframe_promise({
        request: "[TavernRegex][getTavernRegexes]",
        option: option,
    });
}
/**
 * 完全替换酒馆正则为 \`regexes\`.
 * - **这是一个很慢的操作!** 尽量对正则做完所有事后再一次性 replaceTavernRegexes.
 * - **为了重新应用正则, 它会重新载入整个聊天消息**, 将会触发 \`tavern_events.CHAT_CHANGED\` 进而重新加载全局脚本和楼层消息.
 *     这意味着如果你在全局脚本中运行本函数, 则该函数之后的内容将不会被执行.
 *
 * 之所以提供这么直接的函数, 是因为你可能需要调换正则顺序等.
 *
 * @param regexes 要用于替换的酒馆正则
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 *
 * @example
 * // 开启所有名字里带 "舞台少女" 的正则
 * let regexes = await getTavernRegexes();
 * regexes.forEach(regex => {
 *   if (regex.script_name.includes('舞台少女')) {
 *     regex.enabled = true;
 *   }
 * });
 * await replaceTavernRegexes(regexes);
 */
async function replaceTavernRegexes(regexes, option = {}) {
    option = {
        scope: option.scope ?? 'all',
    };
    return detail.make_iframe_promise({
        request: '[TavernRegex][replaceTavernRegexes]',
        regexes: regexes,
        option: option,
    });
}
/**
 * 用 \`updater\` 函数更新酒馆正则
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
async function updateTavernRegexesWith(updater, option = {}) {
    const defaulted_option = {
        scope: option.scope ?? 'all',
    };
    let regexes = await getTavernRegexes(defaulted_option);
    regexes = updater(regexes);
    await replaceTavernRegexes(regexes, defaulted_option);
    console.info(\`[Chat Message][updateVariablesWith](\${getIframeName()}) 用函数对\${{ all: '全部', global: '全局', character: '局部' }[defaulted_option.scope]}变量表进行更新, 结果: \${JSON.stringify(regexes)}, 使用的函数:\\n\\n \${JSON.stringify(detail.format_function_to_string(updater))}\`);
    return regexes;
}
//----------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们
/**
 * @deprecated 已弃用, 请使用 isCharacterTavernRegexEnabled
 */
const isCharacterRegexEnabled = isCharacterTavernRegexEnabled;
/**
 * @deprecated 已弃用, 请使用 getTavernRegexes
 */
const getRegexData = getTavernRegexes;
`