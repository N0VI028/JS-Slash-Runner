import { inMessageRange, normalizeMessageId } from '@/util/message';
import { highlight_code } from '@/util/tavern';
import {
  characters,
  chat,
  default_avatar,
  event_types,
  eventSource,
  getThumbnailUrl,
  messageFormatting,
  showSwipeButtons,
  system_avatar,
  this_chid,
  user_avatar,
} from '@sillytavern/script';
import { getLastMessageId } from '@sillytavern/scripts/macros';

type FormatAsDisplayedMessageOption = {
  message_id?: 'last' | 'last_user' | 'last_char' | number;
};

export function formatAsDisplayedMessage(
  text: string,
  { message_id = 'last' }: FormatAsDisplayedMessageOption = {},
): string {
  if (typeof message_id !== 'number' && !['last', 'last_user', 'last_char'].includes(message_id)) {
    throw Error(
      `提供的 message_id 无效, 请提供 'last', 'last_user', 'last_char' 或楼层消息号, 你提供的是: ${message_id}`,
    );
  }

  const last_message_id = getLastMessageId();
  if (last_message_id === null) {
    throw Error(`未找到任何消息楼层`);
  }

  switch (message_id) {
    case 'last':
      message_id = last_message_id;
      break;
    case 'last_user': {
      const last_user_message_id = getLastMessageId({ filter: (m: any) => m.is_user && !m.is_system }) as number;
      if (last_user_message_id === null) {
        throw Error(`未找到任何 user 消息楼层, 你提供的是: ${message_id}`);
      }
      message_id = last_user_message_id;
      break;
    }
    case 'last_char': {
      const last_char_message_id = getLastMessageId({ filter: (m: any) => !m.is_user && !m.is_system }) as number;
      if (last_char_message_id === null) {
        throw Error(`未找到任何 char 消息楼层, 你提供的是: ${message_id}`);
      }
      message_id = last_char_message_id;
      break;
    }
  }
  const normalized_message_id = normalizeMessageId(message_id);
  if (!inMessageRange(normalized_message_id)) {
    throw Error(`提供的 message_id 不在 [${-last_message_id - 1}, ${last_message_id}] 内, 你提供的是: ${message_id}`);
  }

  const chat_message = chat[normalized_message_id];

  const result = messageFormatting(
    text,
    chat_message.name,
    chat_message.is_system,
    chat_message.is_user,
    normalized_message_id,
  );

  const $div = $('<div>').append(result);
  $div.find('pre code').each((_index, element) => {
    highlight_code(element);
  });

  return $div.html();
}

export function retrieveDisplayedMessage(message_id: number): JQuery<HTMLDivElement> {
  return $(`#chat > .mes[mesid = "${message_id}"]`, window.parent.document).find(`div.mes_text`);
}

export async function refreshOneMessage(message_id: number, $mes?: JQuery<HTMLElement>): Promise<void> {
  if ($mes && $mes.length === 0) {
    return;
  }

  $mes = $mes ?? $(`#chat > .mes[mesid = "${message_id}"]`);
  if (!$mes) {
    return;
  }

  const chat_message = chat[message_id];
  $mes.attr({
    mesid: message_id,
    swipeid: chat_message.swipe_id ?? 0,
    ch_name: chat_message.name,
    is_user: chat_message.is_user,
    is_system: !!chat_message.is_system,
    force_avatar: !!chat_message.force_avatar,
    type: chat_message.extra?.type ?? '',
  });
  $mes
    .find('.avatar img')
    .attr(
      'src',
      chat_message.force_avatar
        ? chat_message.force_avatar
        : chat_message.is_user
          ? getThumbnailUrl('persona', user_avatar)
          : this_chid === undefined
            ? system_avatar
            : characters[Number(this_chid)].avatar !== 'none'
              ? getThumbnailUrl('avatar', characters[Number(this_chid)].avatar)
              : default_avatar,
    );
  $mes.find('.ch_name .name_text').text(chat_message.name);
  $mes.find('.mesIDDisplay').text(`#${message_id}`);

  if (chat_message.extra?.token_count) {
    $mes.find('.tokenCounterDisplay').text(`${chat_message.extra.token_count}t`);
  }

  if (chat_message.swipes) {
    $mes.find('.swipes-counter').text(`${chat_message.swipe_id + 1}\u200b/\u200b${chat_message.swipes.length}`);
    if (message_id === chat.length - 1) {
      showSwipeButtons();
    }
  }

  $mes
    .find('.mes_text')
    .empty()
    .append(
      messageFormatting(chat_message.mes, chat_message.name, chat_message.is_system, chat_message.is_user, message_id),
    );
  $mes.find('pre code').each((_index, element) => {
    highlight_code(element);
  });

  await eventSource.emit(
    chat_message.is_user ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
    message_id,
  );
}
