import { getIframeName, IframeMessage, registerIframeHandler } from "./index.js";
import { substituteParamsExtended } from "../../../../../../script.js";

interface IframeSubstitudeMacros extends IframeMessage {
  request: '[Utils][substitudeMacros]';
  text: string;
}

export function registerIframeUtilHandler() {
  registerIframeHandler(
    '[Utils][substitudeMacros]',
    async (event: MessageEvent<IframeSubstitudeMacros>): Promise<string> => {
      const iframe_name = getIframeName(event);
      const text = event.data.text;

      const text_demacroed = substituteParamsExtended(text);

      console.info(`[Utils][substitudeMacros](${iframe_name}) 替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
      return text_demacroed;
    },
  );
}
