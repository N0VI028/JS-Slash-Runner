import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => ({ chat: [] as any[], listeners: new Map<string, () => void>() }));
vi.mock('@sillytavern/script', () => ({
  get chat() {
    return host.chat;
  },
  eventSource: { once: (event: string, callback: () => void) => host.listeners.set(event, callback) },
}));
vi.mock('@/function/event', () => ({
  _eventEmit: vi.fn(),
  _eventOnce: (event: string, callback: () => void) => host.listeners.set(event, callback),
}));
vi.mock('@/function/variables', () => ({
  get_variables_without_clone: ({ message_id }: { message_id: number }) => {
    const message = host.chat[message_id];
    return message?.variables?.[message.swipe_id ?? 0] ?? {};
  },
}));

import { _waitGlobalInitialized } from '@/function/global';

beforeEach(() => {
  vi.useFakeTimers();
  host.chat = [];
  host.listeners.clear();
  vi.stubGlobal('window', { Mvu: {} });
  vi.stubGlobal('_', {
    has: (object: any, key: string) => object != null && Object.hasOwn(object, key),
    get: (object: any, key: string) => object?.[key],
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const snapshot = () => ({ variables: { 0: { stat_data: {} } } });

describe('iframe MVU initialization', () => {
  it('accepts existing data after an empty first floor on every call', async () => {
    host.chat = [{}, snapshot(), {}];
    for (let i = 0; i < 2; i++) {
      const frame = {} as Window;
      const ready = vi.fn();
      const waiting = _waitGlobalInitialized.call(frame, 'Mvu').then(ready);
      await vi.advanceTimersByTimeAsync(0);
      expect(ready).toHaveBeenCalledOnce();
      await waiting;
      expect(frame.Mvu).toBe(window.Mvu);
    }
  });

  it('still accepts first-floor data', async () => {
    host.chat = [snapshot()];
    const ready = vi.fn();
    _waitGlobalInitialized.call({} as Window, 'Mvu').then(ready);
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toHaveBeenCalledOnce();
  });

  it('waits for data on the active swipe, not an inactive swipe', async () => {
    host.chat = [{}, { swipe_id: 1, variables: { 0: { stat_data: {} }, 1: {} } }];
    const ready = vi.fn();
    _waitGlobalInitialized.call({} as Window, 'Mvu').then(ready);
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).not.toHaveBeenCalled();
    host.chat[1].variables[1].stat_data = {};
    await vi.advanceTimersByTimeAsync(50);
    expect(ready).toHaveBeenCalledOnce();
  });

  it('waits for the global and then for current-chat data', async () => {
    delete window.Mvu;
    host.chat = [{}, {}];
    const frame = {} as Window;
    const ready = vi.fn();
    _waitGlobalInitialized.call(frame, 'Mvu').then(ready);
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).not.toHaveBeenCalled();
    window.Mvu = {} as typeof window.Mvu;
    host.listeners.get('global_Mvu_initialized')!();
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).not.toHaveBeenCalled();
    host.chat[1] = snapshot();
    await vi.advanceTimersByTimeAsync(50);
    expect(ready).toHaveBeenCalledOnce();
    expect(frame.Mvu).toBe(window.Mvu);
  });

  it('does not reuse readiness from a previous chat', async () => {
    host.chat = [snapshot()];
    await _waitGlobalInitialized.call({} as Window, 'Mvu');
    host.chat = [{}, {}];
    const ready = vi.fn();
    _waitGlobalInitialized.call({} as Window, 'Mvu').then(ready);
    await vi.advanceTimersByTimeAsync(100);
    expect(ready).not.toHaveBeenCalled();
    host.chat[1] = snapshot();
    await vi.advanceTimersByTimeAsync(50);
    expect(ready).toHaveBeenCalledOnce();
  });

  it('preserves the timeout fallback when no data arrives', async () => {
    host.chat = [{}];
    const ready = vi.fn();
    _waitGlobalInitialized.call({} as Window, 'Mvu').then(ready);
    await vi.advanceTimersByTimeAsync(4999);
    expect(ready).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(ready).toHaveBeenCalledOnce();
  });

  it('does not require message data for other globals', async () => {
    Object.assign(window, { OtherLibrary: {} });
    const ready = vi.fn();
    _waitGlobalInitialized.call({} as Window, 'OtherLibrary').then(ready);
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toHaveBeenCalledOnce();
  });
});
