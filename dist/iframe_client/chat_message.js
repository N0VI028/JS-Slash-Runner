"use strict";
/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 与 `/messages` 相同
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是每楼的消息 `ChatMessage`. 该数组依据按 message_id 从低到高排序.
 *
 * @example
 * // 仅获取第 10 楼会被 ai 使用的消息页
 * const messages = await getChatMessages(10);
 * const messages = await getChatMessages("10");
 * // 获取第 10 楼的所有消息页
 * const messages = await getChatMessages(10, {swipe: true});
 * // 获取所有楼层的所有消息页
 * const messages = await getChatMessages("0-{{lastMessageId}}", {swipe: true});
 */
async function getChatMessages(range, option = {}) {
    /** @todo @deprecated 在未来移除它 */
    if (Object.hasOwn(option, 'hidden')) {
        console.warn("`hidden` 已经被弃用, 请使用 `hide_state`");
        if (Object.hasOwn(option, 'include_swipe')) {
            console.warn("不要同时使用 hide_state 和 hidden, 请只使用 hide_state");
        }
        else {
            option.hide_state = option.hidden ? 'all' : 'unhidden';
        }
    }
    option = {
        role: option.role ?? 'all',
        hide_state: option.hide_state ?? 'all',
    };
    return detail.make_iframe_promise({
        request: "[ChatMessage][getChatMessages]",
        range: range.toString(),
        option: option,
    });
}
;
async function setChatMessage(field_values, message_id, option = {}) {
    const required_option = {
        swipe_id: option.swipe_id ?? 'current',
        refresh: option.refresh ?? 'display_and_render_current',
    };
    return detail.make_iframe_promise({
        request: "[ChatMessage][setChatMessage]",
        field_values: typeof field_values === 'string' ? { message: field_values } : field_values,
        message_id: message_id,
        option: required_option,
    });
}
//# sourceMappingURL=chat_message.js.map