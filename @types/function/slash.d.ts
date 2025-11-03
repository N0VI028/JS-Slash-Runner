/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * 能使用的命令请参考[编写模板](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/)的 `slash_command.txt` 或[命令手册](https://rentry.org/sillytavern-script-book).
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 *
 * @throws Slash 命令出错时, 将会抛出错误
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
 * // 但更建议你用酒馆助手函数
 * const last_message = getLastMessageId();
 *
 * @example
 * // 创建一条用户输入到消息楼层末尾
 * await createChatMessages([{ role: 'user', content: '你好' }]);
 * // 触发 AI 回复
 * await triggerSlash('/trigger');
 */
declare function triggerSlash(command: string): Promise<string>;
