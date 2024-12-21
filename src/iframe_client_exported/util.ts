export const iframe_client_util = `
/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 \`message-楼层id-属于该楼层第几个代码块\`; 对于全局脚本是 \`script-脚本名称\`
 */
function getIframeName() {
    return window.frameElement.id;
}
`