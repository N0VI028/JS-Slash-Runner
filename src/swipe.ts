import { version } from '@/util/tavern';
import { chat, event_types, eventSource } from '@sillytavern/script';
import { compare } from 'compare-versions';

export function registerSwipeEvent() {
  if (compare(version, '1.13.5', '>=')) {
    eventSource.on(
      event_types.MESSAGE_SWIPE_DELETED,
      ({ message_id, swipe_id }: { message_id: number; swipe_id: number }) => {
        chat[message_id]?.variables?.splice(swipe_id, 1);
      },
    );
  }
}
