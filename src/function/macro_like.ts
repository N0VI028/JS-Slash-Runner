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

function getVariableOption(context: MacroLikeContext, type: 'message' | 'chat' | 'character' | 'preset' | 'global') {
  return type !== 'message'
    ? { type }
    : {
        type,
        message_id:
          context.message_id ?? chat.findLastIndex(message => _.isObject(message.variables?.[message.swipe_id ?? 0])),
      };
}
function getWithout$(variables: Record<string, any>, path: string) {
  return omitDeepBy(_.get(variables, _.unescape(path), null), (_, key) => key.startsWith('$'));
}

const format_variable_regex = /^(.*)\{\{format_(message|chat|character|preset|global)_variable::(.*?)\}\}/im;
function applyFormatVariable(
  context: MacroLikeContext,
  _substring: string,
  prefix: string,
  type: 'message' | 'chat' | 'character' | 'preset' | 'global',
  path: string,
) {
  const match = prefix.match(format_variable_regex);
  if (match) {
    prefix =
      applyFormatVariable(
        context,
        '',
        match[1],
        match[2] as 'message' | 'chat' | 'character' | 'preset' | 'global',
        match[3],
      ) + prefix.slice(match[0].length);
  }

  const variables = get_variables_without_clone(getVariableOption(context, type));
  const value = getWithout$(variables, path);
  return (
    prefix +
    (typeof value === 'string' ? value : YAML.stringify(value, { blockQuote: 'literal' }).trimEnd()).replaceAll(
      '\n',
      '\n' + ' '.repeat(prefix.length),
    )
  );
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
      const variables = get_variables_without_clone(getVariableOption(context, type));
      const value = getWithout$(variables, path);
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
  },
  {
    regex: /^(.*)\{\{format_(message|chat|character|preset|global)_variable::(.*?)\}\}/gim,
    replace: applyFormatVariable,
  },
];

export function registerMacroLike(
  regex: RegExp,
  replace: (context: MacroLikeContext, substring: string, ...args: any[]) => string,
): { unregister: () => void } {
  if (!macros.some(macro => macro.regex.source === regex.source)) {
    macros.push({ regex, replace });
  }
  return { unregister: () => unregisterMacroLike(regex) };
}
export function _registerMacroLike(
  this: Window,
  regex: RegExp,
  replace: (context: MacroLikeContext, substring: string, ...args: any[]) => string,
): { unregister: () => void } {
  const { unregister } = registerMacroLike(regex, replace);
  $(this).on('pagehide', unregister);
  return { unregister };
}

export function unregisterMacroLike(regex: RegExp) {
  const index = macros.findIndex(macro => macro.regex.source === regex.source);
  if (index !== -1) {
    macros.splice(index, 1);
  }
}
