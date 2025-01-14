import { chat_metadata, saveSettingsDebounced } from "../../../../../../script.js";
import { extension_settings, getContext, saveMetadataDebounced } from "../../../../../extensions.js";

export { handleVariables, latest_set_variables_message_id }

interface IframeGetVariables {
  request: 'iframe_get_variables';
  uid: number;
  option: Required<VariableOption>;
}

interface IframeReplaceVariables {
  request: 'iframe_replace_variables';
  option: Required<VariableOption>;
  variables: JsonObject;
}

// for compatibility
interface IframeSetVariables {
  request: 'iframe_set_variables';
  message_id: number;
  variables: JsonObject;
}

type IframeVariablesMessage = IframeGetVariables | IframeReplaceVariables | IframeSetVariables;

// TODO: don't repeat this in all files
function getIframeName(event: MessageEvent<IframeVariablesMessage>): string {
  const window = event.source as Window;
  return window.frameElement?.id as string;
}

function getVariablesByType(type: 'chat' | 'global'): JsonObject {
  switch (type) {
    case 'chat':
      const metadata = chat_metadata as { variables: JsonObject | undefined }
      if (!metadata.variables) {
        metadata.variables = {};
      }
      return metadata.variables;
    case 'global':
      return extension_settings.variables.global;
  }
}

let latest_set_variables_message_id = null;
const event_handlers = {
  iframe_get_variables: async (event: MessageEvent<IframeGetVariables>): Promise<void> => {
    const iframe_name = getIframeName(event);
    const uid = event.data.uid;
    const option = event.data.option;

    const result = getVariablesByType(option.type);

    (event.source as MessageEventSource).postMessage({
      request: 'iframe_get_variables_callback',
      uid: uid,
      result: result,
    },
      { targetOrigin: "*" }
    );
    console.info(`[Chat Message][getVariables](${iframe_name}) 获取${option.type == 'chat' ? `聊天` : `全局`}变量表: ${JSON.stringify(result)}`);
  },

  iframe_replace_variables: async (event: MessageEvent<IframeReplaceVariables>): Promise<void> => {
    const iframe_name = getIframeName(event);
    const variables = event.data.variables;
    const option = event.data.option;

    switch (option.type) {
      case 'chat':
        (chat_metadata as { variables: Object }).variables = variables;
        saveMetadataDebounced();
        break;
      case 'global':
        extension_settings.variables.global = variables;
        saveSettingsDebounced();
        break;
    }

    console.info(`[Chat Message][replaceVariables](${iframe_name}) 将${option.type == 'chat' ? `聊天` : `全局`}变量表替换为: ${JSON.stringify(variables)}`);
  },

  iframe_set_variables: async (event: MessageEvent<IframeSetVariables>): Promise<void> => {
    const iframe_name = getIframeName(event);

    const variables = event.data.variables;
    const message_id = event.data.message_id;

    if (isNaN(message_id)) {
      return;
    }
    const chat_length = getContext().chat.length;
    const latest_message_id = chat_length - 1;

    if (message_id !== latest_message_id) {
      console.info(`[Chat Message][setVariables](${iframe_name}) 因为 ${message_id} 楼不是最新楼层 ${latest_message_id} 楼, 取消设置聊天变量. 原本要设置的变量: ${JSON.stringify(variables)} `);
      return;
    }
    latest_set_variables_message_id = message_id;
    if (
      // @ts-ignore
      !chat_metadata.variables ||
      // @ts-ignore
      typeof chat_metadata.variables !== "object"
    ) {
      // @ts-ignore
      chat_metadata.variables = {};
    }
    if (
      // @ts-ignore
      !chat_metadata.variables.tempVariables ||
      // @ts-ignore
      typeof chat_metadata.variables.tempVariables !== "object"
    ) {
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

    console.info(`[Chat Message][setVariables](${iframe_name}) 设置聊天变量, 要设置的变量: ${JSON.stringify(variables)} `);
  },
};

async function handleVariables(event: MessageEvent<IframeVariablesMessage>): Promise<void> {
  if (!event.data) return;

  try {
    const handler = event_handlers[event.data.request];
    if (handler) {
      handler(event as any);
    }
  } catch (error) {
    console.error(`${error} `);
    throw error;
  }
}
