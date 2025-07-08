function getIframeName(): string {
  return (window.frameElement as Element).id;
}

function getScriptId(): string {
  return $(window.frameElement as Element).attr('script-id') ?? 'unknown_script';
}

function getCurrentMessageId(): number {
  return getMessageId(getIframeName());
}

function getMessageId(iframe_name: string): number {
  const match = iframe_name.match(/^message-iframe-(\d+)-\d+$/);
  if (!match) {
    throw Error(`获取 ${iframe_name} 所在楼层 id 时出错: 不要对全局脚本 iframe 调用 getMessageId!`);
  }
  return parseInt(match[1].toString());
}
