/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-脚本名称`
 */
function getIframeName(): string {
  return (window.frameElement as Element).id;
}
