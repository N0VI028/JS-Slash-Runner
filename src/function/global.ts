import { _eventEmit, _eventOnce } from '@/function/event';
import { eventSource } from '@sillytavern/script';
import { waitUntil } from 'async-wait-until';
import { LiteralUnion } from 'type-fest';
import { get_variables_without_clone } from './variables';

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
      await waitUntil(() => _.has(get_variables_without_clone({ type: 'message', message_id: 0 }), 'stat_data'));
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
        await waitUntil(() => _.has(get_variables_without_clone({ type: 'message', message_id: 0 }), 'stat_data'));
      }
      resolve();
    });
  });
}
