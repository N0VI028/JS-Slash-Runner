import { getLogPrefix, registerIframeHandler } from "./index.js";
import { chat, messageFormatting } from "../../../../../../script.js";
import { getLastMessageId } from "../../../../../macros.js";
export function registerIframeDisplayedMessageHandler() {
    registerIframeHandler('[DisplayedMessage][formatAsDisplayedMessage]', async (event) => {
        const text = event.data.text;
        const option = event.data.option;
        if (typeof option.message_id !== 'number' && !['last', 'last_user', 'last_char'].includes(option.message_id)) {
            throw Error(`${getLogPrefix(event)}提供的 message_id 无效, 请提供 'last', 'last_user', 'last_char' 或楼层消息号, 你提供的是: ${option.message_id}`);
        }
        const last_message_id = getLastMessageId();
        if (last_message_id === null) {
            throw Error(`${getLogPrefix(event)}未找到任何消息楼层, 你提供的是: ${option.message_id}`);
        }
        switch (option.message_id) {
            case 'last':
                option.message_id = last_message_id;
                break;
            case 'last_user':
                const last_user_message_id = getLastMessageId({ filter: (m) => m.is_user && !m.is_system });
                if (last_user_message_id === null) {
                    throw Error(`${getLogPrefix(event)}未找到任何 user 消息楼层, 你提供的是: ${option.message_id}`);
                }
                option.message_id = last_user_message_id;
                break;
            case 'last_char':
                const last_char_message_id = getLastMessageId({ filter: (m) => !m.is_user && !m.is_system });
                if (last_char_message_id === null) {
                    throw Error(`${getLogPrefix(event)}未找到任何 char 消息楼层, 你提供的是: ${option.message_id}`);
                }
                option.message_id = last_char_message_id;
                break;
        }
        if (option.message_id < 0 || option.message_id > last_message_id) {
            throw Error(`${getLogPrefix(event)}提供的 message_id 不在 [0, ${last_message_id}] 内, 你提供的是: ${option.message_id} `);
        }
        const chat_message = chat[option.message_id];
        const result = messageFormatting(text, chat_message.name, chat_message.is_system, chat_message.is_user, option.message_id);
        console.info(`${getLogPrefix(event)}将字符串处理为酒馆用于显示的 html 格式, 字符串: '${text}', 选项: '${JSON.stringify(option)}', 结果: '${result}'`);
        return result;
    });
}
//# sourceMappingURL=displayed_message.js.map