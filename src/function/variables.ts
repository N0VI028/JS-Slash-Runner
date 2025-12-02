import { _getCurrentMessageId, _getIframeName, _getScriptId } from '@/function/util';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useCharacterSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { useVariableSchemasStore } from '@/store/variable_schemas';
import { saveChatConditionalDebounced } from '@/util/tavern';
import { chat, chat_metadata, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings, saveMetadataDebounced } from '@sillytavern/scripts/extensions';
import isPromise from 'is-promise';

export function registerVariableSchema(
  schema: z.ZodType<any>,
  { type }: { type: 'global' | 'preset' | 'character' | 'chat' | 'message' },
) {
  const store = useVariableSchemasStore();
  switch (type) {
    case 'global': {
      store.global = schema;
      break;
    }
    case 'preset': {
      store.preset = schema;
      break;
    }
    case 'character': {
      store.character = schema;
      break;
    }
    case 'chat': {
      store.chat = schema;
      break;
    }
    case 'message': {
      store.message = schema;
      break;
    }
  }
}

type VariableOptionNormal = {
  type: 'chat' | 'character' | 'preset' | 'global';
};
type VariableOptionMessage = {
  type: 'message';
  message_id?: number | 'latest';
};
type VariableOptionScript = {
  type: 'script';
  script_id?: string;
};
type VariableOptionExtension = {
  type: 'extension';
  extension_id: string;
};
type VariableOption = VariableOptionNormal | VariableOptionMessage | VariableOptionScript | VariableOptionExtension;

export function get_variables_without_clone(option: VariableOption): Record<string, any> {
  switch (option.type) {
    case 'message': {
      option.message_id = option.message_id === undefined || option.message_id === 'latest' ? -1 : option.message_id;
      if (!_.inRange(option.message_id, -chat.length, chat.length)) {
        throw Error(`提供的消息楼层号 '${option.message_id}' 超出了范围 [${-chat.length}, ${chat.length})`);
      }
      const chat_message = chat.at(option.message_id);
      return chat_message?.variables?.[chat_message?.swipe_id ?? 0] ?? {};
    }
    case 'chat': {
      return _.get(chat_metadata, 'variables', {});
    }
    case 'character': {
      return useCharacterSettingsStore().settings.variables;
    }
    case 'preset': {
      return usePresetSettingsStore().settings.variables;
    }
    case 'global': {
      return extension_settings.variables.global;
    }
    case 'script': {
      if (!option.script_id) {
        throw Error('获取变量失败, 未指定 script_id');
      }
      return useScriptIframeRuntimesStore().get(option.script_id)?.data ?? {};
    }
    case 'extension': {
      return _.get(extension_settings, option.extension_id, {});
    }
  }
}

export function getVariables(option: VariableOption = { type: 'chat' }): Record<string, any> {
  return klona(get_variables_without_clone(option));
}

export function _getVariables(this: Window, option: VariableOption = { type: 'chat' }): Record<string, any> {
  return option.type === 'script'
    ? getVariables({ type: 'script', script_id: _getScriptId.call(this) })
    : getVariables(option);
}

export function _getAllVariables(this: Window): Record<string, any> {
  const is_message_iframe = _getIframeName.call(this).startsWith('TH-message');

  let result = _({});
  result = result.assign(
    get_variables_without_clone({ type: 'global' }),
    get_variables_without_clone({ type: 'character' }),
  );
  if (!is_message_iframe) {
    result = result.assign(get_variables_without_clone({ type: 'script', script_id: _getScriptId.call(this) }));
  }
  result = result.assign(get_variables_without_clone({ type: 'chat' }));
  if (is_message_iframe) {
    result = result.assign(
      ...chat
        .slice(0, _getCurrentMessageId.call(this) + 1)
        .map((chat_message: any) => chat_message?.variables?.[chat_message?.swipe_id ?? 0]),
    );
  }
  return klona(result.value());
}

export function replaceVariables(variables: Record<string, any>, option: VariableOption = { type: 'chat' }): void {
  switch (option.type) {
    case 'message': {
      option.message_id = option.message_id === undefined || option.message_id === 'latest' ? -1 : option.message_id;
      if (!_.inRange(option.message_id, -chat.length, chat.length)) {
        throw Error(`提供的消息楼层号 '${option.message_id}' 超出了范围 (${-chat.length}, ${chat.length})`);
      }
      const chat_message = chat.at(option.message_id) as Record<string, any>;
      if (!_.has(chat_message, 'variables')) {
        _.set(chat_message, 'variables', _.times(chat_message.swipes?.length ?? 1, _.constant({})));
      }
      // 与提示词模板的兼容性
      if (_.isPlainObject(_.get(chat_message, 'variables'))) {
        _.set(
          chat_message,
          'variables',
          _.range(0, chat_message.swipes?.length ?? 1).map(i => chat_message.variables[i] ?? {}),
        );
      }
      _.set(chat_message, ['variables', _.get(chat_message, 'swipe_id', 0)], variables);
      saveChatConditionalDebounced();
      break;
    }
    case 'chat': {
      _.set(chat_metadata, 'variables', variables);
      saveMetadataDebounced();
      break;
    }
    case 'character': {
      const store = useCharacterSettingsStore();
      if (store.name === undefined) {
        throw new Error('当前没有打开角色卡，保存角色卡变量失败');
      }
      toRef(store.settings, 'variables').value = variables;
      break;
    }
    case 'preset': {
      const store = usePresetSettingsStore();
      toRef(store.settings, 'variables').value = variables;
      break;
    }
    case 'global': {
      _.set(extension_settings.variables, 'global', variables);
      saveSettingsDebounced();
      break;
    }
    case 'script': {
      if (!option.script_id) {
        throw Error('保存变量失败, 未指定 script_id');
      }
      const script = useScriptIframeRuntimesStore().get(option.script_id);
      if (!script) {
        return;
      }
      script.data = variables;
      break;
    }
    case 'extension': {
      _.set(extension_settings, option.extension_id, variables);
      saveSettingsDebounced();
      break;
    }
  }
}

export function _replaceVariables(
  this: Window,
  variables: Record<string, any>,
  option: VariableOption = { type: 'chat' },
): void {
  return option.type === 'script'
    ? replaceVariables(variables, { type: 'script', script_id: _getScriptId.call(this) })
    : replaceVariables(variables, option);
}

export function updateVariablesWith(
  updater: (variables: Record<string, any>) => Record<string, any>,
  option: VariableOption,
): Record<string, any>;
export function updateVariablesWith(
  updater: (variables: Record<string, any>) => Promise<Record<string, any>>,
  option: VariableOption,
): Promise<Record<string, any>>;
export function updateVariablesWith(
  updater:
    | ((variables: Record<string, any>) => Record<string, any>)
    | ((variables: Record<string, any>) => Promise<Record<string, any>>),
  option: VariableOption = { type: 'chat' },
): Record<string, any> | Promise<Record<string, any>> {
  const variables = getVariables(option);
  let result = updater(variables);
  if (isPromise(result)) {
    result = result.then((result: Record<string, any>) => {
      replaceVariables(result, option);
      return result;
    });
  } else {
    replaceVariables(result, option);
  }
  return result;
}

export function _updateVariablesWith(
  this: Window,
  updater:
    | ((variables: Record<string, any>) => Record<string, any>)
    | ((variables: Record<string, any>) => Promise<Record<string, any>>),
  option: VariableOption = { type: 'chat' },
): Record<string, any> | Promise<Record<string, any>> {
  return option.type === 'script'
    ? updateVariablesWith(updater, { type: 'script', script_id: _getScriptId.call(this) })
    : updateVariablesWith(updater, option);
}

export function insertOrAssignVariables(
  variables: Record<string, any>,
  option: VariableOption = { type: 'chat' },
): Record<string, any> {
  return updateVariablesWith(
    old_variables => _.mergeWith(old_variables, variables, (_lhs, rhs) => (_.isArray(rhs) ? rhs : undefined)),
    option,
  );
}

export function _insertOrAssignVariables(
  this: Window,
  variables: Record<string, any>,
  option: VariableOption = { type: 'chat' },
): Record<string, any> {
  return option.type === 'script'
    ? insertOrAssignVariables(variables, { type: 'script', script_id: _getScriptId.call(this) })
    : insertOrAssignVariables(variables, option);
}

export function insertVariables(
  variables: Record<string, any>,
  option: VariableOption = { type: 'chat' },
): Record<string, any> {
  return updateVariablesWith(
    old_variables => _.mergeWith({}, variables, old_variables, (_lhs, rhs) => (_.isArray(rhs) ? rhs : undefined)),
    option,
  );
}

export function _insertVariables(
  this: Window,
  variables: Record<string, any>,
  option: VariableOption = { type: 'chat' },
): Record<string, any> {
  return option.type === 'script'
    ? insertVariables(variables, { type: 'script', script_id: _getScriptId.call(this) })
    : insertVariables(variables, option);
}

export function deleteVariable(
  variable_path: string,
  option: VariableOption = { type: 'chat' },
): { variables: Record<string, any>; delete_occurred: boolean } {
  let delete_occurred: boolean = false;
  const variables = updateVariablesWith(old_variables => {
    delete_occurred = _.unset(old_variables, variable_path);
    return old_variables;
  }, option);
  return { variables, delete_occurred };
}

export function _deleteVariable(
  this: Window,
  variable_path: string,
  option: VariableOption = { type: 'chat' },
): { variables: Record<string, any>; delete_occurred: boolean } {
  return option.type === 'script'
    ? deleteVariable(variable_path, { type: 'script', script_id: _getScriptId.call(this) })
    : deleteVariable(variable_path, option);
}
