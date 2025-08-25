/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-iframe-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-iframe-脚本名称`; 对于脚本库是 `tavern-helper-script-脚本名称`
 */
declare function getIframeName(): string;

/**
 * 获取脚本的脚本库 id, **只能在脚本内使用**
 *
 * @returns 脚本库的 id
 */
declare function getScriptId(): string;

/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 */
declare function getCurrentMessageId(): number;
