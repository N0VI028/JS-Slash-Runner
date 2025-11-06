import { get_variables_without_clone } from '@/function/variables';
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
    regex: /\{\{(get|format)_(message|chat|character|preset|global)_variable::(.*?)\}\}/gi,
    replace: (
      context: MacroLikeContext,
      _substring: string,
      action: 'get' | 'format',
      type: 'message' | 'chat' | 'character' | 'preset' | 'global',
      path: string,
    ) => {
      const variables = get_variables_without_clone(
        type !== 'message' ? { type } : { type, message_id: context.message_id ?? 'latest' },
      );
      const value = _.get(variables, _.unescape(path), null);
      return typeof value === 'string'
        ? value
        : action === 'get'
          ? JSON.stringify(value)
          : YAML.stringify(value, { blockQuote: 'literal' }).trimEnd();
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
