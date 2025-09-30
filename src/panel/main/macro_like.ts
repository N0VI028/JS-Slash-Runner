import { macros } from '@/function/macro_like';
import { highlight_code } from '@/util/highlight_code';
import { reloadAndRenderChatWithoutEvents } from '@/util/reload_chat';
import { event_types, eventSource, GenerateOptions } from '@sillytavern/script';

let is_dry_run = false;
function checkDryRun(_type: string, _data: GenerateOptions, dry_run: boolean) {
  is_dry_run = dry_run;
}

function demacroOnPrompt(event_data: any) {
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
    .filter((_index, element) => macros.some(macro => macro.regex.test($(element).text())))
    .text((_index, text) => replace_html(text))
    .removeClass('hljs')
    .each((_index, element) => {
      highlight_code(element);
    });
}

function demacroOnRenderAll() {
  $('div.mes').each((_index, node) => {
    demacroOnRender($(node).attr('mesid')!);
  });
}

export function useMacroLike(enabled: Readonly<Ref<boolean>>) {
  watch(enabled, (value, old_value) => {
    if (value) {
      demacroOnRenderAll();
      return;
    }
    if (!value && old_value) {
      reloadAndRenderChatWithoutEvents();
    }
  });

  eventSource.on('chatLoaded', () => {
    if (enabled.value) {
      demacroOnRenderAll();
    }
  });
  eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, checkDryRun);
  eventSource.on(event_types.GENERATE_AFTER_DATA, (event_data: any) => {
    if (enabled.value) {
      demacroOnPrompt(event_data);
    }
  });
  [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ].forEach(event => {
    eventSource.on(event, (message_id: string) => {
      if (enabled.value) {
        demacroOnRender(message_id);
      }
    });
  });
}
