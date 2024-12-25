/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param commandText 要运行的 Slash 命令
 *
 * @example
 * // 在酒馆界面弹出提示语 `hello!`
 * triggerSlash('/echo hello!');
 */
function triggerSlash(commandText: string): void {
  window.parent.postMessage(
    { request: "command", commandText: commandText },
    "*"
  );
}

/**
 * 运行 Slash 命令, 并返回命令管道的结果
 *
 * @param commandText 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 *
 * @example
 * // 获取当前聊天消息最后一条消息对应的 id
 * const last_message_id = await triggerSlashWithResult('/pass {{lastMessageId}}');
 */
function triggerSlashWithResult(commandText: string): Promise<string | undefined> {
  return new Promise((resolve, _) => {
    const messageId = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.request === "commandResult" &&
        event.data.messageId === messageId
      ) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage(
      { request: "commandWithResult", commandText: commandText, messageId: messageId },
      "*"
    );
  });
}
