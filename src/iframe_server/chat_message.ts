import { chat, messageFormatting, reloadCurrentChat, saveChatConditional, substituteParamsExtended, system_message_types } from "../../../../../../script.js";
import { stringToRange } from "../../../../../utils.js";
import { handlePartialRender } from "../index.js";

export { handleChatMessage }

interface IframeGetChatMessagesMessage {
  request: 'iframe_get_chat_messages';
  uid: number;
  range: string;
  option: Required<GetChatMessagesOption>;
}

interface IframeSetChatMessageMessage {
  request: 'iframe_set_chat_message';
  message: string;
  message_id: number;
  option: Required<SetChatMessagesOption>;
}

type IframeChatMessageMessage = IframeGetChatMessagesMessage | IframeSetChatMessageMessage;

// TODO: don't repeat this in all files
function getIframeName(event: MessageEvent<IframeChatMessageMessage>): string {
  const window = event.source as Window;
  return window.frameElement?.id as string;
}

const event_handlers = {
  iframe_get_chat_messages: async (event: MessageEvent<IframeGetChatMessagesMessage>): Promise<void> => {
    const iframe_name = getIframeName(event);

    const range_demacroed = substituteParamsExtended(event.data.range);
    const range = stringToRange(range_demacroed, 0, chat.length - 1);
    if (!range) {
      console.warn(`[Chat Message][getChatMessages](${iframe_name}) 提供的消息范围无效: ${range_demacroed}`)
      return;
    }

    const uid = event.data.uid;
    const option = event.data.option;
    const { start, end } = range;

    const fileter_by_role = (chat_message: any) => {
      if (option.role === 'all') {
        return true;
      }

      const is_narrator = chat_message.extra?.type === system_message_types.NARRATOR;
      if (option.role === 'system') {
        return is_narrator && !chat_message.is_user;
      }
      if (option.role === 'assistant') {
        return !is_narrator && !chat_message.is_user;
      }
      if (option.role === 'user') {
        return !is_narrator && chat_message.is_user;
      }
      throw new Error(`[Chat Message][getChatMessages](${iframe_name}) 提供的 role 无效, 请提供 'all', 'system', 'assistant' 或 'user'. 你提供的是: ${option.role}`);
    };

    const process_message = async (message_id: number): Promise<ChatMessage | null> => {
      const chat_message = chat[message_id];
      if (!chat_message) {
        console.warn(`[Chat Message][getChatMessages](${iframe_name}) 没找到第 ${message_id} 楼的消息`);
        return null;
      }

      if (option.role && !fileter_by_role(chat_message)) {
        console.debug(`[Chat Message][getChatMessages](${iframe_name}) 筛去了第 ${message_id} 楼的消息因为它的身份不是 ${option.role}`);
        return null;
      }

      if (!option.hidden && chat_message.is_system) {
        console.debug(`[Chat Message][getChatMessages](${iframe_name}) 筛去了第 ${message_id} 楼的消息因为它是系统消息或被隐藏`);
        return null;
      }

      return {
        message_id: message_id,
        name: chat_message.name,
        is_user: chat_message.is_user,
        is_system_or_hidden: chat_message.is_system,
        message: chat_message.mes,
        swipe_id: option.swipe ? (chat_message.swipe_id ?? 0) : undefined,
        swipes: option.swipe ? (chat_message.swipes ?? [chat_message.mes]) : undefined,
      };
    };

    const promises: Promise<ChatMessage | null>[] = [];
    for (let i: number = range.start; i <= range.end; ++i) {
      promises.push(process_message(i));
    }

    const chat_messages: ChatMessage[] = (await Promise.all(promises)).filter((chat_message) => chat_message !== null);

    (event.source as MessageEventSource).postMessage({
      request: 'iframe_get_chat_messages_callback',
      uid: uid,
      result: chat_messages,
    },
      { targetOrigin: "*" }
    );

    console.info(`[Chat Message][getChatMessages](${iframe_name}) 获取${start == end ? `第 ${start} ` : ` ${start}-${end} `}楼的消息, 选项: ${JSON.stringify(option)}`);
  },

  iframe_set_chat_message: async (event: MessageEvent<IframeSetChatMessageMessage>): Promise<void> => {
    const iframe_name = getIframeName(event);

    const message = event.data.message;
    const message_id = event.data.message_id;
    const option = event.data.option;
    if (option.swipe_id !== 'current' && typeof option.swipe_id !== 'number') {
      throw Error(`[Chat Message][setChatMessage](${iframe_name}) 提供的 swipe_id 无效, 请提供 'current' 或序号, 你提供的是: ${option.swipe_id}`)
    }
    if (!['none', 'display_current', 'display_and_render_current', 'all'].includes(option.refresh)) {
      throw Error(`[Chat Message][setChatMessage](${iframe_name}) 提供的 refresh 无效, 请提供 'none', 'display_current', 'display_and_render_current' 或 'all', 你提供的是: ${option.refresh}`)
    }

    const chat_message = chat[message_id];
    if (!chat_message) {
      console.warn(`[Chat Message][setChatMessage](${iframe_name}) 未找到第 ${message_id} 楼的消息`);
      return;
    }

    const add_swipes_if_required = (): boolean => {
      if (option.swipe_id === 'current') {
        return false;
      }

      // swipe_id 存在对应的消息页存在
      if (option.swipe_id == 0 || (chat_message.swipes && option.swipe_id < chat_message.swipes.length)) {
        return false;
      }

      if (!chat_message.swipes) {
        chat_message.swipe_id = 0;
        chat_message.swipes = [chat_message.mes];
        chat_message.swipe_info = [{}];
      }
      for (let i = chat_message.length; i <= option.swipe_id; ++i) {
        chat_message.swipes.push('');
        chat_message.swipe_info.push({});
      }
      return true;
    };

    const swipe_id_previous_index: number = chat_message.swipe_id ?? 0;
    const swipe_id_to_set_index: number = option.swipe_id == 'current' ? swipe_id_previous_index : option.swipe_id;
    const swipe_id_to_use_index: number = option.refresh != 'none' ? swipe_id_to_set_index : swipe_id_previous_index;

    const update_chat_message = () => {
      const message_demacroed = substituteParamsExtended(event.data.message);

      if (chat_message.swipes) {
        chat_message.swipes[swipe_id_to_set_index] = message_demacroed;
        chat_message.swipe_id = swipe_id_to_use_index;
      }

      if (swipe_id_to_use_index == swipe_id_to_set_index) {
        chat_message.mes = message_demacroed;
      }
    };

    const update_partial_html = (should_update_swipe: boolean) => {
      const mes_html = $(`div.mes[mesid="${message_id}"]`);
      if (!mes_html) {
        return;
      }

      if (should_update_swipe) {
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

    console.info(`[Chat Message][setChatMessage](${iframe_name}) 设置第 ${message_id} 楼消息, 选项: ${JSON.stringify(option)}, 设置前使用的消息页: ${swipe_id_previous_index}, 设置的消息页: ${swipe_id_to_set_index}, 现在使用的消息页: ${swipe_id_to_use_index}`);
  },
};

async function handleChatMessage(event: MessageEvent<IframeChatMessageMessage>): Promise<void> {
  if (!event.data) return;

  try {
    const handler = event_handlers[event.data.request];
    if (handler) {
      handler(event as any);
    }
  } catch (error) {
    console.error(`[Chat Message](${getIframeName(event)}) ${error}`);
    throw error;
  }
}
