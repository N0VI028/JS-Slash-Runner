import { chat, chat_metadata, event_types, eventSource } from '../../../../../../script.js';
import { extension_settings } from '../../../../../extensions.js';
function get_property_from_path(object, path, default_value) {
    let result = object;
    for (const key of path.split('.')) {
        if (result === undefined) {
            return default_value;
        }
        result = result[key];
    }
    ;
    return result ?? default_value;
}
function demacro(event_data) {
    if (event_data.dryRun) {
        return;
    }
    const map = {
        get_global_variable: extension_settings.variables.global,
        get_chat_variable: chat_metadata.variables,
        get_message_variable: chat.filter(chat => chat.variables !== undefined).map(chat => chat.variables[chat.swipe_id ?? 0]).at(-1) ?? {},
    };
    event_data.chat.forEach(chat => {
        chat.content = chat.content.replaceAll(/\{\{(get_global_variable|get_chat_variable|get_message_variable)::(.*?)\}\}/g, (_substring, type, path) => {
            return JSON.stringify(get_property_from_path(map[type], path, null));
        });
    });
}
export function initializeMacroOnExtension() {
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}
export function destroyMacroOnExtension() {
    eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}
//# sourceMappingURL=macro.js.map