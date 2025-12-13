import { version } from '@/util/tavern';
import { chat, event_types, eventSource } from '@sillytavern/script';
import { compare } from 'compare-versions';

export function registerSwipeEvent() {
  if (compare(version, '1.13.5', '>=')) {
    eventSource.on(
      event_types.MESSAGE_SWIPE_DELETED,
      ({ message_id, swipe_id }: { message_id: number; swipe_id: number }) => {
        const variables = chat[message_id];
        if (_.isArray(variables)) {
          variables.splice(swipe_id, 1);
          return;
        }
        if (_.isPlainObject(variables)) {
          _.unset(variables, swipe_id);
          _.mapKeys(variables, (_, key) => {
            const current_id = Number(key);
            return current_id < swipe_id ? String(current_id) : String(current_id - 1);
          });
        }
      },
    );
  }
}
