import { getCharAvatarPath, getUserAvatarPath } from '@/util/extension_variables';

import { MacroFunction, MacrosParser } from '@sillytavern/scripts/macros';

import log from 'loglevel';

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
  log.info(`[Macro] 宏 "${key}" 注册成功`);
}

/**
 * 注册所有预定义的宏
 */
export function registerAllMacros() {
  for (const [key, value] of predefinedMacros.entries()) {
    MacrosParser.registerMacro(key, value);
    log.info(`[Macro] 宏 "${key}" 注册成功`);
  }
}

/**
 * 注销指定的宏
 * @param {string} key - 要注销的宏名称
 */
export function unregisterMacro(key: string) {
  MacrosParser.unregisterMacro(key);
  log.info(`[Macro] 宏 "${key}" 注销成功`);
}

/**
 * 注销所有预定义的宏
 */
export function unregisterAllMacros() {
  for (const key of predefinedMacros.keys()) {
    MacrosParser.unregisterMacro(key);
    log.info(`[Macro] 宏 "${key}" 注销成功`);
  }
}
