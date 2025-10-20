import { _eventEmit, _eventOnce } from '@/function/event';
import { LiteralUnion } from 'type-fest';

export function _initializeGlobal(this: Window, global: LiteralUnion<'Mvu', string>, value: any): void {
  _.set(window, global, value);
  _eventEmit.call(this, `global_${global}_initialized`);
}

export async function _waitGlobalInitialized<T>(this: Window, global: LiteralUnion<'Mvu', string>): Promise<T> {
  if (_.has(window, global)) {
    const value = _.get(window, global);
    _.set(this, global, value);
    return value as T;
  }
  return new Promise(resolve => {
    _eventOnce.call(this, `global_${global}_initialized`, () => {
      const value = _.get(window, global);
      _.set(this, global, value);
      resolve(value as T);
    });
  });
}
