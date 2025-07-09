import { IframeMessage, getLogPrefix, iframe_handlers } from '@/iframe_server/_impl';
import { registerIframeVariableHandler } from '@/iframe_server/variables';

import log from 'loglevel';

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
    toastr.error(`${getLogPrefix(event)}${error.name + ': ' + error.message}${error.stack ? error.stack : ''}`);
    log.error(getLogPrefix(event), error);
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

registerIframeVariableHandler();
