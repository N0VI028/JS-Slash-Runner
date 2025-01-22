import { registerIframeChatMessageHandler } from "./chat_message.js";
import { registerIframeDisplayedMessageHandler } from "./displayed_message.js";
import { registerIframeEventHandler } from "./event.js";
import { registerIframeGenerateHandler } from "./generate.js";
import { registerIframeLorebookHandler } from "./lorebook.js";
import { registerIframeLorebookEntryHandler } from "./lorebook_entry.js";
import { registerIframeRegexDataHandler } from "./regex_data.js";
import { registerIframeSlashHandler } from "./slash.js";
import { registerIframeUtilHandler } from "./util.js";
import { registerIframeVariableHandler } from "./variables.js";

export interface IframeMessage {
  request: string;
  uid: number;
}

export function getIframeName<T extends IframeMessage>(event: MessageEvent<T>): string {
  const window = event.source as Window;
  return window.frameElement?.id as string;
}

type IframeHandlers = {
  [request: string]: (event: MessageEvent<any>) => Promise<any | void>;
};

const iframe_handlers: IframeHandlers = {};

export function registerIframeHandler<T extends IframeMessage>(request: string, handler: (event: MessageEvent<T>) => Promise<any | void>) {
  iframe_handlers[request] = handler;
}

export async function handleIframe(event: MessageEvent<IframeMessage>): Promise<void> {
  if (!event.data) return;

  let result: any = undefined;
  try {
    const handler = iframe_handlers[event.data.request];
    if (handler) {
      result = await handler(event);
    }
  } catch (error) {
    console.error(`${error}`);
  } finally {
    (event.source as MessageEventSource).postMessage(
      {
        request: event.data.request + "_callback",
        uid: event.data.uid,
        result: result,
      },
      {
        targetOrigin: "*",
      }
    );
  }
}

registerIframeChatMessageHandler();
registerIframeDisplayedMessageHandler();
registerIframeGenerateHandler();
registerIframeEventHandler();
registerIframeLorebookEntryHandler();
registerIframeLorebookHandler();
registerIframeRegexDataHandler();
registerIframeSlashHandler();
registerIframeUtilHandler();
registerIframeVariableHandler();
