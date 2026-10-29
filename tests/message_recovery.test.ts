// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { chat, eventSource, event_types } from './fixtures/sillytavern';
import {
  messageSource,
  registerMessageRenderer,
  requestMessageRender,
  useMessageRecovery,
} from '../src/panel/render/message_recovery';

let scope: EffectScope;
let enabled = ref(true);
let mounts = 0;
let late = false;
let gate: Promise<void> | undefined;
const source = '<pre><code class="language-html">&lt;body&gt;original&lt;/body&gt;</code></pre>';
const makeMessage = () => {
  const element = document.createElement('div');
  element.className = 'mes last_mes';
  element.setAttribute('mesid', '2');
  element.innerHTML = `<div class="mes_text">${source}</div>`;
  return element;
};
const flush = async () => {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 20));
  await nextTick();
};

beforeEach(async () => {
  document.body.innerHTML = '<div id="chat"></div>';
  chat.splice(0, chat.length, { mes: '' }, { mes: '' }, { mes: 'original', swipe_id: 0 });
  enabled = ref(true);
  mounts = 0;
  late = false;
  gate = undefined;
  scope = effectScope();
  scope.run(() => {
    registerMessageRenderer({
      order: 30,
      isAttached: element => !!element.querySelector('iframe'),
      render: async (element, context) => {
        if (gate) await gate;
        if (!context.isCurrent()) return;
        if (late && !(await context.delay())) return;
        if (!context.isCurrent()) return;
        mounts++;
        const wrapper = document.createElement('div');
        wrapper.className = 'TH-render';
        const pre = element.querySelector('pre')!;
        pre.replaceWith(wrapper);
        wrapper.append(pre);
        pre.classList.add('hidden!');
        const frame = document.createElement('iframe');
        frame.id = 'TH-message--2--0';
        wrapper.append(frame);
        context.acceptChanges();
        await nextTick();
      },
    });
    useMessageRecovery(enabled, () => []);
  });
  document.getElementById('chat')!.append(makeMessage());
  await requestMessageRender(2);
});
afterEach(() => {
  scope.stop();
  eventSource.removeAllListeners();
});

describe('silent DOM replacement recovery', () => {
  it('normalizes its own wrappers, controls and frames without losing actual source changes', () => {
    const el = document.querySelector<HTMLElement>('.mes')!;
    const pristine = makeMessage();
    expect(messageSource(el)).toBe(messageSource(pristine));
    el.querySelector('code')!.textContent = '<body>edited</body>';
    expect(messageSource(el)).not.toBe(messageSource(pristine));
  });

  it.each(['missing', 'before', 'delayed', 'after'])(
    'initializes the replacement once when native notification is %s',
    async timing => {
      late = timing === 'delayed';
      const replacement = makeMessage();
      document.querySelector('.mes')!.replaceWith(replacement);
      if (timing === 'before' || timing === 'delayed') eventSource.emit(event_types.MESSAGE_SWIPED, 2);
      await flush();
      if (timing === 'after') {
        eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, 2);
        await flush();
      }
      expect(mounts).toBe(2); // one initial mount + exactly one on the new node
      expect(replacement.querySelectorAll('iframe')).toHaveLength(1);
    },
  );

  it('joins an event paused across nextTick and a timer, rather than mounting in the rescue path', async () => {
    let release!: () => void;
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    late = true;
    document.querySelector('.mes')!.replaceWith(makeMessage());
    eventSource.emit(event_types.MESSAGE_SWIPED, 2);
    await nextTick();
    expect(mounts).toBe(1);
    release();
    await flush();
    expect(mounts).toBe(2);
  });

  it('invalidates a pending replacement when another chat reuses its message number', async () => {
    let release!: () => void;
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const old = makeMessage();
    document.querySelector('.mes')!.replaceWith(old);
    eventSource.emit(event_types.MESSAGE_SWIPED, 2);
    await nextTick();
    eventSource.emit(event_types.CHAT_CHANGED);
    const current = makeMessage();
    old.replaceWith(current);
    gate = undefined;
    release();
    await flush();
    expect(old.querySelectorAll('iframe')).toHaveLength(0);
    expect(current.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('disconnects and invalidates pending work when rendering is disabled', async () => {
    let release!: () => void;
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    document.querySelector('.mes')!.replaceWith(makeMessage());
    eventSource.emit(event_types.MESSAGE_SWIPED, 2);
    await nextTick();
    enabled.value = false;
    release();
    await flush();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('does not turn ordinary rendering into streaming rendering', async () => {
    const element = document.querySelector<HTMLElement>('.mes')!;
    chat[2].mes = 'new streamed source';
    element.querySelector('code')!.textContent = '<body>new streamed source</body>';
    eventSource.emit(event_types.STREAM_TOKEN_RECEIVED, chat[2].mes);
    await flush();
    expect(mounts).toBe(1);
    eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, 2);
    await flush();
    expect(mounts).toBe(2);
  });

  it('recovers when the host replaces only the message body with identical source', async () => {
    const element = document.querySelector<HTMLElement>('.mes')!;
    element.querySelector('.mes_text')!.innerHTML = source;
    eventSource.emit(event_types.MESSAGE_UPDATED, 2);
    await flush();
    expect(mounts).toBe(2);
    eventSource.emit(event_types.MESSAGE_UPDATED, 2);
    await flush();
    expect(mounts).toBe(2);
  });
});
