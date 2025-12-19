import { SendingMessage } from '@/function/event';
import { macros } from '@/function/macro_like';
import { highlight_code, reloadAndRenderChatWithoutEvents, version } from '@/util/tavern';
import { event_types, eventSource } from '@sillytavern/script';
import { compare } from 'compare-versions';

function demacroOnPrompt(
  event_data: {
    prompt: SendingMessage[];
  },
  dry_run: boolean,
) {
  if (dry_run) {
    return;
  }

  for (const message of event_data.prompt) {
    for (const macro of macros) {
      if (typeof message.content === 'string') {
        macro.regex.lastIndex = 0;
        message.content = message.content.replace(macro.regex, (substring: string, ...args: any[]) =>
          macro.replace({ role: message.role }, substring, ...args),
        );
      } else {
        message.content
          .filter(item => item.type === 'text')
          .forEach(item => {
            macro.regex.lastIndex = 0;
            item.text = item.text.replace(macro.regex, (substring: string, ...args: any[]) =>
              macro.replace({ role: message.role }, substring, ...args),
            );
          });
      }
    }
  }
}

function demacroOnRender($mes: JQuery<HTMLDivElement>) {
  const $mes_text = $mes.find('.mes_text');
  if (
    $mes_text.length === 0 ||
    !macros.some(macro => {
      macro.regex.lastIndex = 0;
      return macro.regex.test($mes_text.text());
    })
  ) {
    return;
  }

  const replace_html = (html: string) => {
    for (const macro of macros) {
      macro.regex.lastIndex = 0;
      html = html.replace(macro.regex, (substring: string, ...args: any[]) =>
        macro.replace({ role: $mes.attr('is_user') === 'true' ? 'user' : 'assistant' }, substring, ...args),
      );
    }
    return html;
  };

  // 因未知原因, 一些设备上在初次进入角色卡时会 '渲染前端界面-替换助手宏-渲染前端界面', 因此需要移除额外渲染的 iframe
  $mes_text.find('.TH-render > iframe').remove();

  $mes_text.html((_index, html) => replace_html(html));
  $mes_text
    .find('code')
    .filter((_index, element) =>
      macros.some(macro => {
        macro.regex.lastIndex = 0;
        return macro.regex.test($(element).text());
      }),
    )
    .text((_index, text) => replace_html(text))
    .removeClass('hljs')
    .each((_index, element) => {
      highlight_code(element);
    });
}

function demacroOnRenderOne(message_id: number) {
  demacroOnRender($(`#chat > .mes[mesid="${message_id}"]`));
}

function demacroOnRenderAll() {
  $('#chat > .mes').each((_index, node) => {
    demacroOnRender($(node as HTMLDivElement));
  });
}

export function useMacroLike(enabled: Readonly<Ref<boolean>>) {
  watch(enabled, (value, old_value) => {
    if (value !== old_value) {
      reloadAndRenderChatWithoutEvents();
    }
  });

  if (compare(version, '1.13.4', '>')) {
    eventSource.on(event_types.GENERATE_AFTER_DATA, (event_data: any, dry_run: boolean) => {
      if (enabled.value) {
        demacroOnPrompt(event_data, dry_run);
      }
    });
  } else {
    eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, (generate_data: any) => {
      if (enabled.value) {
        demacroOnPrompt({ prompt: generate_data.messages }, false);
      }
    });
  }

  eventSource.on('chatLoaded', () => {
    if (enabled.value) {
      demacroOnRenderAll();
    }
  });
  [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ].forEach(event => {
    eventSource.on(event, (message_id: number | string) => {
      if (enabled.value) {
        demacroOnRenderOne(Number(message_id));
      }
    });
  });
}
