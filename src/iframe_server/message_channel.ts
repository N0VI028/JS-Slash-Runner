export { handleMessageChannel, message_manager }

import { ArrayMultimap } from "../util/multimap.js";

interface IframeNotifyAllMessage {
  request: 'iframe_notify_all';
  channel: string;
  data: any[];
}

interface IframeWaitMessage {
  request: 'iframe_wait';
  channel: string;
}

type IframeMessageChannelMessage = IframeNotifyAllMessage | IframeWaitMessage;

// TODO: don't repeat this in all files
function getIframeName(event: MessageEvent<IframeMessageChannelMessage>): string {
  const window = event.source as Window;
  return window.frameElement?.id as string;
}

class MessageManager {
  private channels: ArrayMultimap<string, MessageEventSource> = new ArrayMultimap();

  public async notifyAll(channel: string, ...data: any[]): Promise<void> {
    const promises = this.channels
      .get(channel)
      .map(async (source) => {
        source.postMessage({
          request: "iframe_notify_callback",
          channel: channel,
          data: data
        },
          { targetOrigin: "*" }
        );
      });
    this.channels.delete(channel);
    await Promise.all(promises);
  }

  public wait(channel: string, source: MessageEventSource): void {
    this.channels.put(channel, source);
  }
}

let message_manager = new MessageManager();

const event_handlers = {
  iframe_notify_all: async (event: MessageEvent<IframeNotifyAllMessage>): Promise<void> => {
    const iframe_name = getIframeName(event);
    const channel = event.data.channel;
    const data = event.data.data;

    await message_manager.notifyAll(channel, ...data);

    console.info(`[Chat Message][notifyAll](${iframe_name}) 向 ${channel} 消息频道发送消息: ${JSON.stringify(data)}`);
  },

  iframe_wait: async (event: MessageEvent<IframeWaitMessage>): Promise<void> => {
    const iframe_name = getIframeName(event);
    const channel = event.data.channel;

    message_manager.wait(channel, event.source as MessageEventSource);

    console.info(`[Chat Message][wait](${iframe_name}) 开始等待 ${channel} 频道发送回消息`);
  },
};

async function handleMessageChannel(event: MessageEvent<IframeMessageChannelMessage>): Promise<void> {
  if (!event.data) return;

  try {
    const handler = event_handlers[event.data.request];
    if (handler) {
      handler(event as any);
    }
  } catch (error) {
    console.error(`[Tavern Event](${getIframeName(event)}) 与酒馆事件交互时出错:`, error);
    throw error;
  }
}
