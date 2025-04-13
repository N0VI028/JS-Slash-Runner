import {
  destroy as destroyScriptIframe,
  initialize as initializeScriptIframe,
} from '@/component/character_level/script_iframe';

import { event_types, eventSource } from '@sillytavern/script';

const load_events = [event_types.CHAT_CHANGED] as const;
let app_ready = false;

export function initializeCharacterLevelOnExtension() {
  const register_events = () => {
    load_events.forEach(eventType => {
      eventSource.makeFirst(eventType, initializeScriptIframe);
    });
  };

  if (!app_ready) {
    eventSource.once(event_types.APP_READY, () => {
      app_ready = true;
      initializeScriptIframe();
      register_events();
    });
  } else {
    register_events();
  }
}

export function destroyCharacterLevelOnExtension() {
  load_events.forEach(eventType => {
    eventSource.removeListener(eventType, initializeScriptIframe);
  });
  destroyScriptIframe();
}
