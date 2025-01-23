import { getLogPrefix, registerIframeHandler } from "./index.js";
import { substituteParamsExtended } from "../../../../../../script.js";
export function registerIframeUtilHandler() {
    registerIframeHandler('[Utils][substitudeMacros]', async (event) => {
        const text = event.data.text;
        const text_demacroed = substituteParamsExtended(text);
        console.info(`${getLogPrefix(event)}替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
        return text_demacroed;
    });
}
//# sourceMappingURL=util.js.map