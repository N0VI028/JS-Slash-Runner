/**
 * 在前端界面或脚本内使用, 从而重新加载前端界面或脚本
 *
 * @example
 * // 当聊天文件变更时, 重新加载前端界面或脚本
 * let current_chat_id = SillyTavern.getCurrentChatId();
 * eventOn(tavern_events.CHAT_CHANGED, chat_id => {
 *   if (current_chat_id !== chat_id) {
 *     current_chat_id = chat_id;
 *     reloadIframe();
 *   }
 * })
 */
declare function reloadIframe(): void;

/**
 * 获取前端界面或脚本的标识名称
 *
 * @returns 对于前端界面是 `TH-message-楼层号-前端界面是该楼层第几个界面`, 对于脚本库是 `TH-script-脚本id`
 */
declare function getIframeName(): string;

/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 */
declare function getCurrentMessageId(): number;

/**
 * 获取脚本的脚本库 id, **只能在脚本内使用**
 *
 * @returns 脚本库的 id
 */
declare function getScriptId(): string;
