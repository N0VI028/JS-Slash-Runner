import { get_variables_without_clone } from '@/function/variables';
import { chat } from '@sillytavern/script';
import { omitDeepBy } from 'lodash-omitdeep';
import YAML from 'yaml';

export interface MacroLike {
  regex: RegExp;
  replace: (context: MacroLikeContext, substring: string, ...args: any[]) => string;
}

export interface MacroLikeContext {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

export const macros: MacroLike[] = [
  {
    regex: /\{\{get_(message|chat|character|preset|global)_variable::(.*?)\}\}/gi,
    replace: (
      context: MacroLikeContext,
      _substring: string,
      type: 'message' | 'chat' | 'character' | 'preset' | 'global',
      path: string,
    ) => {
      const variables = get_variables_without_clone(
        type !== 'message'
          ? { type }
          : {
              type,
              message_id:
                context.message_id ?? chat.findLastIndex(message => _.isObject(_.get(message, 'variables[0]'))),
            },
      );
      const value = omitDeepBy(_.get(variables, _.unescape(path), null), (_, key) => key.startsWith('$'));
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
  },
  {
    regex: /^(.*)\{\{format_(message|chat|character|preset|global)_variable::(.*?)\}\}/gim,
    replace: (
      context: MacroLikeContext,
      _substring: string,
      prefix: string,
      type: 'message' | 'chat' | 'character' | 'preset' | 'global',
      path: string,
    ) => {
      const variables = get_variables_without_clone(
        type !== 'message'
          ? { type }
          : {
              type,
              message_id:
                context.message_id ?? chat.findLastIndex(message => _.isObject(_.get(message, 'variables[0]'))),
            },
      );
      const value = omitDeepBy(_.get(variables, _.unescape(path), null), (_, key) => key.startsWith('$'));
      return (
        prefix +
        (typeof value === 'string' ? value : YAML.stringify(value, { blockQuote: 'literal' }).trimEnd()).replaceAll(
          '\n',
          '\n' + ' '.repeat(prefix.length),
        )
      );
    },
  },
];

export function registerMacroLike(
  regex: RegExp,
  replace: (context: MacroLikeContext, substring: string, ...args: any[]) => string,
) {
  if (macros.some(macro => macro.regex.source === regex.source)) {
    return;
  }
  macros.push({ regex, replace });
}

export function unregisterMacroLike(regex: RegExp) {
  const index = macros.findIndex(macro => macro.regex.source === regex.source);
  macros.splice(index, 1);
}
