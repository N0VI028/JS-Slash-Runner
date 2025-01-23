"use strict";
/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param command 要运行的 Slash 命令
 *
 * @example
 * // 在酒馆界面弹出提示语 `hello!`
 * await triggerSlash('/echo hello!');
 */
function triggerSlash(command) {
    return detail.make_iframe_promise({
        request: '[Slash][triggerSlash]',
        command: command,
    });
}
/**
 * 运行 Slash 命令, 并返回命令管道的结果
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 *
 * @example
 * // 获取当前聊天消息最后一条消息对应的 id
 * const last_message_id = await triggerSlashWithResult('/pass {{lastMessageId}}');
 */
function triggerSlashWithResult(command) {
    return detail.make_iframe_promise({
        request: '[Slash][triggerSlashWithResult]',
        command: command,
    });
}
//# sourceMappingURL=slash.js.map