import { registerIframeChatMessageHandler } from "./chat_message.js";
import { registerIframeEventHandler } from "./event.js";
import { registerIframeLorebookHandler } from "./lorebook.js";
import { registerIframeLorebookEntryHandler } from "./lorebook_entry.js";
import { registerIframeRegexDataHandler } from "./regex_data.js";
import { registerIframeSlashHandler } from "./slash.js";
import { registerIframeVariableHandler } from "./variables.js";
export function getIframeName(event) {
    const window = event.source;
    return window.frameElement?.id;
}
const iframe_handlers = {};
export function registerIframeHandler(request, handler) {
    iframe_handlers[request] = handler;
}
export async function handleIframe(event) {
    if (!event.data)
        return;
    let result = undefined;
    try {
        const handler = iframe_handlers[event.data.request];
        if (handler) {
            result = await handler(event);
        }
    }
    catch (error) {
        console.error(`${error}`);
        throw error;
    }
    finally {
        event.source.postMessage({
            request: event.data.request + "_callback",
            uid: event.data.uid,
            result: result,
        }, {
            targetOrigin: "*",
        });
    }
}
registerIframeChatMessageHandler();
registerIframeEventHandler();
registerIframeLorebookEntryHandler();
registerIframeLorebookHandler();
registerIframeRegexDataHandler();
registerIframeSlashHandler();
registerIframeVariableHandler();
//# sourceMappingURL=index.js.map