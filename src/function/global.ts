import { _eventEmit, _eventOnce } from '@/function/event';
import { chat, eventSource } from '@sillytavern/script';
import { waitUntil } from 'async-wait-until';
import { LiteralUnion } from 'type-fest';

function hasMvuData(chat_message: any): boolean {
  return _.has(chat_message?.variables?.[chat_message.swipe_id ?? 0], 'stat_data');
}

async function waitMvu() {
  try {
    await waitUntil(() => hasMvuData(chat[0]) || _.takeRight(chat, 10).some(hasMvuData));
  } catch (error) {
    /** waitUntil 只是作为 MVU 加载的保险, 忽略超时时的报错 */
  }
}

export function initializeGlobal(global: LiteralUnion<'Mvu', string>, value: any): void {
  _.set(window, global, value);
  eventSource.emit(`global_${global}_initialized`);
}

export function _initializeGlobal(this: Window, global: LiteralUnion<'Mvu', string>, value: any): void {
  _.set(window, global, value);
  _eventEmit.call(this, `global_${global}_initialized`);
}

export async function waitGlobalInitialized(global: LiteralUnion<'Mvu', string>): Promise<void> {
  if (_.has(window, global)) {
    return;
  }
  return new Promise(resolve => {
    eventSource.once(`global_${global}_initialized`, () => {
      resolve();
    });
  });
}

export async function _waitGlobalInitialized(this: Window, global: LiteralUnion<'Mvu', string>): Promise<void> {
  if (_.has(window, global)) {
    Object.defineProperty(this, global, {
      get: () => _.get(window, global),
      configurable: true,
    });
    if (global === 'Mvu') {
      await waitMvu();
    }
    return;
  }
  return new Promise(resolve => {
    _eventOnce.call(this, `global_${global}_initialized`, async () => {
      Object.defineProperty(this, global, {
        get: () => _.get(window, global),
        configurable: true,
      });
      if (global === 'Mvu') {
        await waitMvu();
      }
      resolve();
    });
  });
}
