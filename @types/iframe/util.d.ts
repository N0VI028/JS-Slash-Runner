/**
 * 在前端界面或脚本内使用, 从而重新加载前端界面或脚本
 *
 * 这相当于调用 `window.location.reload()`, 会让分享到全局的接口失效;
 *   如果有需要在重新加载前端界面后沿用的数据, 你应该自行编写重新加载方式而不是使用这个函数
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
 *
 * @example
 * // 自行编写重新加载方式
 * function initailzie() { ... }
 * $(initialize);
 *
 * function destroy() { eventClearAll(); ... }
 * $(window).on('pagehide', destroy);
 *
 * function reload() {
 *   destory();
 *   initialize();
 * }
 */
declare function reloadIframe(): void;

/**
 * 获取前端界面或脚本的标识名称
 *
 * @returns 对于前端界面是 `TH-message--楼层号--前端界面是该楼层第几个界面`, 对于脚本库是 `TH-script--脚本名称--脚本id`
 */
declare function getIframeName(): string;

/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 *
 * @throws 如果不在楼层消息 iframe 内使用, 将会抛出错误
 */
declare function getCurrentMessageId(): number;

/**
 * 获取脚本的脚本库 id, **只能在脚本内使用**
 *
 * @returns 脚本库的 id
 *
 * @throws 如果不在脚本内使用, 将会抛出错误
 */
declare function getScriptId(): string;
