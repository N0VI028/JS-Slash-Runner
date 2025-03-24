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
import { IframeMessage, getLogPrefix, iframe_handlers } from '@/iframe_server/_impl';

import { t } from '@sillytavern/scripts/i18n';

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
