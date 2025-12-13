/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { _getButtonEvent } from '@/function/script';
import { _getIframeName } from '@/function/util';
import { getOrSet } from '@/util/algorithm';
import { eventSource } from '@sillytavern/script';

const iframe_event_listeners_map: Map<string, Map<string, Set<Function>>> = new Map();

function register_listener(this: Window, event: string, listener: Function): void {
  const event_listeners_map = getOrSet(
    iframe_event_listeners_map,
    _getIframeName.call(this),
    () => new Map<string, Set<Function>>(),
  );
  const listeners = getOrSet(event_listeners_map, event, () => new Set());

  listeners.add(listener);
}

function get_map(this: Window): Map<string, Set<Function>> {
  return getOrSet(iframe_event_listeners_map, _getIframeName.call(this), () => new Map<string, Set<Function>>());
}

type EventOnReturn = {
  stop: () => void;
};

function make_event_on_return<T extends EventType>(this: Window, event_type: T, listener: ListenerType[T]) {
  return {
    stop: () => _eventRemoveListener.call(this, event_type, listener),
  };
}

export function _eventOn<T extends EventType>(this: Window, event_type: T, listener: ListenerType[T]): EventOnReturn {
  register_listener.call(this, event_type, listener);
  eventSource.on(event_type, listener);
  return make_event_on_return.call(this, event_type, listener);
}

/** @deprecated */
export function _eventOnButton<T extends EventType>(this: Window, event_type: T, listener: ListenerType[T]): void {
  _eventOn.call(this, _getButtonEvent.call(this, event_type), listener);
}

export function _eventMakeLast<T extends EventType>(
  this: Window,
  event_type: T,
  listener: ListenerType[T],
): EventOnReturn {
  register_listener.call(this, event_type, listener);
  eventSource.makeLast(event_type, listener);
  return make_event_on_return.call(this, event_type, listener);
}

export function _eventMakeFirst<T extends EventType>(
  this: Window,
  event_type: T,
  listener: ListenerType[T],
): EventOnReturn {
  register_listener.call(this, event_type, listener);
  eventSource.makeFirst(event_type, listener);
  return make_event_on_return.call(this, event_type, listener);
}

export function _eventOnce<T extends EventType>(this: Window, event_type: T, listener: ListenerType[T]): EventOnReturn {
  // 酒馆自己也支持重复 once, 因此此处不考虑重复的情况
  const once = (...args: any[]) => {
    get_map.call(this).get(event_type)?.delete(once);
    return listener(...args);
  };
  register_listener.call(this, event_type, once);
  eventSource.once(event_type, once);
  return make_event_on_return.call(this, event_type, listener);
}

export async function _eventEmit<T extends EventType>(
  this: Window,
  event_type: T,
  ...data: Parameters<ListenerType[T]>
): Promise<void> {
  await eventSource.emit(event_type, ...data);
}

export function _eventEmitAndWait<T extends EventType>(
  this: Window,
  event_type: T,
  ...data: Parameters<ListenerType[T]>
): void {
  eventSource.emitAndWait(event_type, ...data);
}

export function _eventRemoveListener<T extends EventType>(
  this: Window,
  event_type: T,
  listener: ListenerType[T],
): void {
  get_map.call(this).get(event_type)?.delete(listener);
  eventSource.removeListener(event_type, listener);
}

export function _eventClearEvent(this: Window, event_type: EventType): void {
  const event_listeners_map = get_map.call(this);
  event_listeners_map.get(event_type)?.forEach(listener => {
    eventSource.removeListener(event_type, listener);
  });
  event_listeners_map.delete(event_type);
}

export function _eventClearListener(this: Window, listener: Function): void {
  get_map.call(this).forEach((listeners, event_type) => {
    eventSource.removeListener(event_type, listener);
    listeners.delete(listener);
  });
}

export function _eventClearAll(this: Window): void {
  get_map.call(this).forEach((listeners, event_type) => {
    listeners.forEach(listener => {
      eventSource.removeListener(event_type, listener);
    });
  });
  iframe_event_listeners_map.delete(_getIframeName.call(this));
}

type EventType = IframeEventType | TavernEventType | string;

type IframeEventType = (typeof iframe_events)[keyof typeof iframe_events];

export const iframe_events = {
  MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
  GENERATION_STARTED: 'js_generation_started',
  STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully',
  STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally',
  GENERATION_ENDED: 'js_generation_ended',
} as const;

type TavernEventType = (typeof tavern_events)[keyof typeof tavern_events];

export const tavern_events = {
  APP_READY: 'app_ready',
  EXTRAS_CONNECTED: 'extras_connected',
  MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
  MESSAGE_REASONING_EDITED: 'message_reasoning_edited',
  MESSAGE_REASONING_DELETED: 'message_reasoning_deleted',
  MESSAGE_SWIPE_DELETED: 'message_swipe_deleted',
  MORE_MESSAGES_LOADED: 'more_messages_loaded',
  IMPERSONATE_READY: 'impersonate_ready',
  CHAT_CHANGED: 'chat_id_changed',
  GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
  GENERATION_STARTED: 'generation_started',
  GENERATION_STOPPED: 'generation_stopped',
  GENERATION_ENDED: 'generation_ended',
  SD_PROMPT_PROCESSING: 'sd_prompt_processing',
  EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
  EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
  SETTINGS_LOADED: 'settings_loaded',
  SETTINGS_UPDATED: 'settings_updated',
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
  CHARACTER_EDITOR_OPENED: 'character_editor_opened',
  CHARACTER_EDITED: 'character_edited',
  CHARACTER_PAGE_LOADED: 'character_page_loaded',
  USER_MESSAGE_RENDERED: 'user_message_rendered',
  CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
  FORCE_SET_BACKGROUND: 'force_set_background',
  CHAT_DELETED: 'chat_deleted',
  CHAT_CREATED: 'chat_created',
  GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',
  GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
  GENERATE_AFTER_DATA: 'generate_after_data',
  WORLD_INFO_ACTIVATED: 'world_info_activated',
  TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',
  CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
  CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',
  CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
  CHARACTER_DELETED: 'characterDeleted',
  CHARACTER_DUPLICATED: 'character_duplicated',
  CHARACTER_RENAMED: 'character_renamed',
  CHARACTER_RENAMED_IN_PAST_CHAT: 'character_renamed_in_past_chat',
  SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',
  STREAM_TOKEN_RECEIVED: 'stream_token_received',
  STREAM_REASONING_DONE: 'stream_reasoning_done',
  FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
  WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
  OPEN_CHARACTER_LIBRARY: 'open_character_library',
  ONLINE_STATUS_CHANGED: 'online_status_changed',
  IMAGE_SWIPED: 'image_swiped',
  CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
  CONNECTION_PROFILE_CREATED: 'connection_profile_created',
  CONNECTION_PROFILE_DELETED: 'connection_profile_deleted',
  CONNECTION_PROFILE_UPDATED: 'connection_profile_updated',
  TOOL_CALLS_PERFORMED: 'tool_calls_performed',
  TOOL_CALLS_RENDERED: 'tool_calls_rendered',
  CHARACTER_MANAGEMENT_DROPDOWN: 'charManagementDropdown',
  SECRET_WRITTEN: 'secret_written',
  SECRET_DELETED: 'secret_deleted',
  SECRET_ROTATED: 'secret_rotated',
  SECRET_EDITED: 'secret_edited',
  PRESET_CHANGED: 'preset_changed',
  PRESET_DELETED: 'preset_deleted',
  PRESET_RENAMED: 'preset_renamed',
  PRESET_RENAMED_BEFORE: 'preset_renamed_before',
  MAIN_API_CHANGED: 'main_api_changed',
  WORLDINFO_ENTRIES_LOADED: 'worldinfo_entries_loaded',
  WORLDINFO_SCAN_DONE: 'worldinfo_scan_done',
  MEDIA_ATTACHMENT_DELETED: 'media_attachment_deleted',
} as const;

export type SendingMessage = {
  role: 'user' | 'assistant' | 'system';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'auto' | 'low' | 'high' } }
        | { type: 'video_url'; video_url: { url: string } }
      >;
};

export type ListenerType = {
  [iframe_events.MESSAGE_IFRAME_RENDER_STARTED]: (iframe_name: string) => void;
  [iframe_events.MESSAGE_IFRAME_RENDER_ENDED]: (iframe_name: string) => void;
  [iframe_events.GENERATION_STARTED]: (generation_id: string) => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_FULLY]: (full_text: string, generation_id: string) => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY]: (incremental_text: string, generation_id: string) => void;
  [iframe_events.GENERATION_ENDED]: (text: string, generation_id: string) => void;

  [tavern_events.APP_READY]: () => void;
  [tavern_events.EXTRAS_CONNECTED]: (modules: any) => void;
  [tavern_events.MESSAGE_SWIPED]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_SENT]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_RECEIVED]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_EDITED]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_DELETED]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_UPDATED]: (message_id: number | string) => void;
  [tavern_events.MESSAGE_FILE_EMBEDDED]: (message_id: number) => void;
  [tavern_events.MESSAGE_REASONING_EDITED]: (message_id: number) => void;
  [tavern_events.MESSAGE_REASONING_DELETED]: (message_id: number) => void;
  [tavern_events.MESSAGE_SWIPE_DELETED]: (event_data: {
    messageId: number;
    swipeId: number;
    newSwipeId: number;
  }) => void;
  [tavern_events.MORE_MESSAGES_LOADED]: () => void;
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
  [tavern_events.SD_PROMPT_PROCESSING]: (event_data: {
    prompt: string;
    generationType: number;
    message: string;
    trigger: string;
  }) => void;
  [tavern_events.EXTENSIONS_FIRST_LOAD]: () => void;
  [tavern_events.EXTENSION_SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_UPDATED]: () => void;
  [tavern_events.MOVABLE_PANELS_RESET]: () => void;
  [tavern_events.SETTINGS_LOADED_BEFORE]: (settings: object) => void;
  [tavern_events.SETTINGS_LOADED_AFTER]: (settings: object) => void;
  [tavern_events.CHATCOMPLETION_SOURCE_CHANGED]: (source: string) => void;
  [tavern_events.CHATCOMPLETION_MODEL_CHANGED]: (model: string) => void;
  [tavern_events.OAI_PRESET_CHANGED_BEFORE]: (result: {
    preset: object;
    presetName: string;
    settingsToUpdate: object;
    settings: object;
    savePreset: Function;
  }) => void;
  [tavern_events.OAI_PRESET_CHANGED_AFTER]: () => void;
  [tavern_events.OAI_PRESET_EXPORT_READY]: (preset: object) => void;
  [tavern_events.OAI_PRESET_IMPORT_READY]: (result: { data: object; presetName: string }) => void;
  [tavern_events.WORLDINFO_SETTINGS_UPDATED]: () => void;
  [tavern_events.WORLDINFO_UPDATED]: (name: string, data: { entries: object[] }) => void;
  [tavern_events.CHARACTER_EDITOR_OPENED]: (chid: string) => void;
  [tavern_events.CHARACTER_EDITED]: (result: { detail: { id: string; character: object } }) => void;
  [tavern_events.CHARACTER_PAGE_LOADED]: () => void;
  [tavern_events.USER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.CHARACTER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.FORCE_SET_BACKGROUND]: (background: { url: string; path: string }) => void;
  [tavern_events.CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.CHAT_CREATED]: () => void;
  [tavern_events.GENERATE_BEFORE_COMBINE_PROMPTS]: () => void;
  [tavern_events.GENERATE_AFTER_COMBINE_PROMPTS]: (result: { prompt: string; dryRun: boolean }) => void;
  /** dry_run 只在 SillyTavern 1.13.15 及以后有 */
  [tavern_events.GENERATE_AFTER_DATA]: (
    generate_data: {
      prompt: SendingMessage[];
    },
    dry_run: boolean,
  ) => void;
  [tavern_events.WORLD_INFO_ACTIVATED]: (entries: any[]) => void;
  [tavern_events.TEXT_COMPLETION_SETTINGS_READY]: () => void;
  [tavern_events.CHAT_COMPLETION_SETTINGS_READY]: (generate_data: {
    messages: SendingMessage[];
    model: string;
    temprature: number;
    frequency_penalty: number;
    presence_penalty: number;
    top_p: number;
    max_tokens: number;
    stream: boolean;
    logit_bias: object;
    stop: string[];
    chat_comletion_source: string;
    n?: number;
    user_name: string;
    char_name: string;
    group_names: string[];
    include_reasoning: boolean;
    reasoning_effort: string;
    json_schema: {
      name: string;
      value: Record<string, any>;
      description?: string;
      strict?: boolean;
    };
    [others: string]: any;
  }) => void;
  [tavern_events.CHAT_COMPLETION_PROMPT_READY]: (event_data: { chat: SendingMessage[]; dryRun: boolean }) => void;
  [tavern_events.CHARACTER_FIRST_MESSAGE_SELECTED]: (event_args: {
    input: string;
    output: string;
    character: object;
  }) => void;
  [tavern_events.CHARACTER_DELETED]: (result: { id: string; character: object }) => void;
  [tavern_events.CHARACTER_DUPLICATED]: (result: { oldAvatar: string; newAvatar: string }) => void;
  [tavern_events.CHARACTER_RENAMED]: (old_avatar: string, new_avatar: string) => void;
  [tavern_events.CHARACTER_RENAMED_IN_PAST_CHAT]: (
    current_chat: Record<string, any>,
    old_avatar: string,
    new_avatar: string,
  ) => void;
  [tavern_events.STREAM_TOKEN_RECEIVED]: (text: string) => void;
  [tavern_events.STREAM_REASONING_DONE]: (
    reasoning: string,
    duration: number | null,
    message_id: number,
    state: 'none' | 'thinking' | 'done' | 'hidden',
  ) => void;
  [tavern_events.FILE_ATTACHMENT_DELETED]: (url: string) => void;
  [tavern_events.WORLDINFO_FORCE_ACTIVATE]: (entries: object[]) => void;
  [tavern_events.OPEN_CHARACTER_LIBRARY]: () => void;
  [tavern_events.ONLINE_STATUS_CHANGED]: () => void;
  [tavern_events.IMAGE_SWIPED]: (result: {
    message: object;
    element: JQuery<HTMLElement>;
    direction: 'left' | 'right';
  }) => void;
  [tavern_events.CONNECTION_PROFILE_LOADED]: (profile_name: string) => void;
  [tavern_events.CONNECTION_PROFILE_CREATED]: (profile: Record<string, any>) => void;
  [tavern_events.CONNECTION_PROFILE_DELETED]: (profile: Record<string, any>) => void;
  [tavern_events.CONNECTION_PROFILE_UPDATED]: (
    old_profile: Record<string, any>,
    new_profile: Record<string, any>,
  ) => void;
  [tavern_events.TOOL_CALLS_PERFORMED]: (tool_invocations: object[]) => void;
  [tavern_events.TOOL_CALLS_RENDERED]: (tool_invocations: object[]) => void;
  [tavern_events.CHARACTER_MANAGEMENT_DROPDOWN]: (target: JQuery) => void;
  [tavern_events.SECRET_WRITTEN]: (secret: string) => void;
  [tavern_events.SECRET_DELETED]: (secret: string) => void;
  [tavern_events.SECRET_ROTATED]: (secret: string) => void;
  [tavern_events.SECRET_EDITED]: (secret: string) => void;
  [tavern_events.PRESET_CHANGED]: (data: { apiId: string; name: string }) => void;
  [tavern_events.PRESET_DELETED]: (data: { apiId: string; name: string }) => void;
  [tavern_events.PRESET_RENAMED]: (data: { apiId: string; oldName: string; newName: string }) => void;
  [tavern_events.PRESET_RENAMED_BEFORE]: (data: { apiId: string; oldName: string; newName: string }) => void;
  [tavern_events.MAIN_API_CHANGED]: (data: { apiId: string }) => void;
  [tavern_events.WORLDINFO_ENTRIES_LOADED]: (lores: {
    globalLore: Record<string, any>[];
    characterLore: Record<string, any>[];
    chatLore: Record<string, any>[];
    personaLore: Record<string, any>[];
  }) => void;
  [tavern_events.WORLDINFO_SCAN_DONE]: (event_data: {
    state: {
      current: number;
      next: number;
      loopCount: number;
    };
    new: {
      all: Record<string, any>[];
      successful: Record<string, any>[];
    };
    activated: {
      entries: Map<`${string}.${string}`, Record<string, any>>;
      text: string;
    };
    sortedEntries: Record<string, any>[];
    recursionDelay: {
      availableLevels: number[];
      currentLevel: number;
    };
    budget: {
      current: number;
      overflowed: boolean;
    };
    timedEffects: Record<string, any>;
  }) => void;
  [custom_event: string]: (...args: any) => any;
};
