import { ListenerType, tavern_events } from '@/function/event';

import {
  chat,
  chat_metadata,
  clearChat,
  event_types,
  eventSource,
  GenerateOptions,
  printMessages,
  saveChatConditional,
} from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import _ from 'lodash';

interface MacroLike {
  regex: RegExp;
  replace: (context: Context, substring: string, ...args: any[]) => string;
}

interface Context {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

export const macros: MacroLike[] = [
  {
    regex: /\{\{get_global_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = extension_settings.variables.global;
      const value = _.get(variables, _.unescape(path), null);
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
  },
  {
    regex: /\{\{get_chat_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = (chat_metadata as { variables: Object }).variables;
      const value = _.get(variables, _.unescape(path), null);
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
  },
  {
    regex: /\{\{get_message_variable::(.*?)\}\}/gi,
    replace: (context: Context, _substring: string, path: string) => {
      const variables =
        (context.message_id !== undefined ? chat.slice(0, context.message_id + 1) : chat)
          .map(chat_message => _.get(chat_message, ['variables', chat_message.swipe_id ?? 0]))
          .findLast(data => data !== undefined) ?? {};
      const value = _.get(variables, _.unescape(path), null);
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
  },
];

export function registerMacroLike(
  regex: RegExp,
  replace: (context: Context, substring: string, ...args: any[]) => string,
) {
  macros.push({ regex, replace });
}

let is_dry_run = false;
function checkDryRun(_type: string, _data: GenerateOptions, dry_run: boolean) {
  is_dry_run = dry_run;
}

function demacroOnPrompt(event_data: Parameters<ListenerType['GENERATE_AFTER_DATA']>[0]) {
  if (is_dry_run) {
    return;
  }

  for (const message of event_data.prompt) {
    for (const macro of macros) {
      message.content = message.content.replace(macro.regex, (substring: string, ...args: any[]) =>
        macro.replace({ role: message.role as 'user' | 'assistant' | 'system' }, substring, ...args),
      );
    }
  }
}

function demacroOnRender(message_id: string) {
  const $mes = $(`div.mes[mesid="${message_id}"]`);
  const $mes_text = $mes.find('.mes_text');
  if ($mes_text.length === 0 || !macros.some(macro => macro.regex.test($mes_text.text()))) {
    return;
  }

  const replace_html = (html: string) => {
    for (const macro of macros) {
      html = html.replace(macro.regex, (substring: string, ...args: any[]) =>
        macro.replace(
          { message_id: Number(message_id), role: $mes.attr('is_user') === 'true' ? 'user' : 'assistant' },
          substring,
          ...args,
        ),
      );
    }
    return html;
  };

  $mes_text.html((_index, html) => replace_html(html));
  $mes_text
    .find('code')
    .filter((_index, node) => macros.some(macro => macro.regex.test($(node).text())))
    .text((_index, text) => replace_html(text));
}

function renderAllMacros() {
  $('div.mes').each((_index, node) => {
    demacroOnRender($(node).attr('mesid')!);
  });
}
export const renderAllMacrosDebounced = _.debounce(renderAllMacros, 1000);

async function derenderAllMacros() {
  await saveChatConditional();
  await clearChat();
  await printMessages();
  $('div.mes').each((_index, node) => {
    eventSource.emit(
      Boolean($(node).attr('is_user')) === true
        ? tavern_events.USER_MESSAGE_RENDERED
        : tavern_events.CHARACTER_MESSAGE_RENDERED,
      Number($(node).attr('mesid')!),
    );
  });
}
export const derenderAllMacrosDebounced = _.debounce(derenderAllMacros, 1000);

export function registerMacroOnExtension() {
  eventSource.on(event_types.CHAT_CHANGED, renderAllMacrosDebounced);
  eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, checkDryRun);
  eventSource.on(event_types.GENERATE_AFTER_DATA, demacroOnPrompt);
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_SWIPED, demacroOnRender);
}

export function unregisterMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_CHANGED, renderAllMacrosDebounced);
  eventSource.removeListener(event_types.GENERATE_AFTER_COMBINE_PROMPTS, checkDryRun);
  eventSource.removeListener(event_types.GENERATE_AFTER_DATA, demacroOnPrompt);
  eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_SWIPED, demacroOnRender);
}
