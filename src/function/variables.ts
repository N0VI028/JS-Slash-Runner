import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import { ScriptManager } from '@/component/script_repository/script_controller';
import { getChatMessages, setChatMessages } from '@/function/chat_message';
import { _getCurrentMessageId, _getIframeName, _getScriptId } from '@/function/util';

import {
  characters,
  chat,
  chat_metadata,
  eventSource,
  saveMetadata,
  saveSettings,
  this_chid,
} from '@sillytavern/script';
import { extension_settings, writeExtensionField } from '@sillytavern/scripts/extensions';

import log from 'loglevel';

type VariableOption = {
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';
  message_id?: number | 'latest';
  script_id?: string;
};

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
    case 'script': {
      if (!script_id) {
        throw Error('获取脚本变量失败, 未指定 script_id');
      }
      const script_manager = ScriptManager.getInstance();
      const script = script_manager.getScriptById(script_id);
      if (!script) {
        throw Error(`获取脚本变量失败, '${script_id}' 脚本不存在`);
      }
      return script_manager.getScriptVariables(script_id);
    }
  }
}

export function getVariables({ type = 'chat', message_id = 'latest', script_id }: VariableOption = {}): Record<
  string,
  any
> {
  const result = getVariablesByType({ type, message_id, script_id });

  log.info(
    `获取${
      {
        message: `'${message_id}' 消息`,
        chat: '聊天',
        character: '角色',
        script: `'${script_id}' 脚本`,
        global: '全局',
      }[type]
    }变量表`,
  );
  return structuredClone(result);
}

export function _getAllVariables(this: Window): Record<string, any> {
  const is_message_iframe = _getIframeName.call(this).startsWith('message-iframe');

  let result = _({});
  result = result.assign(
    extension_settings.variables.global,
    // @ts-expect-error
    characters[this_chid]?.data?.extensions?.TavernHelper_characterScriptVariables,
  );
  if (!is_message_iframe) {
    result = result.assign(getVariables({ type: 'script', script_id: _getScriptId.call(this) }));
  }
  result = result.assign((chat_metadata as { variables: Record<string, any> | undefined }).variables);
  if (is_message_iframe) {
    result = result.assign(
      ...chat
        .slice(0, _getCurrentMessageId.call(this) + 1)
        .map((chat_message: any) => chat_message?.variables?.[chat_message?.swipe_id ?? 0]),
    );
  }
  return structuredClone(result.value());
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
      if (this_chid === undefined) {
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
          throw Error(`保存变量失败, '${script_id}' 脚本不存在`);
        }
        script.data = variables;
        const script_type = script_manager['scriptData'].getScriptType(script);
        scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
          action: 'script_update',
          script,
          type: script_type,
        });
        await script_manager.updateScriptVariables(script_id, variables, script_type);
      }
      break;
  }

  log.info(
    `替换${
      {
        message: `'${message_id}' 消息`,
        chat: '聊天',
        character: '角色',
        script: `'${script_id}' 脚本`,
        global: '全局',
      }[type]
    }变量表`,
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
): Promise<Record<string, any>> {
  return await updateVariablesWith(
    old_variables => _.mergeWith(old_variables, variables, (_lhs, rhs) => (_.isArray(rhs) ? rhs : undefined)),
    { type, message_id, script_id },
  );
}

export async function insertVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<Record<string, any>> {
  return await updateVariablesWith(
    old_variables => _.mergeWith({}, variables, old_variables, (_lhs, rhs) => (_.isArray(rhs) ? rhs : undefined)),
    {
      type,
      message_id,
      script_id,
    },
  );
}

export async function deleteVariable(
  variable_path: string,
  { type = 'chat', message_id = 'latest', script_id }: VariableOption = {},
): Promise<{ variables: Record<string, any>; delete_occurred: boolean }> {
  let delete_occurred: boolean = false;
  const variables = await updateVariablesWith(
    old_variables => {
      delete_occurred = _.unset(old_variables, variable_path);
      return old_variables;
    },
    { type, message_id, script_id },
  );
  return { variables, delete_occurred };
}
