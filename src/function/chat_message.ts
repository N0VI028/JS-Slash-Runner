import { handlePartialRender } from '@/component/message_iframe';

import {
  chat,
  messageFormatting,
  reloadCurrentChat,
  saveChatConditional,
  substituteParamsExtended,
  system_message_types,
} from '@sillytavern/script';
import { stringToRange } from '@sillytavern/scripts/utils';

interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;

  swipe_id: number; // 当前被使用的消息页页号
  message: string; // 当前被使用的消息页文本
  data: Record<string, any>; // 当前被使用的消息页所绑定的数据

  swipes: string[];
  swipes_data: Record<string, any>[];

  is_user: boolean;
  is_system_or_hidden: boolean;
}

interface GetChatMessagesOption {
  role?: 'all' | 'system' | 'assistant' | 'user'; // 按 role 筛选消息; 默认为 `'all'`
  hide_state?: 'all' | 'hidden' | 'unhidden'; // 按是否被隐藏筛选消息; 默认为 `'all'`
}

interface ChatMessageToSet {
  message?: string;
  data?: Record<string, any>;
}

interface SetChatMessageOption {
  /**
   * 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
   */
  swipe_id?: 'current' | number;

  /**
   * 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
   * - `'none'`: 不更新页面的显示和 iframe 渲染
   * - `'display_current'`: 仅更新当前被替换楼层的显示, 如果替换的是没被使用的消息页, 则会自动切换为使用那一页
   * - `'display_and_render_current'`: 与 `display_current` 相同, 但还会重新渲染该楼的 iframe
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载全局脚本和楼层消息
   */
  refresh?: 'none' | 'display_current' | 'display_and_render_current' | 'all';
}

/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 与 `/messages` 相同
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是每楼的消息 `ChatMessage`. 该数组依据按 message_id 从低到高排序.
 */
export async function getChatMessages(
  range: string | number,
  option: GetChatMessagesOption = { role: 'all', hide_state: 'all' },
): Promise<ChatMessage[]> {
  const { role = 'all', hide_state = 'all' } = option;
  const range_demacroed = substituteParamsExtended(range.toString());
  const rangeNumber = stringToRange(range_demacroed, 0, chat.length - 1);
  if (!rangeNumber) {
    throw Error(`提供的消息范围 range 无效: ${range}`);
  }
  if (!['all', 'system', 'assistant', 'user'].includes(role)) {
    throw Error(`提供的 role 无效, 请提供 'all', 'system', 'assistant' 或 'user', 你提供的是: ${role}`);
  }
  if (!['all', 'hidden', 'unhidden'].includes(hide_state)) {
    throw Error(`提供的 hide_state 无效, 请提供 'all', 'hidden' 或 'unhidden', 你提供的是: ${hide_state}`);
  }

  const { start, end } = rangeNumber;

  const getRole = (chat_message: any) => {
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

  const process_message = async (message_id: number): Promise<ChatMessage | null> => {
    const message = chat[message_id];
    if (!message) {
      console.warn(`没找到第 ${message_id} 楼的消息`);
      return null;
    }

    const messageRole = getRole(message);
    if (role !== 'all' && messageRole !== role) {
      console.debug(`筛去了第 ${message_id} 楼的消息因为它的身份不是 ${role}`);
      return null;
    }

    if (hide_state !== 'all' && (hide_state === 'hidden') !== message.is_system) {
      console.debug(`筛去了第 ${message_id} 楼的消息因为它${hide_state === 'hidden' ? `` : `没`} 被隐藏`);
      return null;
    }

    const swipe_id = message?.swipe_id ?? 0;
    const swipes = message?.swipes ?? [message.mes];
    const swipes_data = message?.variables ?? [];
    const data = swipes_data[swipe_id] ?? {};

    return {
      message_id: message_id,
      name: message.name,
      role: role as 'system' | 'assistant' | 'user',
      is_hidden: message.is_system,
      message: message.mes,
      data: data,

      swipe_id: swipe_id,
      swipes: swipes,
      swipes_data: swipes_data,

      is_user: message.is_user,
      is_system_or_hidden: message.is_system,
    };
  };

  const promises: Promise<ChatMessage | null>[] = [];
  for (let i: number = start; i <= end; ++i) {
    promises.push(process_message(i));
  }

  const chat_messages: ChatMessage[] = (await Promise.all(promises)).filter(chat_message => chat_message !== null);

  console.info(
    `获取${start == end ? `第 ${start} ` : ` ${start}-${end} `}楼的消息, 选项: ${JSON.stringify({
      role,
      hide_state,
    })} `,
  );
  return chat_messages;
}

/**
 * 设置某消息楼层某聊天消息页的信息. 如果设置了当前会被发送给 ai 的消息文本 (正被使用且没被隐藏的消息页文本), 则 "仅格式提示词" 正则将会使用它而不是原来的消息.
 *
 * @param field_values 要设置的信息
 *   - message?: 消息页要设置的消息文本
 *   - data?: 消息页要绑定的数据
 * @param message_id 消息楼层id
 * @param option 可选选项:
 *   - `swipe_id?:'current'|number`: 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
 *   - `refresh?:'none'|'display_current'|'display_and_render_current'|'all'`: 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
 */
export async function setChatMessage(
  field_values: ChatMessageToSet,
  message_id: number,
  option: SetChatMessageOption = { swipe_id: 'current', refresh: 'display_and_render_current' },
): Promise<void> {
  const { swipe_id = 'current', refresh = 'display_and_render_current' } = option;
  field_values = typeof field_values === 'string' ? { message: field_values } : field_values;
  if (typeof swipe_id !== 'number' && swipe_id !== 'current') {
    throw Error(`提供的 swipe_id 无效, 请提供 'current' 或序号, 你提供的是: ${swipe_id} `);
  }
  if (!['none', 'display_current', 'display_and_render_current', 'all'].includes(refresh)) {
    throw Error(
      `提供的 refresh 无效, 请提供 'none', 'display_current', 'display_and_render_current' 或 'all', 你提供的是: ${refresh} `,
    );
  }

  const chat_message = chat[message_id];
  if (!chat_message) {
    console.warn(`未找到第 ${message_id} 楼的消息`);
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
      chat_message.swipe_info = [{}];
    }
    for (let i = chat_message.swipes.length; i <= swipe_id; ++i) {
      chat_message.swipes.push('');
      chat_message.swipe_info.push({});
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

  const update_partial_html = (should_update_swipe: boolean) => {
    // @ts-ignore
    const mes_html = $(`div.mes[mesid = "${message_id}"]`);
    if (!mes_html) {
      return;
    }

    if (should_update_swipe) {
      // FIXME: 只有一条消息时, swipes-counter 不会正常显示; 此外还要考虑 swipes-counter 的 "Swipe # for All Messages" 选项
      mes_html.find('.swipes-counter').text(`${swipe_id_to_use_index + 1}\u200b/\u200b${chat_message.swipes.length}`);
    }
    if (refresh != 'none') {
      mes_html
        .find('.mes_text')
        .empty()
        .append(
          messageFormatting(message, chat_message.name, chat_message.is_system, chat_message.is_user, message_id),
        );
      if (refresh == 'display_and_render_current') {
        handlePartialRender(message_id);
      }
    }
  };

  const should_update_swipe: boolean = add_swipes_if_required();
  update_chat_message();
  if (refresh == 'all') {
    await reloadCurrentChat();
  } else {
    update_partial_html(should_update_swipe);
    // QUESTION: saveChatDebounced 还是 await saveChatConditional?
    await saveChatConditional();
  }

  console.info(
    `设置第 ${message_id} 楼消息, 选项: ${JSON.stringify({ swipe_id, refresh })}, 设置前使用的消息页: ${swipe_id_previous_index}, 设置的消息页: ${swipe_id_to_set_index}, 现在使用的消息页: ${swipe_id_to_use_index} `,
  );
}
