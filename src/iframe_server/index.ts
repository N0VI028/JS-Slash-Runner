import { t } from '../../../../../i18n.js';
import { registerIframeChatMessageHandler } from './chat_message.js';
import { registerIframeDisplayedMessageHandler } from './displayed_message.js';
import { registerIframeFrontendVersionHandler } from './frontend_version.js';
import { registerIframeGenerateHandler } from './generate.js';
import { registerIframeLorebookHandler } from './lorebook.js';
import { registerIframeLorebookEntryHandler } from './lorebook_entry.js';
import { registerIframeSlashHandler } from './slash.js';
import { registerIframeTavernRegexHandler } from './tavern_regex.js';
import { registerIframeUtilHandler } from './util.js';
import { registerIframeVariableHandler } from './variables.js';
import { registerIframeCharacterHandler } from './character.js';

export interface IframeMessage {
  request: string;
  uid: number;
}

export function getIframeName<T extends IframeMessage>(event: MessageEvent<T>): string {
  const window = event.source as Window;
  return window.frameElement?.id as string;
}

export function getLogPrefix<T extends IframeMessage>(event: MessageEvent<T>): string {
  return `${event.data.request}(${getIframeName(event)}) `;
}

type IframeHandlers = {
  [request: string]: (event: MessageEvent<any>) => Promise<any | void>;
};

const iframe_handlers: IframeHandlers = {};

export function registerIframeHandler<T extends IframeMessage>(
  request: string,
  handler: (event: MessageEvent<T>) => Promise<any | void>,
) {
  iframe_handlers[request] = handler;
}

export async function handleIframe(event: MessageEvent<IframeMessage>): Promise<void> {
  if (!event.data) return;

  const handler = iframe_handlers[event.data.request];
  if (!handler) {
    return;
  }

  let result: any = undefined;
  try {
    result = await handler(event);
  } catch (err) {
    const error = err as Error;
    // @ts-expect-error
    toastr.error(t`${getLogPrefix(event)}${error.name + ': ' + error.message}${error.stack ? error.stack : ''}`);
    console.error(getLogPrefix(event), error);
  } finally {
    (event.source as MessageEventSource).postMessage(
      {
        request: event.data.request + '_callback',
        uid: event.data.uid,
        result: result,
      },
      {
        targetOrigin: '*',
      },
    );
  }
}

registerIframeChatMessageHandler();
registerIframeDisplayedMessageHandler();
registerIframeFrontendVersionHandler();
registerIframeGenerateHandler();
registerIframeLorebookEntryHandler();
registerIframeLorebookHandler();
registerIframeSlashHandler();
registerIframeTavernRegexHandler();
registerIframeUtilHandler();
registerIframeVariableHandler();
registerIframeCharacterHandler();