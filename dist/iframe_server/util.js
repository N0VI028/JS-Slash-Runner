import { getIframeName, registerIframeHandler } from "./index.js";
import { substituteParamsExtended } from "../../../../../../script.js";
export function registerIframeUtilHandler() {
    registerIframeHandler('iframe_substitude_macros', async (event) => {
        const iframe_name = getIframeName(event);
        const text = event.data.text;
        const text_demacroed = substituteParamsExtended(text);
        console.info(`[DisplayedMessage][substitudeMacros](${iframe_name}) 替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
        return text_demacroed;
    });
}
//# sourceMappingURL=util.js.map