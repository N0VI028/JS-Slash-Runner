export const iframe_client_message_channel = `
/**
 * 发送消息到 \`channel\` 消息频道, 同时可以发送一些数据 \`data\`.
 *
 * 所有正在等待 \`channel\` 消息频道的都会收到该消息并接收到 \`data\`.
 *
 * @param channel 要发送到的消息频道名称
 * @param data 要随着消息发送的数据
 *
 * @example
 * // 发送 ["你好"] 到 "频道名称" 消息频道
 * notifyAll("频道名称", "你好");
 * // 发送 ["你好", 0] 到 "频道名称" 消息频道
 * notifyAll("频道名称", "你好", 0);
 *
 * @example
 * // 啥都不发送, 单纯提示在等 "频道名称" 消息频道消息的家伙别等了
 * notifyAll("频道名称");
 */
function notifyAll(channel, ...data) {
    window.parent.postMessage({
        request: "iframe_notify_all",
        channel: channel,
        data: data,
    }, '*');
}
/**
 * 等待 \`channel\` 消息频道发送来消息, 并接收该条消息携带的数据
 *
 * @param channel 要等待的消息频道名称
 * @returns 从消息频道发送来的数据
 *
 * @example
 * // 开始等待 "频道名称" 消息频道有消息传来, 直到等到消息才继续执行
 * const result = await wait("频道名称");
 *
 * @example
 * // 开始等待 "频道名称" 消息频道有消息传来
 * const promise = wait("频道名称");
 * // 等待期间做些别的事
 * other_work();
 * // 事情做完了, 看看消息等到了吗
 * const result = await promise;
 *
 * @example
 * // 消息要求我们调用某个函数
 * const result = await wait("频道名称");
 * const function = window[result[0]];  // 返回的第一个数据是函数名, 我们查找该函数
 * function(...result.slice(1));  // 用剩下的数据作为函数的参数
 */
async function wait(channel) {
    return new Promise((resolve, _) => {
        function handleMessage(event) {
            if (event.data?.request === "iframe_notify_callback" && event.data.channel == channel) {
                window.removeEventListener("message", handleMessage);
                console.info(\`[Chat Message][wait](\${getIframeName()}) 接收到 \${channel} 消息频道发送来的消息: \${JSON.stringify(event.data.data)}\`);
                resolve(event.data.data);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: 'iframe_wait',
            channel: channel,
        }, '*');
    });
}
`