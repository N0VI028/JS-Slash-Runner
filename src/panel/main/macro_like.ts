import { macros } from '@/function/macro_like';
import { highlight_code, reloadAndRenderChatWithoutEvents } from '@/util/tavern';
import { event_types, eventSource } from '@sillytavern/script';

let check_dry_run = false;
function checkDryRun(_type: string, _data: any, dry_run: boolean) {
  check_dry_run = dry_run;
}
function resetDryRun() {
  check_dry_run = false;
}

function demacroOnPrompt(event_data: { prompt: { role: string; content: string }[] }, dry_run?: boolean) {
  // 1.13.4 及之前 GENERATE_AFTER_DATA 没有 dry_run 参数
  if (dry_run ?? check_dry_run) {
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
  eventSource.on(event_types.GENERATION_ENDED, resetDryRun);
  eventSource.on(event_types.GENERATE_AFTER_DATA, (event_data: any, dry_run?: boolean) => {
    if (enabled.value) {
      demacroOnPrompt(event_data, dry_run);
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
