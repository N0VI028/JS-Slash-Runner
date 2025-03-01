import { chat_metadata, saveSettingsDebounced } from "../../../../../../script.js";
import { extension_settings, getContext, saveMetadataDebounced } from "../../../../../extensions.js";
import { getLogPrefix, registerIframeHandler } from "./index.js";
function getVariablesByType(type) {
    switch (type) {
        case 'chat':
            const metadata = chat_metadata;
            if (!metadata.variables) {
                metadata.variables = {};
            }
            return metadata.variables;
        case 'global':
            return extension_settings.variables.global;
    }
}
export let latest_set_variables_message_id = null;
export function registerIframeVariableHandler() {
    registerIframeHandler('[Variables][getVariables]', async (event) => {
        const option = event.data.option;
        const result = getVariablesByType(option.type);
        console.info(`${getLogPrefix(event)}获取${option.type == 'chat' ? `聊天` : `全局`}变量表:\n${JSON.stringify(result, undefined, 2)}`);
        return result;
    });
    registerIframeHandler('[Variables][replaceVariables]', async (event) => {
        const variables = event.data.variables;
        const option = event.data.option;
        switch (option.type) {
            case 'chat':
                chat_metadata.variables = variables;
                saveMetadataDebounced();
                break;
            case 'global':
                extension_settings.variables.global = variables;
                saveSettingsDebounced();
                break;
        }
        console.info(`${getLogPrefix(event)}将${option.type == 'chat' ? `聊天` : `全局`}变量表替换为:\n${JSON.stringify(variables, undefined, 2)}`);
    });
    registerIframeHandler('[Variables][setVariables]', async (event) => {
        const variables = event.data.variables;
        const message_id = event.data.message_id;
        if (isNaN(message_id)) {
            return;
        }
        const chat_length = getContext().chat.length;
        const latest_message_id = chat_length - 1;
        if (message_id !== latest_message_id) {
            throw Error(`因为 ${message_id} 楼不是最新楼层 ${latest_message_id} 楼, 取消设置聊天变量. 原本要设置的变量:\n${JSON.stringify(variables, undefined, 2)} `);
        }
        latest_set_variables_message_id = message_id;
        if (
        // @ts-ignore
        !chat_metadata.variables ||
            // @ts-ignore
            typeof chat_metadata.variables !== "object") {
            // @ts-ignore
            chat_metadata.variables = {};
        }
        if (
        // @ts-ignore
        !chat_metadata.variables.tempVariables ||
            // @ts-ignore
            typeof chat_metadata.variables.tempVariables !== "object") {
            // @ts-ignore
            chat_metadata.variables.tempVariables = {};
        }
        if (variables.hasOwnProperty("tempVariables")) {
            // @ts-ignore
            delete variables.tempVariables;
        }
        // @ts-ignore
        const tempVariables = chat_metadata.variables.tempVariables;
        // @ts-ignore
        const currentVariables = chat_metadata.variables;
        Object.keys(variables).forEach((key) => {
            // @ts-ignore
            const newValue = variables[key];
            const currentValue = currentVariables[key];
            if (newValue !== currentValue) {
                tempVariables[key] = newValue;
            }
        });
        // @ts-ignore
        chat_metadata.variables.tempVariables = tempVariables;
        saveMetadataDebounced();
        console.info(`${getLogPrefix(event)}设置聊天变量, 要设置的变量:\n${JSON.stringify(variables, undefined, 2)} `);
    });
}
//# sourceMappingURL=variables.js.map