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

export const iframe_handlers: IframeHandlers = {};

export function registerIframeHandler<T extends IframeMessage>(
  request: string,
  handler: (event: MessageEvent<T>) => Promise<any | void>,
) {
  iframe_handlers[request] = handler;
}
