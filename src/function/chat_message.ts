import { inUnnormalizedMessageRange, normalizeMessageId } from '@/util/message';
import { highlight_code, saveChatConditionalDebounced } from '@/util/tavern';
import {
  addOneMessage,
  chat,
  event_types,
  eventSource,
  messageFormatting,
  name1,
  name2,
  reloadCurrentChat,
  saveChatConditional,
  showSwipeButtons,
  substituteParamsExtended,
  system_message_types,
} from '@sillytavern/script';

type ChatMessage = {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  message: string;
  data: Record<string, any>;
  extra: Record<string, any>;
};

type ChatMessageSwiped = {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  swipe_id: number;
  swipes: string[];
  swipes_data: Record<string, any>[];
  swipes_info: Record<string, any>[];
};

type GetChatMessagesOption = {
  role?: 'all' | 'system' | 'assistant' | 'user';
  hide_state?: 'all' | 'hidden' | 'unhidden';
  include_swipes?: boolean;
};

// TODO: 移入 @/util/message.ts
function string_to_range(input: string, min: number, max: number) {
  let start, end;

  if (input.match(/^(-?\d+)$/)) {
    const value = Number(input);
    start = end = value < 0 ? max + value + 1 : value;
  } else {
    const match = input.match(/^(-?\d+)-(-?\d+)$/);
    if (!match) {
      return null;
    }

    [start, end] = _.sortBy(
      [match[1], match[2]].map(value => Number(value)).map(value => (value < 0 ? max + value + 1 : value)),
    );
  }

  if (isNaN(start) || isNaN(end) || start > end || start < min || end > max) {
    return null;
  }
  return { start, end };
}

export function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: Omit<GetChatMessagesOption, 'include_swipes'> & { include_swipes?: false },
): ChatMessage[];
export function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: Omit<GetChatMessagesOption, 'include_swipes'> & { include_swipes?: true },
): ChatMessageSwiped[];
export function getChatMessages(
  range: string | number,
  { role = 'all', hide_state = 'all', include_swipes = false }: GetChatMessagesOption = {},
): (ChatMessage | ChatMessageSwiped)[] {
  const range_demacroed = substituteParamsExtended(range.toString());
  const range_number = string_to_range(range_demacroed, 0, chat.length - 1);
  if (!range_number) {
    throw Error(`提供的消息范围 range 无效: ${range}`);
  }
  if (!['all', 'system', 'assistant', 'user'].includes(role)) {
    throw Error(`提供的 role 无效, 请提供 'all', 'system', 'assistant' 或 'user', 你提供的是: ${role}`);
  }
  if (!['all', 'hidden', 'unhidden'].includes(hide_state)) {
    throw Error(`提供的 hide_state 无效, 请提供 'all', 'hidden' 或 'unhidden', 你提供的是: ${hide_state}`);
  }

  const { start, end } = range_number;

  const get_role = (chat_message: any) => {
    const is_narrator = chat_message.extra?.type === system_message_types.NARRATOR;
    if (is_narrator) {
      if (chat_message.is_user) {
        return 'unknown';
      }
      return 'system';
    }
    if (chat_message.is_user) {
      return 'user';
    }
    return 'assistant';
  };

  const process_message = (message_id: number): (ChatMessage | ChatMessageSwiped) | null => {
    const message = chat[message_id];
    if (!message) {
      return null;
    }

    const message_role = get_role(message);
    if (role !== 'all' && message_role !== role) {
      return null;
    }

    if (hide_state !== 'all' && (hide_state === 'hidden') !== message.is_system) {
      return null;
    }

    const swipe_id = message?.swipe_id ?? 0;

    let swipes: string[] = message?.swipes ?? [message.mes];
    let swipes_data: Record<string, any>[] = message?.variables ?? [{}];
    let swipes_info: Record<string, any>[] = message?.swipe_info ?? [message?.extra ?? {}];
    const swipe_length = swipes.length;
    swipes = _.range(0, swipe_length).map(i => swipes[i] ?? '');
    swipes_data = _.range(0, swipe_length).map(i => swipes_data[i] ?? {});
    swipes_info = _.range(0, swipe_length).map(i => swipes_info[i] ?? {});

    const extra = swipes_info[swipe_id];
    const data = swipes_data[swipe_id];

    if (include_swipes) {
      return {
        message_id: message_id,
        name: message.name,
        role: message_role as 'system' | 'assistant' | 'user',
        is_hidden: message.is_system,
        swipe_id: swipe_id,
        swipes: swipes,
        swipes_data: swipes_data,
        swipes_info: swipes_info,
      };
    }
    return {
      message_id: message_id,
      name: message.name,
      role: message_role as 'system' | 'assistant' | 'user',
      is_hidden: message.is_system,
      message: message.mes ?? '',
      data: data,
      extra: extra,

      // for compatibility
      swipe_id: swipe_id,
      swipes: swipes,
      swipes_data: swipes_data,
    };
  };

  const chat_messages: (ChatMessage | ChatMessageSwiped)[] = _.range(start, end + 1)
    .map(i => process_message(i))
    .filter(chat_message => chat_message !== null);

  return klona(chat_messages);
}

type SetChatMessagesOption = {
  refresh?: 'none' | 'affected' | 'all';
};

export async function setChatMessages(
  chat_messages: Array<{ message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>)>,
  { refresh = 'affected' }: SetChatMessagesOption = {},
): Promise<void> {
  const convert_and_merge_messages = (
    data: Array<{ message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>)>,
  ): any => {
    return _(data)
      .map(chat_message => ({
        ...chat_message,
        message_id: normalizeMessageId(chat_message.message_id),
      }))
      .sortBy('message_id')
      .groupBy('message_id')
      .map(messages => {
        return messages.reduce((result, current) => ({ ...result, ...current }), {});
      })
      .value();
  };

  const is_chat_message = (
    chat_message: { message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>),
  ): chat_message is { message_id: number } & Partial<ChatMessage> => {
    return _.has(chat_message, 'message') || _.has(chat_message, 'data');
  };

  const modify = async (chat_message: { message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>)) => {
    const data = chat[chat_message.message_id];
    if (data === undefined) {
      return;
    }

    // 与提示词模板的兼容性
    if (_.isPlainObject(data?.variables)) {
      _.set(
        data,
        'variables',
        _.range(0, data.swipes?.length ?? 1).map(i => data.variables[i] ?? {}),
      );
    }

    if (chat_message?.name !== undefined) {
      _.set(data, 'name', chat_message.name);
    }
    if (chat_message?.role !== undefined) {
      _.set(data, 'is_user', chat_message.role === 'user');
      if (chat_message.role === 'system') {
        _.set(data, 'extra.type', system_message_types.NARRATOR);
      } else {
        _.unset(data, 'extra.type');
      }
    }
    if (chat_message?.is_hidden !== undefined) {
      _.set(data, 'is_system', chat_message.is_hidden);
    }

    if (is_chat_message(chat_message)) {
      if (chat_message?.message !== undefined) {
        _.set(data, 'mes', chat_message.message);
        if (data?.swipes !== undefined) {
          _.set(data, ['swipes', data.swipe_id], chat_message.message);
        }
      }
      if (chat_message?.data !== undefined) {
        if (data?.variables === undefined) {
          _.set(data, 'variables', _.times(data.swipes?.length ?? 1, _.constant({})));
        }
        _.set(data, ['variables', data.swipe_id ?? 0], chat_message.data);
      }
      if (chat_message?.extra !== undefined) {
        if (data?.swipes_info === undefined) {
          _.set(data, 'swipe_info', _.times(data.swipes?.length ?? 1, _.constant({})));
        }
        _.set(data, 'extra', chat_message?.extra);
        _.set(data, ['swipe_info', data.swipe_id ?? 0], chat_message?.extra);
      }
    } else if (
      chat_message?.swipe_id !== undefined ||
      chat_message?.swipes !== undefined ||
      chat_message?.swipes_data !== undefined ||
      chat_message?.swipes_info !== undefined
    ) {
      const max_length =
        _.max([chat_message.swipes?.length, chat_message.swipes_data?.length, chat_message.swipes_info?.length]) ??
        data.swipes?.length ??
        1;
      _.set(chat_message, 'swipe_id', _.clamp(chat_message.swipe_id ?? data.swipe_id ?? 0, 0, max_length - 1));
      _.set(chat_message, 'swipes', chat_message.swipes ?? data.swipes ?? [data.mes]);
      _.set(chat_message, 'swipes_data', chat_message.swipes_data ?? data.variables ?? [{}]);
      _.set(chat_message, 'swipes_info', chat_message.swipes_info ?? data.swipe_info ?? [{}]);
      chat_message.swipes = _.range(0, max_length).map(i => chat_message.swipes?.[i] ?? '');
      chat_message.swipes_data = _.range(0, max_length).map(i => chat_message.swipes_data?.[i] ?? {});
      chat_message.swipes_info = _.range(0, max_length).map(i => chat_message.swipes_info?.[i] ?? {});

      _.set(data, 'swipes', chat_message.swipes);
      _.set(data, 'variables', chat_message.swipes_data);
      _.set(data, 'swipe_info', chat_message.swipes_info);
      _.set(data, 'swipe_id', chat_message.swipe_id);
      _.set(data, 'mes', chat_message.swipes[chat_message.swipe_id as number]);
      _.set(data, 'extra', chat_message.swipes_info[chat_message.swipe_id as number]);
    }
  };

  const render = async (message_id: number) => {
    const $mes_html = $(`#chat > .mes[mesid = "${message_id}"]`);
    if (!$mes_html) {
      return;
    }

    const chat_message = chat[message_id];
    if (chat_message.swipes) {
      $mes_html.find('.swipes-counter').text(`${chat_message.swipe_id + 1}\u200b/\u200b${chat_message.swipes.length}`);
      if (message_id === chat.length - 1) {
        showSwipeButtons();
      }
    }
    $mes_html
      .find('.mes_text')
      .empty()
      .append(
        messageFormatting(
          chat_message.mes,
          chat_message.name,
          chat_message.is_system,
          chat_message.is_user,
          message_id,
        ),
      );
    $mes_html.find('pre code').each((_index, element) => {
      highlight_code(element);
    });
    await eventSource.emit(
      chat_message.is_user ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
      message_id,
    );
  };

  chat_messages = convert_and_merge_messages(chat_messages);
  await Promise.all(chat_messages.map(modify));
  if (refresh === 'all') {
    await saveChatConditional();
    await reloadCurrentChat();
  } else {
    saveChatConditionalDebounced();
    if (refresh === 'affected') {
      await Promise.all(chat_messages.map(message => render(message.message_id)));
    }
  }
}

type ChatMessageCreating = {
  name?: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden?: boolean;
  message: string;
  data?: Record<string, any>;
  extra?: Record<string, any>;
};

type CreateChatMessagesOption = {
  insert_at?: number | 'end';
  refresh?: 'none' | 'affected' | 'all';
};

export async function createChatMessages(
  chat_messages: ChatMessageCreating[],
  { insert_at = 'end', refresh = 'affected' }: CreateChatMessagesOption = {},
): Promise<void> {
  if (insert_at !== 'end') {
    insert_at = _.clamp(insert_at, -chat.length, chat.length - 1);
  }

  const convert = async (chat_message: ChatMessageCreating): Promise<Record<string, any>> => {
    let result = _({});

    if (chat_message?.name !== undefined) {
      result = result.set('name', chat_message.name);
    } else if (chat_message.role === 'system') {
      result = result.set('name', 'system');
    } else if (chat_message.role === 'user') {
      result = result.set('name', name1);
    } else {
      result = result.set('name', name2);
    }

    result = result.set('is_user', chat_message.role === 'user');
    if (chat_message.role === 'system') {
      result = result.set('extra.type', system_message_types.NARRATOR);
    }
    result = result.set('is_system', chat_message.is_hidden ?? false);
    result = result.set('mes', chat_message.message);
    if (chat_message.data) {
      result = result.set(['variables', 0], chat_message.data);
    }
    if (chat_message.extra) {
      result = result.set('extra', chat_message.extra);
    }
    return result.value();
  };

  const converted = await Promise.all(chat_messages.map(convert));
  if (insert_at === 'end') {
    chat.push(...converted);
  } else {
    chat.splice(insert_at, 0, ...converted);
  }
  if (refresh === 'affected' && insert_at === 'end') {
    saveChatConditionalDebounced();
    converted.forEach(message => addOneMessage(message));
    converted.forEach(async (message, index) => {
      await eventSource.emit(
        message.is_user ? event_types.MESSAGE_SENT : event_types.MESSAGE_RECEIVED,
        chat.length - converted.length + index,
      );
      await eventSource.emit(
        message.is_user ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
        chat.length - converted.length + index,
      );
    });
  } else if (refresh !== 'none') {
    await saveChatConditional();
    await reloadCurrentChat();
  } else {
    saveChatConditionalDebounced();
  }
}

type DeleteChatMessagesOption = {
  refresh?: 'none' | 'all';
};

export async function deleteChatMessages(
  message_ids: number[],
  { refresh = 'all' }: DeleteChatMessagesOption = {},
): Promise<void> {
  message_ids = message_ids.filter(inUnnormalizedMessageRange).map(id => normalizeMessageId(id));

  _.pullAt(chat, message_ids);
  if (refresh === 'all') {
    await saveChatConditional();
    await reloadCurrentChat();
  } else {
    saveChatConditionalDebounced();
  }
}

type RotateChatMessagesOption = {
  refresh?: 'none' | 'all';
};

export async function rotateChatMessages(
  begin: number,
  middle: number,
  end: number,
  { refresh = 'all' }: RotateChatMessagesOption = {},
): Promise<void> {
  const right_part = chat.splice(middle, end - middle);
  chat.splice(begin, 0, ...right_part);
  if (refresh === 'all') {
    await saveChatConditional();
    await reloadCurrentChat();
  } else {
    saveChatConditionalDebounced();
  }
}

//----------------------------------------------------------------------------------------------------------------------
/** @deprecated 请使用 `setChatMessages` 代替 */
export async function setChatMessage(
  field_values: { message?: string; data?: Record<string, any> },
  message_id: number,
  {
    swipe_id = 'current',
    refresh = 'display_and_render_current',
  }: {
    swipe_id?: 'current' | number;
    refresh?: 'none' | 'display_current' | 'display_and_render_current' | 'all';
  } = {},
): Promise<void> {
  field_values = typeof field_values === 'string' ? { message: field_values } : field_values;
  if (typeof swipe_id !== 'number' && swipe_id !== 'current') {
    throw Error(`提供的 swipe_id 无效, 请提供 'current' 或序号, 你提供的是: ${swipe_id} `);
  }
  if (!['none', 'display_current', 'display_and_render_current', 'all'].includes(refresh)) {
    throw Error(
      `提供的 refresh 无效, 请提供 'none', 'display_current', 'display_and_render_current' 或 'all', 你提供的是: ${refresh} `,
    );
  }

  const chat_message = chat.at(message_id);
  if (!chat_message) {
    return;
  }

  const add_swipes_if_required = (): boolean => {
    if (swipe_id === 'current') {
      return false;
    }

    // swipe_id 对应的消息页存在
    if (swipe_id == 0 || (chat_message.swipes && swipe_id < chat_message.swipes.length)) {
      return true;
    }

    if (!chat_message.swipes) {
      chat_message.swipe_id = 0;
      chat_message.swipes = [chat_message.mes];
      chat_message.variables = [{}];
    }
    for (let i = chat_message.swipes.length; i <= swipe_id; ++i) {
      chat_message.swipes.push('');
      chat_message.variables.push({});
    }
    return true;
  };

  const swipe_id_previous_index: number = chat_message.swipe_id ?? 0;
  const swipe_id_to_set_index: number = swipe_id == 'current' ? swipe_id_previous_index : swipe_id;
  const swipe_id_to_use_index: number = refresh != 'none' ? swipe_id_to_set_index : swipe_id_previous_index;
  const message: string =
    field_values.message ??
    (chat_message.swipes ? chat_message.swipes[swipe_id_to_set_index] : undefined) ??
    chat_message.mes;

  const update_chat_message = () => {
    const message_demacroed = substituteParamsExtended(message);

    if (field_values.data) {
      if (!chat_message.variables) {
        chat_message.variables = [];
      }
      chat_message.variables[swipe_id_to_set_index] = field_values.data;
    }

    if (chat_message.swipes) {
      chat_message.swipes[swipe_id_to_set_index] = message_demacroed;
      chat_message.swipe_id = swipe_id_to_use_index;
    }

    if (swipe_id_to_use_index === swipe_id_to_set_index) {
      chat_message.mes = message_demacroed;
    }
  };

  const update_partial_html = async (should_update_swipe: boolean) => {
    const mes_html = $(`#chat > .mes[mesid = "${message_id}"]`);
    if (!mes_html) {
      return;
    }

    if (should_update_swipe && chat_message.swipes) {
      mes_html.find('.swipes-counter').text(`${swipe_id_to_use_index + 1}\u200b/\u200b${chat_message.swipes.length}`);
      if (message_id === chat.length - 1) {
        showSwipeButtons();
      }
    }
    if (refresh != 'none') {
      mes_html
        .find('.mes_text')
        .empty()
        .append(
          messageFormatting(message, chat_message.name, chat_message.is_system, chat_message.is_user, message_id),
        );
      if (refresh === 'display_and_render_current') {
        await eventSource.emit(
          chat_message.is_user ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
          message_id,
        );
      }
    }
  };

  const should_update_swipe: boolean = add_swipes_if_required();
  update_chat_message();
  await saveChatConditional();
  if (refresh == 'all') {
    await reloadCurrentChat();
  } else {
    await update_partial_html(should_update_swipe);
  }
}
