import { getCharAvatarPath, getUserAvatarPath } from '@/util/extension_variables';

import { chat, chat_metadata, event_types, eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { MacroFunction, MacrosParser } from '@sillytavern/scripts/macros';

const predefinedMacros = new Map<string, string | MacroFunction>([
  ['userAvatarPath', getUserAvatarPath],
  ['charAvatarPath', getCharAvatarPath],
]);

/**
 * 注册一个宏
 * @param {string} key - 宏的名称
 * @param {MacroFunction|string} value - 字符串或返回字符串的函数
 */
export function registerMacro(key: string, value: string | MacroFunction) {
  MacrosParser.registerMacro(key, value);
  console.log(`[Macro] 宏 "${key}" 注册成功`);
}

/**
 * 注册所有预定义的宏
 */
export function registerAllMacros() {
  for (const [key, value] of predefinedMacros.entries()) {
    MacrosParser.registerMacro(key, value);
    console.log(`[Macro] 宏 "${key}" 注册成功`);
  }
}

/**
 * 注销指定的宏
 * @param {string} key - 要注销的宏名称
 */
export function unregisterMacro(key: string) {
  MacrosParser.unregisterMacro(key);
  console.log(`[Macro] 宏 "${key}" 注销成功`);
}

/**
 * 注销所有预定义的宏
 */
export function unregisterAllMacros() {
  for (const key of predefinedMacros.keys()) {
    MacrosParser.unregisterMacro(key);
    console.log(`[Macro] 宏 "${key}" 注销成功`);
  }
}

function get_property_from_path(object: Record<string, any>, path: string, default_value: any) {
  let result: Record<string, any> | undefined = object;
  for (const key of path.split('.')) {
    if (result === undefined) {
      return default_value;
    }
    result = result[key];
  }
  return result ?? default_value;
}

function demacro(event_data: Parameters<ListenerType['chat_completion_prompt_ready']>[0]) {
  const map = {
    get_global_variable: extension_settings.variables.global,
    get_chat_variable: (chat_metadata as { variables: Object }).variables,
    get_message_variable:
      chat
        .filter(message => message.variables?.[message.swipe_id ?? 0] !== undefined)
        .map(message => message.variables[message.swipe_id ?? 0])
        .at(-1) ?? {},
  };
  event_data.chat.forEach(messages => {
    messages.content = messages.content.replaceAll(
      /\{\{(get_global_variable|get_chat_variable|get_message_variable)::(.*?)\}\}/g,
      (_substring, type: keyof typeof map, path: string) => {
        return JSON.stringify(get_property_from_path(map[type], path, null));
      },
    );
  });
}

export function initializeMacroOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}

export function destroyMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}
