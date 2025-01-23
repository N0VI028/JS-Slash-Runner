"use strict";
/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-脚本名称`
 */
function getIframeName() {
    return window.frameElement.id;
}
/**
 * 从消息楼层 iframe 的 `iframe_name` 获取它所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @param iframe_name 消息楼层 iframe 的名称
 * @returns 楼层 id
 */
function getMessageId(iframe_name) {
    const match = iframe_name.match(/^message-iframe-(\d+)-\d+$/);
    if (!match) {
        throw Error(`获取 ${iframe_name} 所在楼层 id 时出错: 不要对全局脚本 iframe 调用 getMessageId!`);
    }
    return parseInt(match[1].toString());
}
/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 */
function getCurrentMessageId() {
    return getMessageId(getIframeName());
}
/**
 * 替换字符串中的酒馆宏
 *
 * @param text 要替换的字符串
 * @returns 替换结果
 *
 * @example
 * const text = substitudeMacros("{{char}} speaks in {{lastMessageId}}");
 * text == "少女歌剧 speaks in 5";
 */
async function substitudeMacros(text) {
    // QUESTION: 像这样额外编写一个 request, 还是直接用 `await triggerSlashWithResult('/pass "{{char}} speaks in {{lastMessageId}}"')`?
    return detail.make_iframe_promise({
        request: '[Utils][substitudeMacros]',
        text: text,
    });
}
/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
async function getLastMessageId() {
    const result = await substitudeMacros("{{lastMessageId}}");
    if (result === "") {
        throw Error("[Util][getLastMessageId] 未找到任何消息楼层");
    }
    return parseInt(result);
}
/**
 * 生成唯一的 uuidv4 标识符
 *
 * @returns 唯一的 uuidv4 标识符
 */
function generateUuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
//# sourceMappingURL=util.js.map