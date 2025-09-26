import '@/panel/render/use_collapse_code_block.scss';
import { event_types } from '@sillytavern/script';

function collapseCodeBlock($pre: JQuery<HTMLPreElement>) {
  const $code = $pre.find('code');
  if ($code.hasClass('TH-collapse-code-block')) {
    return;
  }

  $code.hide();
  $('<div class="TH-collapse-code-block-button">显示代码块</div>')
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
}

function collapseCodeBlockForMessage(message_id: number) {
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
  $('#chat').find('pre > code').show();
}

export function useCollapseCodeBlock(should_hide_style: Readonly<Ref<boolean>>) {
  watch(
    should_hide_style,
    new_should_hide_style => {
      if (new_should_hide_style) {
        collapseCodeBlockForAll();
      } else {
        uncollapseCodeBlockForAll();
      }
    },
    { immediate: true },
  );

  useEventSourceOn(event_types.MESSAGE_UPDATED, message_id => {
    if (toValue(should_hide_style)) {
      collapseCodeBlockForMessage(Number(message_id));
    }
  });
  useEventSourceOn(event_types.CHARACTER_MESSAGE_RENDERED, message_id => {
    if (toValue(should_hide_style)) {
      collapseCodeBlockForMessage(Number(message_id));
    }
  });
}
