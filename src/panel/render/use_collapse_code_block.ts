import '@/panel/render/use_collapse_code_block.scss';
import { CollapseCodeBlock } from '@/type/settings';
import { isFrontend } from '@/util/is_frontend';
import { chat, event_types, eventSource } from '@sillytavern/script';

function collapseCodeBlock($pre: JQuery<HTMLPreElement>, collapse_code_block: CollapseCodeBlock) {
  const $possible_div = $pre.parent('div.TH-render');
  if ($possible_div.children('div.TH-collapse-code-block-button').length > 0) {
    return;
  }

  const is_frontend = isFrontend($pre.text());
  if (collapse_code_block === 'frontend_only' && !is_frontend) {
    return;
  }

  if ($possible_div.length === 0) {
    $pre.wrap('<div class="TH-render">');
  }
  const $div = $pre.parent('div.TH-render');

  const $button = $('<div class="TH-collapse-code-block-button">')
    .text(is_frontend ? '显示前端代码块' : '显示代码块')
    .on('click', function () {
      const is_visible = $pre.is(':visible');
      if (is_visible) {
        $pre.addClass('hidden!');
        $(this).text(is_frontend ? '显示前端代码块' : '显示代码块');
      } else {
        $pre.removeClass('hidden!');
        $(this).text(is_frontend ? '隐藏前端代码块' : '隐藏代码块');
      }
    })
    .prependTo($div);
  if ($div.children('iframe').length > 0) {
    $button.addClass('hidden!');
  }
  $pre.addClass('hidden!');
}

function collapseCodeBlockForMessageId(message_id: number, collapse_code_block: CollapseCodeBlock) {
  $(`#chat > .mes[mesid=${message_id}]`)
    .find('pre')
    .each(function () {
      collapseCodeBlock($(this), collapse_code_block);
    });
}

function collapseCodeBlockForAll(collapse_code_block: CollapseCodeBlock) {
  $('#chat')
    .find('pre')
    .each(function () {
      collapseCodeBlock($(this), collapse_code_block);
    });
}

function uncollapseCodeBlockForAll() {
  $('.TH-collapse-code-block-button').remove();
  $('#chat')
    .find('pre')
    .filter((_index, pre) => $(pre).siblings('iframe').length === 0)
    .removeClass('hidden!');
}

export function useCollapseCodeBlock(collapse_code_block: Readonly<Ref<CollapseCodeBlock>>) {
  watch(
    collapse_code_block,
    (value, old_value) => {
      if (value !== old_value) {
        uncollapseCodeBlockForAll();
      }
      if (value !== 'none') {
        collapseCodeBlockForAll(value);
      }
    },
    { immediate: true },
  );

  // 流式过程监听变化并应用折叠代码块功能
  const observer = new MutationObserver(() => {
    const chat_length = chat.length;
    if (chat_length > 0) {
      collapseCodeBlockForMessageId(chat_length - 1, collapse_code_block.value);
    }
  });
  let during_observe = false;
  eventSource.on(event_types.STREAM_TOKEN_RECEIVED, () => {
    if (collapse_code_block.value === 'none') {
      return;
    }
    if (during_observe) {
      return;
    }
    during_observe = true;
    const $mes = $(`#chat > .mes[mesid=${chat.length - 1}]`).find('.mes_text');
    if ($mes.length === 0) {
      return;
    }
    observer.observe($mes[0], { childList: true });
    eventSource.once(event_types.MESSAGE_RECEIVED, () => {
      observer.disconnect();
      during_observe = false;
    });
  });

  eventSource.on('chatLoaded', () => {
    if (collapse_code_block.value !== 'none') {
      collapseCodeBlockForAll(collapse_code_block.value);
    }
  });

  [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ].forEach(event => {
    eventSource.on(event, (message_id: number | string) => {
      if (collapse_code_block.value !== 'none') {
        collapseCodeBlockForMessageId(Number(message_id), collapse_code_block.value);
      }
    });
  });
}
