import { chat_metadata, saveSettingsDebounced, event_types, } from "../../../../../../script.js";
import { extension_settings, getContext, saveMetadataDebounced, } from "../../../../../extensions.js";
import { getLogPrefix, registerIframeHandler } from "./index.js";
function getVariablesByType(type) {
    switch (type) {
        case "chat":
            const metadata = chat_metadata;
            if (!metadata.variables) {
                metadata.variables = {};
            }
            return metadata.variables;
        case "global":
            return extension_settings.variables.global;
    }
}
let latest_set_variables_message_id = null;
export function registerIframeVariableHandler() {
    registerIframeHandler("[Variables][getVariables]", async (event) => {
        const option = event.data.option;
        const result = getVariablesByType(option.type);
        console.info(`${getLogPrefix(event)}获取${option.type == "chat" ? `聊天` : `全局`}变量表:\n${JSON.stringify(result, undefined, 2)}`);
        return result;
    });
    registerIframeHandler("[Variables][replaceVariables]", async (event) => {
        const variables = event.data.variables;
        const option = event.data.option;
        switch (option.type) {
            case "chat":
                chat_metadata.variables = variables;
                saveMetadataDebounced();
                break;
            case "global":
                extension_settings.variables.global = variables;
                saveSettingsDebounced();
                break;
        }
        console.info(`${getLogPrefix(event)}将${option.type == "chat" ? `聊天` : `全局`}变量表替换为:\n${JSON.stringify(variables, undefined, 2)}`);
    });
    registerIframeHandler("[Variables][setVariables]", async (event) => {
        const variables = event.data.variables;
        const message_id = event.data.message_id;
        if (isNaN(message_id)) {
            return;
        }
        const chat_length = getContext().chat.length;
        const latest_message_id = chat_length - 1;
        if (message_id !== latest_message_id) {
            console.info(`因为 ${message_id} 楼不是最新楼层 ${latest_message_id} 楼, 取消设置聊天变量. 原本要设置的变量:\n${JSON.stringify(variables, undefined, 2)} `);
            return;
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
export function clearTempVariables() {
    if (chat_metadata.variables &&
        chat_metadata.variables.tempVariables &&
        Object.keys(chat_metadata.variables.tempVariables).length > 0) {
        console.log("[Var]Clearing tempVariables.");
        chat_metadata.variables.tempVariables = {};
        saveMetadataDebounced();
    }
}
export function shouldUpdateVariables(eventMesId) {
    if (!chat_metadata.variables ||
        !chat_metadata.variables.tempVariables ||
        Object.keys(chat_metadata.variables.tempVariables).length === 0) {
        return;
    }
    if (eventMesId === latest_set_variables_message_id) {
        console.log("[Var]MesId matches the latest setVariables, skipping ST variable update.");
        return;
    }
    else if (latest_set_variables_message_id !== null &&
        eventMesId > latest_set_variables_message_id) {
        console.log("[Var]Event mesId is newer than setVariables mesId, updating ST variables.");
        const newVariables = { ...chat_metadata.variables.tempVariables };
        updateVariables(newVariables);
        chat_metadata.variables.tempVariables = {};
        console.log("[Var]TempVariables cleared.");
    }
    else {
        console.log("[Var]Event mesId is older than setVariables mesId, ignoring.");
    }
}
function updateVariables(newVariables) {
    if (!chat_metadata.variables) {
        chat_metadata.variables = {};
    }
    const currentVariables = chat_metadata.variables;
    for (let key in newVariables) {
        if (newVariables.hasOwnProperty(key)) {
            currentVariables[key] = newVariables[key];
        }
    }
    chat_metadata.variables = currentVariables;
    saveMetadataDebounced();
}
export const checkVariablesEvents = [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
];
//# sourceMappingURL=variables.js.map