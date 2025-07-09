import { ScriptManager } from '@/component/script_repository/script_controller';
import { getChatMessages, setChatMessages } from '@/function/chat_message';

import {
  characters,
  chat,
  chat_metadata,
  eventSource,
  saveMetadata,
  saveSettings,
  this_chid,
} from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

import log from 'loglevel';

interface VariableOption {
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';
  message_id?: number | 'latest';
  script_id?: string;
}

function getVariablesByType({ type = 'chat', message_id = 'latest', script_id }: VariableOption): Record<string, any> {
  switch (type) {
    case 'message': {
      if (message_id !== 'latest' && (message_id < -chat.length || message_id >= chat.length)) {
        throw Error(`提供的 message_id(${message_id}) 超出了聊天消息楼层号范围`);
      }
      message_id = message_id === 'latest' ? -1 : message_id;
      return getChatMessages(message_id)[0].data;
    }
    case 'chat': {
      const metadata = chat_metadata as {
        variables: Record<string, any> | undefined;
      };
      if (!metadata.variables) {
        metadata.variables = {};
      }
      return metadata.variables;
    }
    case 'character': {
      //@ts-ignore
      return characters[this_chid]?.data?.extensions?.TavernHelper_characterScriptVariables || {};
    }
    case 'global':
      return extension_settings.variables.global;
    case 'script':
      if (!script_id) {
        throw Error('获取脚本变量失败, 未指定 script_id');
      }
      return ScriptManager.getInstance().getScriptVariables(script_id);
  }
}

export function getVariables({ type = 'chat', message_id = 'latest', script_id }: VariableOption = {}): Record<
  string,
  any
> {
  const result = getVariablesByType({ type, message_id, script_id });

  log.info(
    `获取${
      type === 'message'
        ? `'${message_id}' 消息`
        : type === 'chat'
        ? '聊天'
        : type === 'character'
        ? '角色'
        : type === 'script'
        ? `'${script_id}' 脚本`
        : '全局'
    }变量表:\n${JSON.stringify(result)}`,
  );
  return structuredClone(result);
}

export async function replaceVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<void> {
  switch (type) {
    case 'message':
      if (message_id !== 'latest' && (message_id < -chat.length || message_id >= chat.length)) {
        throw Error(`提供的 message_id(${message_id}) 超出了聊天消息楼层号范围`);
      }
      message_id = message_id === 'latest' ? chat.length - 1 : message_id < 0 ? chat.length + message_id : message_id;
      await setChatMessages([{ message_id, data: variables }], { refresh: 'none' });
      break;
    case 'chat':
      _.set(chat_metadata, 'variables', variables);
      await saveMetadata();
      break;
    case 'character':
      if (!this_chid) {
        throw new Error('保存变量失败，当前角色为空');
      }
      //@ts-ignore
      await writeExtensionField(this_chid, 'TavernHelper_characterScriptVariables', variables);
      eventSource.emit('character_variables_changed', { variables });
      break;
    case 'global':
      _.set(extension_settings.variables, 'global', variables);
      await saveSettings();
      break;
    case 'script':
      if (!script_id) {
        throw Error('保存变量失败, 未指定 script_id');
      }
      {
        const script_manager = ScriptManager.getInstance();
        const script = script_manager.getScriptById(script_id);
        if (!script) {
          throw Error(`'${script_id}' 脚本不存在`);
        }
        const script_type = script_manager['scriptData'].getScriptType(script);
        await script_manager.updateScriptVariables(script_id, variables, script_type);
      }
      break;
  }

  log.info(
    `将${
      type === 'message'
        ? `'${message_id}' 消息`
        : type === 'chat'
        ? '聊天'
        : type === 'character'
        ? '角色'
        : type === 'script'
        ? `'${script_id}' 脚本`
        : '全局'
    }变量表替换为:\n${JSON.stringify(variables)}`,
  );
}

type VariablesUpdater =
  | ((variables: Record<string, any>) => Record<string, any>)
  | ((variables: Record<string, any>) => Promise<Record<string, any>>);

export async function updateVariablesWith(
  updater: VariablesUpdater,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<Record<string, any>> {
  let variables = getVariables({ type, message_id, script_id });
  variables = await updater(variables);
  log.info(
    `对${
      type === 'message'
        ? `'${message_id}' 消息`
        : type === 'chat'
        ? '聊天'
        : type === 'character'
        ? '角色'
        : type === 'script'
        ? `'${script_id}' 脚本`
        : '全局'
    }变量表进行更新`,
  );
  await replaceVariables(variables, { type, message_id, script_id });
  return variables;
}

export async function insertOrAssignVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<void> {
  await updateVariablesWith(old_variables => _.merge(old_variables, variables), { type, message_id, script_id });
}

export async function insertVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<void> {
  await updateVariablesWith(old_variables => _.defaultsDeep(old_variables, variables), { type, message_id, script_id });
}

export async function deleteVariable(
  variable_path: string,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<boolean> {
  let result: boolean = false;
  await updateVariablesWith(
    old_variables => {
      result = _.unset(old_variables, variable_path);
      return old_variables;
    },
    { type, message_id, script_id },
  );
  return result;
}
