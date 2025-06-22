import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/_impl';

import { ScriptManager } from '@/component/script_repository/script_controller';
import { chat_metadata, event_types } from '@sillytavern/script';
import { getContext, saveMetadataDebounced } from '@sillytavern/scripts/extensions';

interface IframeSetVariables extends IframeMessage {
  request: '[Variables][setVariables]';
  message_id: number;
  variables: Record<string, any>;
}

interface IframeGetScriptVariables extends IframeMessage {
  request: '[Variables][getScriptVariables]';
  script_id: string;
}

interface IframeReplaceScriptVariables extends IframeMessage {
  request: '[Variables][replaceScriptVariables]';
  script_id: string;
  variables: Record<string, any>;
}

interface IframeDeleteScriptVariable extends IframeMessage {
  request: '[Variables][deleteScriptVariable]';
  script_id: string;
  variable_path: string;
}

let latest_set_variables_message_id: number | null = null;

export function registerIframeVariableHandler() {
  registerIframeHandler('[Variables][setVariables]', async (event: MessageEvent<IframeSetVariables>): Promise<void> => {
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
          2,
        )} `,
      );
      return;
    }
    latest_set_variables_message_id = message_id;
    if (
      // @ts-ignore
      !chat_metadata.variables ||
      // @ts-ignore
      typeof chat_metadata.variables !== 'object'
    ) {
      // @ts-ignore
      chat_metadata.variables = {};
    }
    if (
      // @ts-ignore
      !chat_metadata.variables.tempVariables ||
      // @ts-ignore
      typeof chat_metadata.variables.tempVariables !== 'object'
    ) {
      // @ts-ignore
      chat_metadata.variables.tempVariables = {};
    }
    if (_.has(variables, 'tempVariables')) {
      // @ts-ignore
      delete variables.tempVariables;
    }
    // @ts-ignore
    const tempVariables = chat_metadata.variables.tempVariables;
    // @ts-ignore
    const currentVariables = chat_metadata.variables;
    Object.keys(variables).forEach(key => {
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

  registerIframeHandler(
    '[Variables][getScriptVariables]',
    async (event: MessageEvent<IframeGetScriptVariables>): Promise<Record<string, any>> => {
      const script_id = event.data.script_id;
      const script_variables = ScriptManager.getInstance().getScriptVariables(script_id);
      console.info(
        `${getLogPrefix(event)}获取脚本变量, 获取到的变量:\n${JSON.stringify(script_variables, undefined, 2)} `,
      );
      return script_variables;
    },
  );

  registerIframeHandler(
    '[Variables][replaceScriptVariables]',
    async (event: MessageEvent<IframeReplaceScriptVariables>): Promise<void> => {
      const script_id = event.data.script_id;
      const variables = event.data.variables;

      const scriptManager = ScriptManager.getInstance();
      const script = scriptManager.getScriptById(script_id);

      if (!script) {
        console.warn(`${getLogPrefix(event)}脚本不存在: ${script_id}`);
        return;
      }

      const scriptData = scriptManager['scriptData'];
      const scriptType = scriptData.getScriptType(script);

      const success = await scriptManager.updateScriptVariables(script_id, variables, scriptType);

      if (success) {
        console.info(
          `${getLogPrefix(event)}替换脚本变量成功, 脚本: ${script.name}, 变量:\n${JSON.stringify(
            variables,
            undefined,
            2,
          )}`,
        );
      } else {
        console.error(`${getLogPrefix(event)}替换脚本变量失败`);
      }
    },
  );

  registerIframeHandler(
    '[Variables][deleteScriptVariable]',
    async (event: MessageEvent<IframeDeleteScriptVariable>): Promise<boolean> => {
      const script_id = event.data.script_id;
      const variable_path = event.data.variable_path;

      const scriptManager = ScriptManager.getInstance();
      const script = scriptManager.getScriptById(script_id);

      if (!script) {
        console.warn(`${getLogPrefix(event)}脚本不存在: ${script_id}`);
        return false;
      }

      const variables = structuredClone(script.data || {});

      const result = _.unset(variables, variable_path);

      if (result) {
        const scriptData = scriptManager['scriptData'];
        const scriptType = scriptData.getScriptType(script);

        const success = await scriptManager.updateScriptVariables(script_id, variables, scriptType);

        if (success) {
          console.info(`${getLogPrefix(event)}删除脚本变量成功, 脚本: ${script.name}, 变量路径: ${variable_path}`);
          return true;
        } else {
          console.error(`${getLogPrefix(event)}删除脚本变量失败`);
          return false;
        }
      } else {
        console.warn(`${getLogPrefix(event)}变量路径不存在: ${variable_path}, 脚本: ${script.name}`);
        return false;
      }
    },
  );
}

export function clearTempVariables() {
  if (
    // @ts-ignore
    chat_metadata.variables &&
    // @ts-ignore
    chat_metadata.variables.tempVariables &&
    // @ts-ignore
    Object.keys(chat_metadata.variables.tempVariables).length > 0
  ) {
    console.log('[Var]Clearing tempVariables.');
    // @ts-ignore
    chat_metadata.variables.tempVariables = {};
    saveMetadataDebounced();
  }
}

export function shouldUpdateVariables(eventMesId: number) {
  if (
    // @ts-ignore
    !chat_metadata.variables ||
    // @ts-ignore
    !chat_metadata.variables.tempVariables ||
    // @ts-ignore
    Object.keys(chat_metadata.variables.tempVariables).length === 0
  ) {
    return;
  }
  if (eventMesId === latest_set_variables_message_id) {
    console.log('[Var]MesId matches the latest setVariables, skipping ST variable update.');
    return;
  } else if (latest_set_variables_message_id !== null && eventMesId > latest_set_variables_message_id) {
    console.log('[Var]Event mesId is newer than setVariables mesId, updating ST variables.');
    // @ts-ignore
    const newVariables = { ...chat_metadata.variables.tempVariables };
    updateVariables(newVariables);

    // @ts-ignore
    chat_metadata.variables.tempVariables = {};
    console.log('[Var]TempVariables cleared.');
  } else {
    console.log('[Var]Event mesId is older than setVariables mesId, ignoring.');
  }
}

function updateVariables(newVariables: Record<string, any>) {
  // @ts-ignore
  if (!chat_metadata.variables) {
    // @ts-ignore
    chat_metadata.variables = {};
  }

  // @ts-ignore
  const currentVariables = chat_metadata.variables;

  for (const key in newVariables) {
    if (_.has(newVariables, key)) {
      currentVariables[key] = newVariables[key];
    }
  }

  // @ts-ignore
  chat_metadata.variables = currentVariables;

  saveMetadataDebounced();
}

export const checkVariablesEvents = [event_types.CHARACTER_MESSAGE_RENDERED, event_types.USER_MESSAGE_RENDERED];
