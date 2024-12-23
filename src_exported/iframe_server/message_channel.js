export { handleMessageChannel, message_manager };
import { ArrayMultimap } from "../util/multimap.js";
// TODO: don't repeat this in all files
function getIframeName(event) {
    const window = event.source;
    return window.frameElement?.id;
}
class MessageManager {
    channels = new ArrayMultimap();
    async notifyAll(channel, ...data) {
        const promises = this.channels
            .get(channel)
            .map(async (source) => {
            source.postMessage({
                request: "iframe_notify_callback",
                channel: channel,
                data: data
            }, { targetOrigin: "*" });
        });
        this.channels.delete(channel);
        await Promise.all(promises);
    }
    wait(channel, source) {
        this.channels.put(channel, source);
    }
}
let message_manager = new MessageManager();
const event_handlers = {
    iframe_notify_all: async (event) => {
        const iframe_name = getIframeName(event);
        const channel = event.data.channel;
        const data = event.data.data;
        await message_manager.notifyAll(channel, ...data);
        console.info(`[Chat Message][notifyAll](${iframe_name}) 向 ${channel} 消息频道发送消息: ${JSON.stringify(data)}`);
    },
    iframe_wait: async (event) => {
        const iframe_name = getIframeName(event);
        const channel = event.data.channel;
        message_manager.wait(channel, event.source);
        console.info(`[Chat Message][wait](${iframe_name}) 开始等待 ${channel} 频道发送回消息`);
    },
};
async function handleMessageChannel(event) {
    if (!event.data)
        return;
    try {
        const handler = event_handlers[event.data.request];
        if (handler) {
            handler(event);
        }
    }
    catch (error) {
        console.error(`[Tavern Event](${getIframeName(event)}) 与酒馆事件交互时出错:`, error);
        throw error;
    }
}
//# sourceMappingURL=message_channel.js.map