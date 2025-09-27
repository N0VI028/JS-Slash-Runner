import { chat } from '@sillytavern/script';

export function toMessageDepth(message_id: number) {
  return chat.length - message_id;
}
