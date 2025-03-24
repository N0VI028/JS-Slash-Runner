import { destroy as destroyLibrary, initialize as initializeLibrary } from '@/component/character_level/library';
import {
  destroy as destroyScriptIframe,
  initialize as initializeScriptIframe,
} from '@/component/character_level/script_iframe';

import { event_types, eventSource } from '@sillytavern/script';

const load_events = [event_types.CHAT_CHANGED] as const;

export function initializeCharacterLevelOnExtension() {
  // FIXME: 在无角色卡的情况下, 修改正则并不会触发 CHAT_CHANGED 事件, 因而不会加载这些内容
  load_events.forEach(eventType => {
    eventSource.makeFirst(eventType, initializeScriptIframe);
    eventSource.makeFirst(eventType, initializeLibrary);
  });
}

export function destroyCharacterLevelOnExtension() {
  load_events.forEach(eventType => {
    eventSource.removeListener(eventType, initializeScriptIframe);
    eventSource.removeListener(eventType, initializeLibrary);
  });
  destroyScriptIframe();
  destroyLibrary();
}
