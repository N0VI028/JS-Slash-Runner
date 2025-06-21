import { chat, chat_metadata, event_types, eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

interface MacroLike {
  regex: RegExp;
  replace: (context: Context, substring: string, ...args: any[]) => string;
}

interface Context {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

const macros: MacroLike[] = [
  {
    regex: /\{\{get_global_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = extension_settings.variables.global;
      return JSON.stringify(_.get(variables, path, null));
    },
  },
  {
    regex: /\{\{get_chat_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = (chat_metadata as { variables: Object }).variables;
      return JSON.stringify(_.get(variables, path, null));
    },
  },
  {
    regex: /\{\{get_message_variable::(.*?)\}\}/gi,
    replace: (context: Context, _substring: string, path: string) => {
      const variables =
        (context.message_id !== undefined ? chat.slice(0, context.message_id + 1) : chat)
          .map(chat_message => _.get(chat_message, ['variables', chat_message.swipe_id ?? 0]))
          .findLast(data => data !== undefined) ?? {};
      return JSON.stringify(_.get(variables, path, null));
    },
  },
];

export function registerMacroLike(
  regex: RegExp,
  replace: (context: Context, substring: string, ...args: any[]) => string,
) {
  macros.push({ regex, replace });
}

function demacroOnPrompt(event_data: Parameters<ListenerType['chat_completion_prompt_ready']>[0]) {
  if (event_data.dryRun) {
    return;
  }

  for (const message of event_data.chat) {
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

export function renderAllMacros() {
  $('div.mes').each((_index, node) => {
    demacroOnRender($(node).attr('mesid')!);
  });
}

export function initializeMacroOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, demacroOnPrompt);
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_SWIPED, demacroOnRender);
}

export function destroyMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, demacroOnPrompt);
  eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_SWIPED, demacroOnRender);
}
