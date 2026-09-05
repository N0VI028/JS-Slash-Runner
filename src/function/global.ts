import { _eventEmit, _eventOnce } from '@/function/event';
import { chat, eventSource } from '@sillytavern/script';
import { waitUntil } from 'async-wait-until';
import { LiteralUnion } from 'type-fest';

function hasMvuMessageData(): boolean {
  // 导入或清理过的聊天可能只有后面的楼层有变量, 不要求第 0 楼保留快照。
  return chat.some(message => _.has(message.variables?.[message.swipe_id ?? 0], 'stat_data'));
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
      try {
        await waitUntil(hasMvuMessageData);
      } catch (error) {
        /** 只是作为保险, 忽略超时时的报错 */
      }
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
        try {
          await waitUntil(hasMvuMessageData);
        } catch (error) {
          /** 只是作为保险, 忽略超时时的报错 */
        }
      }
      resolve();
    });
  });
}
