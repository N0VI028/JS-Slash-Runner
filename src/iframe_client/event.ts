type EventType = IframeEventType | TavernEventType | string;

function eventOn<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  if (detail.try_get_wrapper(listener, event_type)) {
    log.warn(
      `[Event][eventOn] 函数已经在监听 '${event_type}' 事件, 调用无效\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
    return;
  }
  SillyTavern.eventSource.on(event_type, detail.get_or_make_wrapper(listener, event_type, false));
  log.info(
    `[Event][eventOn] 函数开始监听 '${event_type}' 事件并将随事件触发\n\n  ${detail.format_function_to_string(
      listener,
    )}`,
  );
}

function eventOnButton<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  const script_id = getScriptId();
  if (detail.try_get_wrapper(listener, event_type)) {
    log.warn(
      `[Event][eventOnButton](id为${String(
        script_id,
      )}) 的脚本已经在监听 '${event_type}' 事件, 调用无效\n\n  ${detail.format_function_to_string(listener)}`,
    );
    return;
  }
  const event_type_with_script_id = `${String(script_id)}_${event_type}`;
  SillyTavern.eventSource.on(
    event_type_with_script_id,
    detail.get_or_make_wrapper(listener, event_type_with_script_id, false),
  );
  log.info(
    `[Event][eventOnButton](script_id为${String(
      script_id,
    )}) 函数开始监听 '${event_type}' 事件并将随事件触发\n\n  ${detail.format_function_to_string(listener)}`,
  );
}

function eventMakeLast<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  const is_listening = detail.try_get_wrapper(listener, event_type) !== undefined;
  SillyTavern.eventSource.makeLast(event_type, detail.get_or_make_wrapper(listener, event_type, false));
  if (is_listening) {
    log.info(
      `[Event][eventMakeLast](${getIframeName()}) 函数调整为监听到 '${event_type}' 事件时最后触发\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
  } else {
    log.info(
      `[Event][eventMakeLast](${getIframeName()}) 函数开始监听 '${event_type}' 事件并将随事件最后触发\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
  }
}

function eventMakeFirst<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  const is_listening = detail.try_get_wrapper(listener, event_type) !== undefined;
  SillyTavern.eventSource.makeFirst(event_type, detail.get_or_make_wrapper(listener, event_type, false));
  if (is_listening) {
    log.info(
      `[Event][eventMakeFirst](${getIframeName()}) 函数调整为监听到 '${event_type}' 事件时最先触发\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
  } else {
    log.info(
      `[Event][eventMakeFirst](${getIframeName()}) 函数开始监听 '${event_type}' 事件并将随事件最先触发\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
  }
}

function eventOnce<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  if (detail.try_get_wrapper(listener, event_type)) {
    log.warn(
      `[Event][eventOnce](${getIframeName()}) 函数已经在监听 '${event_type}' 事件, 调用无效\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
    return;
  }
  SillyTavern.eventSource.once(event_type, detail.get_or_make_wrapper(listener, event_type, true));
  log.info(
    `[Event][eventOnce](${getIframeName()}) 函数开始监听下一次 '${event_type}' 事件并仅在该次事件时触发\n\n  ${detail.format_function_to_string(
      listener,
    )}`,
  );
}

async function eventWaitOnce(event_type: EventType): Promise<any | undefined>;
async function eventWaitOnce<T extends EventType>(event_type: T, listener: ListenerType[T]): Promise<any | undefined>;
async function eventWaitOnce<T extends EventType>(event_type: T, listener?: ListenerType[T]): Promise<any | undefined> {
  if (!listener) {
    const do_nothing = () => {};
    eventOnce(event_type, do_nothing);
    return await eventWaitOnce(event_type, do_nothing);
  }

  const entry = `${event_type}#${listener.toString()}`;
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();

    function handleMessage(event: MessageEvent) {
      if (event.data?.request === 'iframe_event_wait_callback' && event.data.uid == uid) {
        window.removeEventListener('message', handleMessage);
        resolve(event.data.result);
        detail.waiting_event_map.deleteEntry(entry, uid);

        log.info(
          `[Event][eventWaitOnce](${getIframeName()}) 等待到函数因 '${event_type}' 事件触发后的执行结果: ${JSON.stringify(
            event.data.result,
          )}\n\n  ${detail.format_function_to_string(listener as ListenerType[T])}`,
        );
      }
    }
    window.addEventListener('message', handleMessage);
    detail.waiting_event_map.put(entry, uid);

    log.info(
      `[Event][eventWaitOnce](${getIframeName()}) 等待函数被 '${event_type}' 事件触发\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
  });
}

async function eventEmit<T extends EventType>(event_type: T, ...data: Parameters<ListenerType[T]>): Promise<void> {
  await SillyTavern.eventSource.emit(event_type, ...data);
  log.info(`[Event][eventEmit](${getIframeName()}) 发送 '${event_type}' 事件, 携带数据: ${JSON.stringify(data)}`);
}

function eventEmitAndWait<T extends EventType>(event_type: T, ...data: Parameters<ListenerType[T]>): void {
  SillyTavern.eventSource.emitAndWait(event_type, ...data);
  log.info(
    `[Event][eventEmitAndWait](${getIframeName()}) 发送 '${event_type}' 事件, 携带数据: ${JSON.stringify(data)}`,
  );
}

function eventRemoveListener<T extends EventType>(event_type: T, listener: ListenerType[T]): void {
  const wrapper = detail.try_get_wrapper(listener, event_type);
  if (!wrapper) {
    log.warn(
      `[Event][eventRemoveListener](${getIframeName()}) 函数没有监听 '${event_type}' 事件, 调用无效\n\n  ${detail.format_function_to_string(
        listener,
      )}`,
    );
    return;
  }
  SillyTavern.eventSource.removeListener(event_type, wrapper);
  detail.remove_wrapper(listener, event_type);
  log.info(
    `[Event][eventRemoveListener](${getIframeName()}) 函数不再监听 '${event_type}' 事件\n\n  ${detail.format_function_to_string(
      listener,
    )}`,
  );
}

function eventClearEvent(event_type: EventType): void {
  detail.listener_event_wrapper_map.forEach((event_wrapper_map, _) => {
    const wrapper = event_wrapper_map.get(event_type);
    if (wrapper) {
      SillyTavern.eventSource.removeListener(event_type, wrapper);
      event_wrapper_map.delete(event_type);
    }
  });

  log.info(`[Event][eventClearEvent](${getIframeName()})所有函数都不再监听 '${event_type}' 事件`);
}

function eventClearListener(listener: Function): void {
  const event_callback_map = detail.extract(detail.listener_event_wrapper_map, listener);
  if (event_callback_map) {
    event_callback_map.forEach((callback, event_type) => {
      SillyTavern.eventSource.removeListener(event_type, callback);
    });
  }

  log.info(
    `[Event][eventClearListener](${getIframeName()}) 函数不再监听任何事件\n\n  ${detail.format_function_to_string(
      listener,
    )}`,
  );
}

function eventClearAll(): void {
  detail.listener_event_wrapper_map.forEach((event_wrapper_map, _) => {
    event_wrapper_map.forEach((wrapper, event_type) => {
      SillyTavern.eventSource.removeListener(event_type, wrapper);
    });
  });
  detail.listener_event_wrapper_map.clear();

  log.info(`[Event][eventClearAll](${getIframeName()}) 取消所有函数对所有事件的监听`);
}

//------------------------------------------------------------------------------------------------------------------------
type IframeEventType = (typeof iframe_events)[keyof typeof iframe_events];

const iframe_events = {
  MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
  GENERATION_STARTED: 'js_generation_started',
  STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully',
  STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally',
  GENERATION_ENDED: 'js_generation_ended',
} as const;

type TavernEventType = (typeof tavern_events)[keyof typeof tavern_events];

const tavern_events = {
  APP_READY: 'app_ready',
  EXTRAS_CONNECTED: 'extras_connected',
  MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
  IMPERSONATE_READY: 'impersonate_ready',
  CHAT_CHANGED: 'chat_id_changed',
  GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
  GENERATION_STARTED: 'generation_started',
  GENERATION_STOPPED: 'generation_stopped',
  GENERATION_ENDED: 'generation_ended',
  EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
  EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
  SETTINGS_LOADED: 'settings_loaded',
  SETTINGS_UPDATED: 'settings_updated',
  GROUP_UPDATED: 'group_updated',
  MOVABLE_PANELS_RESET: 'movable_panels_reset',
  SETTINGS_LOADED_BEFORE: 'settings_loaded_before',
  SETTINGS_LOADED_AFTER: 'settings_loaded_after',
  CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed',
  CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',
  OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before',
  OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',
  OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready',
  OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',
  WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated',
  WORLDINFO_UPDATED: 'worldinfo_updated',
  CHARACTER_EDITED: 'character_edited',
  CHARACTER_PAGE_LOADED: 'character_page_loaded',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE: 'character_group_overlay_state_change_before',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER: 'character_group_overlay_state_change_after',
  USER_MESSAGE_RENDERED: 'user_message_rendered',
  CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
  FORCE_SET_BACKGROUND: 'force_set_background',
  CHAT_DELETED: 'chat_deleted',
  CHAT_CREATED: 'chat_created',
  GROUP_CHAT_DELETED: 'group_chat_deleted',
  GROUP_CHAT_CREATED: 'group_chat_created',
  GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',
  GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
  GENERATE_AFTER_DATA: 'generate_after_data',
  GROUP_MEMBER_DRAFTED: 'group_member_drafted',
  WORLD_INFO_ACTIVATED: 'world_info_activated',
  TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',
  CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
  CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',
  CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
  // TODO: Naming convention is inconsistent with other events
  CHARACTER_DELETED: 'characterDeleted',
  CHARACTER_DUPLICATED: 'character_duplicated',
  STREAM_TOKEN_RECEIVED: 'stream_token_received',
  FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
  WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
  OPEN_CHARACTER_LIBRARY: 'open_character_library',
  ONLINE_STATUS_CHANGED: 'online_status_changed',
  IMAGE_SWIPED: 'image_swiped',
  CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
  TOOL_CALLS_PERFORMED: 'tool_calls_performed',
  TOOL_CALLS_RENDERED: 'tool_calls_rendered',
} as const;

type ListenerType = {
  [iframe_events.MESSAGE_IFRAME_RENDER_STARTED]: (iframe_name: string) => void;
  [iframe_events.MESSAGE_IFRAME_RENDER_ENDED]: (iframe_name: string) => void;
  [iframe_events.GENERATION_STARTED]: () => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_FULLY]: (full_text: string) => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY]: (incremental_text: string) => void;
  [iframe_events.GENERATION_ENDED]: (text: string) => void;

  [tavern_events.APP_READY]: () => void;
  [tavern_events.EXTRAS_CONNECTED]: (modules: any) => void;
  [tavern_events.MESSAGE_SWIPED]: (message_id: number) => void;
  [tavern_events.MESSAGE_SENT]: (message_id: number) => void;
  [tavern_events.MESSAGE_RECEIVED]: (message_id: number) => void;
  [tavern_events.MESSAGE_EDITED]: (message_id: number) => void;
  [tavern_events.MESSAGE_DELETED]: (message_id: number) => void;
  [tavern_events.MESSAGE_UPDATED]: (message_id: number) => void;
  [tavern_events.MESSAGE_FILE_EMBEDDED]: (message_id: number) => void;
  [tavern_events.IMPERSONATE_READY]: (message: string) => void;
  [tavern_events.CHAT_CHANGED]: (chat_file_name: string) => void;
  [tavern_events.GENERATION_AFTER_COMMANDS]: (
    type: string,
    option: {
      automatic_trigger?: boolean;
      force_name2?: boolean;
      quiet_prompt?: string;
      quietToLoud?: boolean;
      skipWIAN?: boolean;
      force_chid?: number;
      signal?: AbortSignal;
      quietImage?: string;
      quietName?: string;
      depth?: number;
    },
    dry_run: boolean,
  ) => void;
  [tavern_events.GENERATION_STARTED]: (
    type: string,
    option: {
      automatic_trigger?: boolean;
      force_name2?: boolean;
      quiet_prompt?: string;
      quietToLoud?: boolean;
      skipWIAN?: boolean;
      force_chid?: number;
      signal?: AbortSignal;
      quietImage?: string;
      quietName?: string;
      depth?: number;
    },
    dry_run: boolean,
  ) => void;
  [tavern_events.GENERATION_STOPPED]: () => void;
  [tavern_events.GENERATION_ENDED]: (message_id: number) => void;
  [tavern_events.EXTENSIONS_FIRST_LOAD]: () => void;
  [tavern_events.EXTENSION_SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_UPDATED]: () => void;
  [tavern_events.GROUP_UPDATED]: () => void;
  [tavern_events.MOVABLE_PANELS_RESET]: () => void;
  [tavern_events.SETTINGS_LOADED_BEFORE]: (settings: Object) => void;
  [tavern_events.SETTINGS_LOADED_AFTER]: (settings: Object) => void;
  [tavern_events.CHATCOMPLETION_SOURCE_CHANGED]: (source: string) => void;
  [tavern_events.CHATCOMPLETION_MODEL_CHANGED]: (model: string) => void;
  [tavern_events.OAI_PRESET_CHANGED_BEFORE]: (result: {
    preset: Object;
    presetName: string;
    settingsToUpdate: Object;
    settings: Object;
    savePreset: Function;
  }) => void;
  [tavern_events.OAI_PRESET_CHANGED_AFTER]: () => void;
  [tavern_events.OAI_PRESET_EXPORT_READY]: (preset: Object) => void;
  [tavern_events.OAI_PRESET_IMPORT_READY]: (result: { data: Object; presetName: string }) => void;
  [tavern_events.WORLDINFO_SETTINGS_UPDATED]: () => void;
  [tavern_events.WORLDINFO_UPDATED]: (name: string, data: { entries: Object[] }) => void;
  [tavern_events.CHARACTER_EDITED]: (result: { detail: { id: string; character: Object } }) => void;
  [tavern_events.CHARACTER_PAGE_LOADED]: () => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE]: (state: number) => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER]: (state: number) => void;
  [tavern_events.USER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.CHARACTER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.FORCE_SET_BACKGROUND]: (background: { url: string; path: string }) => void;
  [tavern_events.CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.CHAT_CREATED]: () => void;
  [tavern_events.GROUP_CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.GROUP_CHAT_CREATED]: () => void;
  [tavern_events.GENERATE_BEFORE_COMBINE_PROMPTS]: () => void;
  [tavern_events.GENERATE_AFTER_COMBINE_PROMPTS]: (result: { prompt: string; dryRun: boolean }) => void;
  [tavern_events.GENERATE_AFTER_DATA]: (generate_data: Object) => void;
  [tavern_events.GROUP_MEMBER_DRAFTED]: (character_id: string) => void;
  [tavern_events.WORLD_INFO_ACTIVATED]: (entries: any[]) => void;
  [tavern_events.TEXT_COMPLETION_SETTINGS_READY]: () => void;
  [tavern_events.CHAT_COMPLETION_SETTINGS_READY]: (generate_data: {
    messages: { role: string; content: string }[];
    model: string;
    temprature: number;
    frequency_penalty: number;
    presence_penalty: number;
    top_p: number;
    max_tokens: number;
    stream: boolean;
    logit_bias: Object;
    stop: string[];
    chat_comletion_source: string;
    n?: number;
    user_name: string;
    char_name: string;
    group_names: string[];
    include_reasoning: boolean;
    reasoning_effort: string;
    [others: string]: any;
  }) => void;
  [tavern_events.CHAT_COMPLETION_PROMPT_READY]: (event_data: {
    chat: { role: string; content: string }[];
    dryRun: boolean;
  }) => void;
  [tavern_events.CHARACTER_FIRST_MESSAGE_SELECTED]: (event_args: {
    input: string;
    output: string;
    character: Object;
  }) => void;
  [tavern_events.CHARACTER_DELETED]: (result: { id: string; character: Object }) => void;
  [tavern_events.CHARACTER_DUPLICATED]: (result: { oldAvatar: string; newAvatar: string }) => void;
  [tavern_events.STREAM_TOKEN_RECEIVED]: (text: string) => void;
  [tavern_events.FILE_ATTACHMENT_DELETED]: (url: string) => void;
  [tavern_events.WORLDINFO_FORCE_ACTIVATE]: (entries: Object[]) => void;
  [tavern_events.OPEN_CHARACTER_LIBRARY]: () => void;
  [tavern_events.ONLINE_STATUS_CHANGED]: () => void;
  [tavern_events.IMAGE_SWIPED]: (result: {
    message: Object;
    element: JQuery<HTMLElement>;
    direction: 'left' | 'right';
  }) => void;
  [tavern_events.CONNECTION_PROFILE_LOADED]: (profile_name: string) => void;
  [tavern_events.TOOL_CALLS_PERFORMED]: (tool_invocations: Object[]) => void;
  [tavern_events.TOOL_CALLS_RENDERED]: (tool_invocations: Object[]) => void;
  [custom_event: string]: (...args: any) => any;
};

//------------------------------------------------------------------------------------------------------------------------
// @ts-expect-error
namespace detail {
  export const listener_event_wrapper_map: Map<Function, Map<EventType, Function>> = new Map();

  export function try_get_wrapper<T extends EventType>(listener: ListenerType[T], event_type: T): Function | undefined {
    return listener_event_wrapper_map.get(listener)?.get(event_type);
  }

  export function remove_wrapper<T extends EventType>(listener: ListenerType[T], event_type: T): void {
    listener_event_wrapper_map.get(listener)?.delete(event_type);
  }

  export function get_or_make_wrapper<T extends EventType>(
    listener: ListenerType[T],
    event_type: T,
    once: boolean,
  ): ListenerType[T] {
    const default_wrapper = async (
      ...args: Parameters<ListenerType[T]>
    ): Promise<Awaited<ReturnType<ListenerType[T]>>> => {
      if (once) {
        remove_wrapper(listener, event_type);
      }

      const result = await listener(...args);
      log.info(
        `[Event][callback '${event_type}'](${getIframeName()}) 函数因监听到 '${event_type}' 事件而触发\n\n  ${detail.format_function_to_string(
          listener,
        )}`,
      );

      const uid = detail.waiting_event_map.get(`${event_type}#${listener.toString()}`)[0];
      if (uid) {
        window.postMessage(
          {
            request: 'iframe_event_wait_callback',
            uid: uid,
            result: result,
          },
          '*',
        );
      }

      return result;
    };
    const default_event_wrapper_map = new Map([[event_type, default_wrapper]]);

    const event_wrapper = detail.get_or_set(listener_event_wrapper_map, listener, () => default_event_wrapper_map);
    const wrapper = detail.get_or_set(event_wrapper, event_type, () => default_wrapper);
    return wrapper as ListenerType[T];
  }

  export const waiting_event_map: ArrayMultimap<string, number> = new ArrayMultimap();

  $(window).on('unload', eventClearAll);
}
