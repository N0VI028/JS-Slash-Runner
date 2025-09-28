/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 *
 * @example
 * // 在酒馆界面弹出提示语 `运行成功!`
 * triggerSlash('/echo severity=success 运行成功!');
 * // 但更建议你直接用 toastr 弹出提示
 * toastr.success('运行成功!');
 *
 * @example
 * // 获取当前聊天消息最后一条消息对应的 id
 * const last_message_id = await triggerSlash('/pass {{lastMessageId}}');
 */
declare function triggerSlash(command: string): Promise<string>;
