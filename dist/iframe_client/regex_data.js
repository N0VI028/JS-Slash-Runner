"use strict";
/**
 * 判断局部正则是否被启用. 注意, 前端插件已经更新了 "自动启用局部正则" 选项, 所以你其实没必要用这个?
 *
 * 如果你是在被写在局部正则中的全局脚本调用这个函数, **请保证"在编辑时运行"被启用**, 这样这个脚本才会无视局部正则开启情况而运行.
 *
 * @returns 局部正则是否被启用
 */
async function isCharacterRegexEnabled() {
    return detail.make_iframe_promise({
        request: "iframe_is_character_regex_enabled",
    });
}
/**
 * 获取酒馆正则
 *
 * @param option 可选设置
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是正则 `RegexData`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 *
 * @example
 * // 获取所有酒馆正则
 * const regexes = await getRegexData();
 * // 获取当前角色卡目前被启用的局部正则
 * const regexes = await getRegexData({scope: 'character', enable_state: 'enabled'});
 */
async function getRegexData(option = {}) {
    option = {
        scope: option.scope ?? 'all',
        enable_state: option.enable_state ?? 'all',
    };
    return detail.make_iframe_promise({
        request: "iframe_get_regex_data",
        option: option,
    });
}
/**
 * 将酒馆正则信息修改回对应的酒馆正则, 如果某个字段不存在, 则该字段采用原来的值
 *
 * 这只是修改信息, 不能创建新的酒馆正则, 因此要求酒馆正则已经实际存在.
 *
 * @param regex_data 一个数组, 元素是各正则信息. 其中必须有 "id", 而其他字段可选.
 *
 * @example
 * // 让所有酒馆正则 "仅格式提示词"
 * const regex_data = await getRegexData();
 * await setLorebookEntries(regex_data.map((entry) => ({ id: entry.id, destination: {prompt: true} })));
 */
async function setRegexData(regex_data) {
    return detail.make_iframe_promise({
        request: 'iframe_set_regex_data',
        regex_data: regex_data,
    });
}
/**
 * 新增一个酒馆正则
 *
 * @param field_values 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值, **不能设置 `id`**.
 *
 * @returns 新酒馆正则的 id
 *
 * @example
 * const id = await createRegexData({find_regex: '[\s\S]*', replace_string: ''});
 */
async function createRegexData(field_values) {
    return detail.make_iframe_promise({
        request: 'iframe_create_regex_data',
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
async function deleteRegexData(id) {
    return detail.make_iframe_promise({
        request: 'iframe_delete_regex_data',
        id: id,
    });
}
//# sourceMappingURL=regex_data.js.map