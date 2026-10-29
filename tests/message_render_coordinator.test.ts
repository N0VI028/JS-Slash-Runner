import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageRenderCoordinator, type RenderContext } from '../src/util/message_render_coordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
};
function fixture() {
  let node = {};
  let input = 'original';
  let enabled = true;
  const coordinator = new MessageRenderCoordinator<object>(
    (id, target) => enabled && id === 2 && target === node,
    () => input,
  );
  return {
    coordinator,
    get node() {
      return node;
    },
    set node(value) {
      node = value;
    },
    set input(value: string) {
      input = value;
    },
    set enabled(value: boolean) {
      enabled = value;
    },
  };
}
afterEach(() => vi.useRealTimers());

describe('message render transaction ownership', () => {
  it('reserves before nextTick and shares the entire delayed event, including its timer', async () => {
    vi.useFakeTimers();
    const f = fixture();
    const tick = deferred();
    const mount = vi.fn();
    const event = f.coordinator.request(2, f.node, async ctx => {
      await tick.promise;
      if (ctx.isCurrent() && (await ctx.delay())) mount();
    });
    const rescue = f.coordinator.request(2, f.node, mount);
    expect(rescue).toBe(event);
    await Promise.resolve();
    tick.resolve();
    await vi.runAllTimersAsync();
    await event;
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('does not destroy or mount again when a native recovery event arrives after rescue committed', async () => {
    const f = fixture();
    const mount = vi.fn();
    await f.coordinator.request(2, f.node, mount);
    await f.coordinator.request(2, f.node, () => {
      throw Error('late event rebuilt the iframe');
    });
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it.each(['chat', 'disabled', 'mode', 'unmount'])('invalidates a delayed task on %s', async reason => {
    vi.useFakeTimers();
    const f = fixture();
    const mount = vi.fn();
    const task = f.coordinator.request(2, f.node, async ctx => {
      if (await ctx.delay(50)) mount();
    });
    await Promise.resolve();
    if (reason === 'disabled') f.enabled = false;
    f.coordinator.invalidate();
    if (reason === 'chat') f.node = {};
    await vi.runAllTimersAsync();
    await task;
    expect(mount).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cannot retarget a timer to another node with the same message number', async () => {
    const f = fixture();
    const tick = deferred();
    const oldMount = vi.fn();
    const pending = f.coordinator.request(2, f.node, async ctx => {
      await tick.promise;
      if (ctx.isCurrent()) oldMount();
    });
    await Promise.resolve();
    f.node = {};
    const newMount = vi.fn();
    await f.coordinator.request(2, f.node, newMount);
    tick.resolve();
    await pending;
    expect(oldMount).not.toHaveBeenCalled();
    expect(newMount).toHaveBeenCalledTimes(1);
  });

  it('renders changed input and invalidates a pending older revision', async () => {
    const f = fixture();
    const tick = deferred();
    const mount = vi.fn();
    const first = f.coordinator.request(2, f.node, async ctx => {
      await tick.promise;
      if (ctx.isCurrent()) mount('old');
    });
    await Promise.resolve();
    f.input = 'edited';
    await f.coordinator.request(2, f.node, () => {
      mount('edited');
    });
    tick.resolve();
    await first;
    expect(mount.mock.calls).toEqual([['edited']]);
  });

  it('accepts owned macro preparation without treating a late identical event as a new revision', async () => {
    const f = fixture();
    const mount = vi.fn();
    await f.coordinator.request(2, f.node, ctx => {
      f.input = 'expanded macro';
      ctx.acceptChanges();
      mount();
    });
    await f.coordinator.request(2, f.node, mount);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('never commits an exception and permits a subsequent retry', async () => {
    const f = fixture();
    await expect(
      f.coordinator.request(2, f.node, () => {
        throw Error('failed mount');
      }),
    ).rejects.toThrow('failed mount');
    const mount = vi.fn();
    await f.coordinator.request(2, f.node, mount);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('does not consider a task current after unannounced input changes', async () => {
    const f = fixture();
    let context!: RenderContext;
    await f.coordinator.request(2, f.node, ctx => {
      context = ctx;
    });
    f.input = 'new source';
    expect(context.isCurrent()).toBe(false);
  });

  it('starts a fresh transaction for a new chat even if both node and message number are reused', async () => {
    const f = fixture();
    const tick = deferred();
    const mount = vi.fn();
    const old = f.coordinator.request(2, f.node, async ctx => {
      await tick.promise;
      if (ctx.isCurrent()) mount('old chat');
    });
    await Promise.resolve();
    f.coordinator.invalidate();
    await f.coordinator.request(2, f.node, () => {
      mount('new chat');
    });
    tick.resolve();
    await old;
    expect(mount.mock.calls).toEqual([['new chat']]);
  });
});
