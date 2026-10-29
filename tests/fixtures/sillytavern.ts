import { EventEmitter } from 'node:events';
export const chat: Array<{ mes: string; swipe_id?: number; is_system?: boolean }> = [];
export const eventSource = new EventEmitter();
export const event_types = Object.fromEntries(
  [
    'CHARACTER_MESSAGE_RENDERED',
    'USER_MESSAGE_RENDERED',
    'MESSAGE_UPDATED',
    'MESSAGE_EDITED',
    'MESSAGE_SWIPED',
    'STREAM_TOKEN_RECEIVED',
    'CHAT_CHANGED',
    'MORE_MESSAGES_LOADED',
    'MESSAGE_DELETED',
  ].map(name => [name, name]),
);
