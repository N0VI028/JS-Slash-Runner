import {
  chat_metadata,
  event_types,
} from "../../../../../../script.js";
import {
  getContext,
  saveMetadataDebounced,
} from "../../../../../extensions.js";
import { getLogPrefix, IframeMessage, registerIframeHandler } from "./index.js";

// for compatibility
interface IframeSetVariables extends IframeMessage {
  request: "[Variables][setVariables]";
  message_id: number;
  variables: Record<string, any>;
}

let latest_set_variables_message_id: number | null = null;

export function registerIframeVariableHandler() {
  registerIframeHandler(
    "[Variables][setVariables]",
    async (event: MessageEvent<IframeSetVariables>): Promise<void> => {
      const variables = event.data.variables;
      const message_id = event.data.message_id;

      if (isNaN(message_id)) {
        return;
      }
      const chat_length = getContext().chat.length;
      const latest_message_id = chat_length - 1;

      if (message_id !== latest_message_id) {
        console.info(
          `因为 ${message_id} 楼不是最新楼层 ${latest_message_id} 楼, 取消设置聊天变量. 原本要设置的变量:\n${JSON.stringify(
            variables,
            undefined,
            2
          )} `
        );
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

      console.info(
        `${getLogPrefix(event)}设置聊天变量, 要设置的变量:\n${JSON.stringify(
          variables,
          undefined,
          2
        )} `
      );
    }
  );
}

export function clearTempVariables() {
  if (
    chat_metadata.variables &&
    chat_metadata.variables.tempVariables &&
    Object.keys(chat_metadata.variables.tempVariables).length > 0
  ) {
    console.log("[Var]Clearing tempVariables.");
    chat_metadata.variables.tempVariables = {};
    saveMetadataDebounced();
  }
}

export function shouldUpdateVariables(eventMesId: number) {
  if (
    !chat_metadata.variables ||
    !chat_metadata.variables.tempVariables ||
    Object.keys(chat_metadata.variables.tempVariables).length === 0
  ) {
    return;
  }
  if (eventMesId === latest_set_variables_message_id) {
    console.log(
      "[Var]MesId matches the latest setVariables, skipping ST variable update."
    );
    return;
  } else if (
    latest_set_variables_message_id !== null &&
    eventMesId > latest_set_variables_message_id
  ) {
    console.log(
      "[Var]Event mesId is newer than setVariables mesId, updating ST variables."
    );
    const newVariables = { ...chat_metadata.variables.tempVariables };
    updateVariables(newVariables);

    chat_metadata.variables.tempVariables = {};
    console.log("[Var]TempVariables cleared.");
  } else {
    console.log("[Var]Event mesId is older than setVariables mesId, ignoring.");
  }
}

function updateVariables(newVariables: Record<string, any>) {
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
