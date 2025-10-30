import { _eventEmit, _eventOnce } from '@/function/event';
import { eventSource } from '@sillytavern/script';
import { LiteralUnion } from 'type-fest';

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
    return;
  }
  return new Promise(resolve => {
    _eventOnce.call(this, `global_${global}_initialized`, () => {
      Object.defineProperty(this, global, {
        get: () => _.get(window, global),
        configurable: true,
      });
      resolve();
    });
  });
}
