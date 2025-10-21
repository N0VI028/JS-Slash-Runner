import '@/panel/render/use_collapse_code_block.scss';
import { CollapseCodeBlock } from '@/type/settings';
import { event_types, eventSource } from '@sillytavern/script';

function collapseCodeBlock($pre: JQuery<HTMLPreElement>, collapse_code_block: CollapseCodeBlock) {
  const $code = $pre.find('code');
  if ($code.hasClass('TH-collapse-code-block')) {
    return;
  }

  const is_frontend = $code.text().includes('<body');
  if (collapse_code_block === 'frontend_only' && !is_frontend) {
    return;
  }

  const $button = $('<div class="TH-collapse-code-block-button">')
    .text(is_frontend ? '显示前端代码块' : '显示代码块')
    .on('click', function () {
      const is_visible = $code.is(':visible');
      if (is_visible) {
        $code.hide();
        $(this).text(is_frontend ? '显示前端代码块' : '显示代码块');
      } else {
        $code.show();
        $(this).text(is_frontend ? '隐藏前端代码块' : '隐藏代码块');
      }
    })
    .prependTo($pre);
  if ($button.siblings('iframe').length > 0) {
    $button.hide();
  }
  $code.hide();
}

function collapseCodeBlockForMessageId(message_id: number, collapse_code_block: CollapseCodeBlock) {
  $(`.mes[mesid=${message_id}]`)
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
    .find('pre > code')
    .filter((_index, code) => $(code).siblings('iframe').length === 0)
    .show();
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

  eventSource.on('chatLoaded', () => {
    if (collapse_code_block.value !== 'none') {
      collapseCodeBlockForAll(collapse_code_block.value);
    }
  });
  eventSource.on(event_types.MESSAGE_UPDATED, (message_id: string | number) => {
    if (collapse_code_block.value !== 'none') {
      collapseCodeBlockForMessageId(Number(message_id), collapse_code_block.value);
    }
  });
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (message_id: string | number) => {
    if (collapse_code_block.value !== 'none') {
      collapseCodeBlockForMessageId(Number(message_id), collapse_code_block.value);
    }
  });
}
