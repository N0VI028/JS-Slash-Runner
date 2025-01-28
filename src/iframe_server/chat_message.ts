import { chat, messageFormatting, reloadCurrentChat, saveChatConditional, substituteParamsExtended, system_message_types } from "../../../../../../script.js";
import { stringToRange } from "../../../../../utils.js";
import { handlePartialRender } from "../index.js";
import { getLogPrefix, IframeMessage, registerIframeHandler } from "./index.js";

interface IframeGetChatMessages extends IframeMessage {
  request: '[ChatMessage][getChatMessages]';
  range: string;
  option: Required<GetChatMessagesOption>;
}

interface IframeSetChatMessage extends IframeMessage {
  request: '[ChatMessage][setChatMessage]';
  field_values: ChatMessageToSet;
  message_id: number;
  option: Required<SetChatMessageOption>;
}

export function registerIframeChatMessageHandler() {
  registerIframeHandler(
    '[ChatMessage][getChatMessages]',
    async (event: MessageEvent<IframeGetChatMessages>): Promise<ChatMessage[]> => {
      const range_demacroed = substituteParamsExtended(event.data.range);
      const range = stringToRange(range_demacroed, 0, chat.length - 1);
      const option = event.data.option;
      if (!range) {
        throw Error(`${getLogPrefix(event)}提供的消息范围 range 无效: ${range_demacroed}`);
      }
      if (!['all', 'system', 'assistant', 'user'].includes(option.role)) {
        throw Error(`${getLogPrefix(event)}提供的 role 无效, 请提供 'all', 'system', 'assistant' 或 'user', 你提供的是: ${option.role}`);
      }
      if (!['all', 'hidden', 'unhidden'].includes(option.hide_state)) {
        throw Error(`${getLogPrefix(event)}提供的 hide_state 无效, 请提供 'all', 'hidden' 或 'unhidden', 你提供的是: ${option.hide_state}`);
      }

      const { start, end } = range;

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
        const chat_message = chat[message_id];
        if (!chat_message) {
          console.warn(`${getLogPrefix(event)}没找到第 ${message_id} 楼的消息`);
          return null;
        }

        const role = getRole(chat_message);
        if (option.role !== 'all' && role !== option.role) {
          console.debug(`${getLogPrefix(event)}筛去了第 ${message_id} 楼的消息因为它的身份不是 ${option.role}`);
          return null;
        }

        if (option.hide_state !== 'all' && ((option.hide_state === 'hidden') !== chat_message.is_system)) {
          console.debug(`${getLogPrefix(event)}筛去了第 ${message_id} 楼的消息因为它${option.hide_state === 'hidden' ? `` : `没`} 被隐藏`);
          return null;
        }

        const data = chat_message?.data ?? {};
        const swipe_id = chat_message?.swipe_id ?? 0;
        const swipes = chat_message?.swipes ?? [chat_message.mes];
        const swipes_data = chat_message?.swipe_info?.map((info: any) => info?.data) ?? [data];

        return {
          message_id: message_id,
          name: chat_message.name,
          role: role as ('system' | 'assistant' | 'user'),
          is_hidden: chat_message.is_system,
          message: chat_message.mes,
          data: data,

          swipe_id: swipe_id,
          swipes: swipes,
          swipes_data: swipes_data,

          is_user: chat_message.is_user,
          is_system_or_hidden: chat_message.is_system,
        };
      };

      const promises: Promise<ChatMessage | null>[] = [];
      for (let i: number = range.start; i <= range.end; ++i) {
        promises.push(process_message(i));
      }

      const chat_messages: ChatMessage[] = (await Promise.all(promises)).filter((chat_message) => chat_message !== null);

      console.info(`${getLogPrefix(event)}获取${start == end ? `第 ${start} ` : ` ${start}-${end} `}楼的消息, 选项: ${JSON.stringify(option)} `);
      return chat_messages;
    },
  );

  registerIframeHandler(
    '[ChatMessage][setChatMessage]',
    async (event: MessageEvent<IframeSetChatMessage>): Promise<void> => {
      const field_values = event.data.field_values;
      const message_id = event.data.message_id;
      const option = event.data.option;
      if (typeof option.swipe_id !== 'number' && option.swipe_id !== 'current') {
        throw Error(`${getLogPrefix(event)}提供的 swipe_id 无效, 请提供 'current' 或序号, 你提供的是: ${option.swipe_id} `)
      }
      if (!['none', 'display_current', 'display_and_render_current', 'all'].includes(option.refresh)) {
        throw Error(`${getLogPrefix(event)}提供的 refresh 无效, 请提供 'none', 'display_current', 'display_and_render_current' 或 'all', 你提供的是: ${option.refresh} `)
      }

      const chat_message = chat[message_id];
      if (!chat_message) {
        console.warn(`${getLogPrefix(event)}未找到第 ${message_id} 楼的消息`);
        return;
      }

      const add_swipes_if_required = (): boolean => {
        if (option.swipe_id === 'current') {
          return false;
        }

        // swipe_id 对应的消息页存在
        if (option.swipe_id == 0 || (chat_message.swipes && option.swipe_id < chat_message.swipes.length)) {
          return false;
        }

        if (!chat_message.swipes) {
          chat_message.swipe_id = 0;
          chat_message.swipes = [chat_message.mes];
          chat_message.swipe_info = [{}];
        }
        for (let i = chat_message.swipes.length; i <= option.swipe_id; ++i) {
          chat_message.swipes.push('');
          chat_message.swipe_info.push({});
        }
        return true;
      };

      const swipe_id_previous_index: number = chat_message.swipe_id ?? 0;
      const swipe_id_to_set_index: number = option.swipe_id == 'current' ? swipe_id_previous_index : option.swipe_id;
      const swipe_id_to_use_index: number = option.refresh != 'none' ? swipe_id_to_set_index : swipe_id_previous_index;
      const message: string = field_values.message ?? chat_message.swipes[swipe_id_to_set_index] ?? chat_message.mes;

      const update_chat_message = () => {
        const message_demacroed = substituteParamsExtended(message);

        if (chat_message.swipes) {
          chat_message.swipes[swipe_id_to_set_index] = message_demacroed;
          if (field_values.data) {
            const swipe_info = chat_message.swipe_info[swipe_id_to_set_index];
            Object.assign(swipe_info, { data: field_values.data });
          }
          chat_message.swipe_id = swipe_id_to_use_index;
        }

        if (swipe_id_to_use_index === swipe_id_to_set_index) {
          if (field_values.data) {
            chat_message.data = field_values.data;
          }
          chat_message.mes = message_demacroed;
        }
      };

      const update_partial_html = (should_update_swipe: boolean) => {
        const mes_html = $(`div.mes[mesid = "${message_id}"]`);
        if (!mes_html) {
          return;
        }

        if (should_update_swipe) {
          // FIXME: 只有一条消息时, swipes-counter 不会正常显示; 此外还要考虑 swipes-counter 的 "Swipe # for All Messages" 选项
          mes_html
            .find('.swipes-counter')
            .text(`${swipe_id_to_use_index + 1}\u200b/\u200b${chat_message.swipes.length}`);
        }
        if (option.refresh != 'none') {
          mes_html.find('.mes_text')
            .empty()
            .append(messageFormatting(message, chat_message.name, chat_message.is_system, chat_message.is_user, message_id));
          if (option.refresh == 'display_and_render_current') {
            handlePartialRender(message_id);
          }
        }
      }

      const should_update_swipe: boolean = add_swipes_if_required();
      update_chat_message();
      if (option.refresh == 'all') {
        await reloadCurrentChat();
      } else {
        update_partial_html(should_update_swipe);
        // QUESTION: saveChatDebounced 还是 await saveChatConditional?
        await saveChatConditional();
      }

      console.info(`${getLogPrefix(event)}设置第 ${message_id} 楼消息, 选项: ${JSON.stringify(option)}, 设置前使用的消息页: ${swipe_id_previous_index}, 设置的消息页: ${swipe_id_to_set_index}, 现在使用的消息页: ${swipe_id_to_use_index} `);
    },
  );
}
