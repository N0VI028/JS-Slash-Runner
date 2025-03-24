import { registerIframeAudioHandler } from '@/iframe_server/audio';
import { registerIframeCharacterHandler } from '@/iframe_server/character';
import { registerIframeChatMessageHandler } from '@/iframe_server/chat_message';
import { registerIframeDisplayedMessageHandler } from '@/iframe_server/displayed_message';
import { registerIframeFrontendVersionHandler } from '@/iframe_server/frontend_version';
import { registerIframeGenerateHandler } from '@/iframe_server/generate';
import { registerIframeLorebookHandler } from '@/iframe_server/lorebook';
import { registerIframeLorebookEntryHandler } from '@/iframe_server/lorebook_entry';
import { registerIframeSlashHandler } from '@/iframe_server/slash';
import { registerIframeTavernRegexHandler } from '@/iframe_server/tavern_regex';
import { registerIframeUtilHandler } from '@/iframe_server/util';
import { registerIframeVariableHandler } from '@/iframe_server/variables';

import { t } from '@sillytavern/scripts/i18n';

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
registerIframeAudioHandler();
