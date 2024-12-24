/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-脚本名称`
 */
function getIframeName(): string {
  return (window.frameElement as Element).id;
}

/**
 * 获取楼层消息 iframe 的所在楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层消息 iframe 的所在楼层 id
 */
function getCurrentMessageId(): number {
  const match = getIframeName().match(/^message-iframe-(\d+)-\d+$/);
  if (!match) {
    throw Error(`获取 iframe 所在楼层 id 时出错: 不要对全局脚本调用 getCurrentMessageId!`);
  }
  return parseInt(match.toString());
}

/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
async function getLastMessageId(): Promise<number> {
  return parseInt(await triggerSlashWithResult("/pass {{lastMessageId}}") as string);
}
