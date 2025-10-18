import '@/panel/render/use_collapse_code_block.scss';
import { event_types, eventSource } from '@sillytavern/script';

function collapseCodeBlock($pre: JQuery<HTMLPreElement>) {
  const $code = $pre.find('code');
  if ($code.hasClass('TH-collapse-code-block')) {
    return;
  }

  const $button = $('<div class="TH-collapse-code-block-button">显示代码块</div>')
    .on('click', function () {
      const is_visible = $code.is(':visible');
      if (is_visible) {
        $code.hide();
        $(this).text('显示代码块');
      } else {
        $code.show();
        $(this).text('隐藏代码块');
      }
    })
    .prependTo($pre);
  if ($button.siblings('iframe').length > 0) {
    $button.hide();
  }
  $code.hide();
}

function collapseCodeBlockForMessageId(message_id: number) {
  $(`.mes[mesid=${message_id}]`)
    .find('pre')
    .each(function () {
      collapseCodeBlock($(this));
    });
}

function collapseCodeBlockForAll() {
  $('#chat')
    .find('pre')
    .each(function () {
      collapseCodeBlock($(this));
    });
}

function uncollapseCodeBlockForAll() {
  $('.TH-collapse-code-block-button').remove();
  $('#chat')
    .find('pre > code')
    .filter((_index, code) => $(code).siblings('iframe').length === 0)
    .show();
}

export function useCollapseCodeBlock(enabled: Readonly<Ref<boolean>>) {
  watch(
    enabled,
    (value, old_value) => {
      if (value) {
        collapseCodeBlockForAll();
        return;
      }
      if (!value && old_value) {
        uncollapseCodeBlockForAll();
      }
    },
    { immediate: true },
  );

  eventSource.on('chatLoaded', () => {
    if (enabled.value) {
      collapseCodeBlockForAll();
    }
  });
  eventSource.on(event_types.MESSAGE_UPDATED, (message_id: string | number) => {
    if (enabled.value) {
      collapseCodeBlockForMessageId(Number(message_id));
    }
  });
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (message_id: string | number) => {
    if (enabled.value) {
      collapseCodeBlockForMessageId(Number(message_id));
    }
  });
}
