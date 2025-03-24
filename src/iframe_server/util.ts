import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/index';

import { substituteParamsExtended } from '@sillytavern/script';

interface IframeSubstitudeMacros extends IframeMessage {
  request: '[Utils][substitudeMacros]';
  text: string;
}

export function registerIframeUtilHandler() {
  registerIframeHandler(
    '[Utils][substitudeMacros]',
    async (event: MessageEvent<IframeSubstitudeMacros>): Promise<string> => {
      const text = event.data.text;

      const text_demacroed = substituteParamsExtended(text);

      console.info(`${getLogPrefix(event)}替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
      return text_demacroed;
    },
  );
}
