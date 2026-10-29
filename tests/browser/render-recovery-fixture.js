/* Install only in a disposable SillyTavern user profile (loading_order: 99). */
import {
  chat,
  eventSource,
  event_types,
  getCurrentChatId,
  redisplayChat,
  stopGeneration,
  swipe_left,
  swipe_right,
} from '/script.js';

const results = [];
const initializations = [];
let run = null;
let suiteRunning = false;
let partialToken = '';
eventSource.on(event_types.STREAM_TOKEN_RECEIVED, text => {
  partialToken = String(text);
});
let nodeSequence = 0;
const nodes = new WeakMap();
const nodeId = node => {
  if (!nodes.has(node)) nodes.set(node, ++nodeSequence);
  return nodes.get(node);
};
const waitFor = async (test, label, timeout = 12000) => {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > timeout) throw Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
};
const html = index =>
  '```html\n<body><h2>RENDER OK ' +
  index +
  '</h2><button onclick="this.textContent=\'BUTTON WORKS\'">Test rendering</button><script>parent.postMessage({type:"render-recovery-init",instance:crypto.randomUUID()},"*")</script></body>\n```';
const framesFor = element => element.querySelectorAll('iframe[id^="TH-message--"]');
const report = () => {
  document.getElementById('render-recovery-results').textContent = JSON.stringify(
    { suiteRunning, running: run?.label, results, initializations },
    null,
    2,
  );
};
window.addEventListener('message', event => {
  if (event.data?.type !== 'render-recovery-init') return;
  const frame = Array.from(document.querySelectorAll('iframe')).find(el => el.contentWindow === event.source);
  const element = frame?.closest('#chat > .mes');
  if (!element) return;
  initializations.push({ node: nodeId(element), instance: event.data.instance, at: performance.now() });
  report();
});

const observer = new MutationObserver(records => {
  if (!run?.cancelling) return;
  for (const record of records)
    for (const node of record.addedNodes) {
      if (!(node instanceof HTMLElement) || !node.matches('.mes[mesid="2"]')) continue;
      if (run.native === 'before' || run.native === 'delayed') {
        // Registered before the helper's observer: the normal event reserves first.
        void eventSource.emit(event_types.MESSAGE_SWIPED, 2);
      } else if (run.native === 'after') {
        void waitFor(() => initializations.some(item => item.node === nodeId(node)), 'rescue initialization')
          .then(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, 2);
          })
          .catch(error => console.error(error));
      }
    }
});
observer.observe(document.getElementById('chat'), { childList: true });

async function seed(count = 1) {
  const content = Array.from({ length: count }, (_, index) => html(index + 1)).join('\n');
  const base = {
    is_user: false,
    is_system: false,
    name: 'Render Repro',
    send_date: new Date().toISOString(),
    extra: {},
  };
  chat.splice(
    0,
    chat.length,
    { ...base, mes: 'Disposable rendering regression fixture' },
    { ...base, is_user: true, name: 'Tester', mes: 'Render test' },
    { ...base, mes: content, swipe_id: 0, swipes: [content], swipe_info: [{ extra: {} }] },
  );
  await redisplayChat();
  await eventSource.emit(event_types.CHAT_CHANGED, getCurrentChatId());
  await waitFor(
    () =>
      initializations.filter(item => item.node === nodeId(document.querySelector('#chat > .mes.last_mes'))).length >=
      count,
    'baseline initialization',
  );
  return content;
}

async function candidateScenario(partial = false) {
  if (run) return;
  const label = partial ? 'partial cancellation and manual back' : 'ordinary candidate switching';
  run = { label, native: 'missing', cancelling: false };
  report();
  try {
    const content = await seed();
    const initialCount = initializations.length;
    if (partial) {
      partialToken = '';
      await fetch('http://127.0.0.1:9100/control', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'partial' }),
      });
      const task = swipe_right();
      await waitFor(() => partialToken.includes('Second candidate'), 'first partial token');
      stopGeneration();
      await task;
    } else {
      chat[2].swipes.push(html(2));
      chat[2].swipe_info.push({ extra: {} });
      await swipe_right();
      await waitFor(() => initializations.length > initialCount, 'second saved candidate');
    }
    await swipe_left();
    const expected = partial ? 1 : 2;
    await waitFor(() => initializations.length >= initialCount + expected, 'original candidate restored');
    await new Promise(resolve => setTimeout(resolve, 350));
    const result = {
      label,
      streaming: document.getElementById('TH-render-allow-streaming')?.checked,
      additionalInitializations: initializations.length - initialCount,
      contentUnchanged: chat[2].mes === content,
      frames: framesFor(document.querySelector('#chat > .mes.last_mes')).length,
    };
    result.passed = result.additionalInitializations === expected && result.contentUnchanged && result.frames === 1;
    results.push(result);
  } catch (error) {
    results.push({ label, passed: false, error: String(error) });
  } finally {
    if (partial) stopGeneration();
    await fetch('http://127.0.0.1:9100/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"mode":"delay"}',
    });
    run = null;
    report();
  }
}

async function filtersScenario() {
  if (run) return;
  const label = 'depth, hidden floors and renderer toggle';
  run = { label, native: 'missing', cancelling: false };
  report();
  const depth = document.querySelector('#tavern_helper input[type="number"]');
  const hidden = document.getElementById('TH-render-depth-ignore-hidden');
  const enabled = document.getElementById('TH-render-enabled');
  const setDepth = value => {
    depth.value = String(value);
    depth.dispatchEvent(new Event('input', { bubbles: true }));
  };
  try {
    await seed();
    setDepth(1);
    chat[0].mes = html(3);
    chat[0].swipes = [chat[0].mes];
    chat[1].mes = html(4);
    await redisplayChat();
    await eventSource.emit(event_types.CHAT_CHANGED, getCurrentChatId());
    await waitFor(() => framesFor(document.querySelector('#chat > .mes[mesid="2"]')).length === 1, 'depth baseline');
    const oldDepthFrames = framesFor(document.querySelector('#chat > .mes[mesid="0"]')).length;
    chat[2].is_system = true;
    if (!hidden.checked) hidden.click();
    await redisplayChat();
    await eventSource.emit(event_types.CHAT_CHANGED, getCurrentChatId());
    await waitFor(
      () => framesFor(document.querySelector('#chat > .mes[mesid="1"]')).length === 1,
      'visible floor with hidden last message',
    );
    const hiddenFrames = framesFor(document.querySelector('#chat > .mes[mesid="2"]')).length;
    enabled.click();
    await waitFor(() => document.querySelectorAll('#chat iframe').length === 0, 'renderer disabled');
    enabled.click();
    await waitFor(
      () => framesFor(document.querySelector('#chat > .mes[mesid="1"]')).length === 1,
      'renderer re-enabled',
    );
    results.push({
      label,
      streaming: document.getElementById('TH-render-allow-streaming')?.checked,
      oldDepthFrames,
      hiddenFrames,
      passed: oldDepthFrames === 0 && hiddenFrames === 0,
    });
  } catch (error) {
    results.push({ label, passed: false, error: String(error) });
  } finally {
    chat[2].is_system = false;
    if (hidden.checked) hidden.click();
    if (!enabled.checked) enabled.click();
    setDepth(0);
    run = null;
    report();
  }
}

async function scenario(native = 'missing', repeat = 1, blocks = 1) {
  if (run) return;
  const label = `${native}, repeat=${repeat}, blocks=${blocks}`;
  run = { label, native, cancelling: false };
  report();
  try {
    const content = await seed(blocks);
    const baseline = initializations.length;
    const replacements = [];
    for (let i = 0; i < repeat; i++) {
      const old = document.querySelector('#chat > .mes.last_mes');
      run.cancelling = true;
      const swiping = swipe_right();
      await waitFor(() => getComputedStyle(document.getElementById('mes_stop')).display !== 'none', 'stop button');
      stopGeneration();
      await swiping;
      await waitFor(() => document.querySelector('#chat > .mes.last_mes') !== old, 'restored node');
      const current = document.querySelector('#chat > .mes.last_mes');
      await waitFor(
        () => initializations.filter(item => item.node === nodeId(current)).length >= blocks,
        'restored initialization',
      );
      await new Promise(resolve => setTimeout(resolve, 350));
      replacements.push({
        node: nodeId(current),
        frames: framesFor(current).length,
        initializations: initializations.filter(item => item.node === nodeId(current)).length,
      });
      run.cancelling = false;
    }
    const result = {
      label,
      streaming: document.getElementById('TH-render-allow-streaming')?.checked,
      replacements,
      additionalInitializations: initializations.length - baseline,
      contentUnchanged: chat[2].mes === content,
      swipeId: chat[2].swipe_id,
      swipes: chat[2].swipes.length,
    };
    result.passed =
      result.contentUnchanged &&
      result.swipeId === 0 &&
      result.swipes === 1 &&
      result.additionalInitializations === repeat * blocks &&
      replacements.every(item => item.frames === blocks && item.initializations === blocks);
    results.push(result);
  } catch (error) {
    results.push({ label, passed: false, error: String(error) });
  } finally {
    run = null;
    report();
  }
}

const panel = document.createElement('details');
panel.open = true;
panel.style.cssText =
  'position:fixed;right:8px;top:45px;bottom:auto;left:auto;margin:0;z-index:2147483000;background:#18212b;color:white;padding:12px;max-width:400px;max-height:55vh;overflow:auto;border:2px solid #6cb;';
panel.setAttribute('popover', 'manual');
const summary = document.createElement('summary');
summary.textContent = 'Render recovery QA (isolated data only)';
panel.append(summary);
for (const [label, value] of [
  ['QA streaming on', true],
  ['QA streaming off', false],
]) {
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', () => {
    const input = document.getElementById('TH-render-allow-streaming');
    if (input.checked !== value) input.click();
  });
  panel.append(button);
}
const filters = document.createElement('button');
filters.textContent = 'QA filters';
filters.addEventListener('click', () => {
  void filtersScenario();
});
panel.append(filters);
const suite = document.createElement('button');
suite.textContent = 'QA full suite';
suite.addEventListener('click', async () => {
  if (run || suiteRunning) return;
  suiteRunning = true;
  report();
  try {
    await scenario('missing', 3, 1);
    await scenario('before');
    await scenario('delayed');
    await scenario('after');
    await scenario('missing', 1, 2);
    await candidateScenario();
    await candidateScenario(true);
    await filtersScenario();
  } finally {
    suiteRunning = false;
    report();
  }
});
panel.append(suite);
for (const [label, native, repeat, blocks] of [
  ['QA cancel once', 'missing', 1, 1],
  ['QA cancel three times', 'missing', 3, 1],
  ['QA native before', 'before', 1, 1],
  ['QA native delayed', 'delayed', 1, 1],
  ['QA native after', 'after', 1, 1],
  ['QA two HTML blocks', 'missing', 1, 2],
]) {
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', () => {
    void scenario(native, repeat, blocks);
  });
  panel.append(button);
}
const output = document.createElement('pre');
output.id = 'render-recovery-results';
output.style.cssText = 'font-size:11px;white-space:pre-wrap';
panel.append(output);
document.body.append(panel);
panel.showPopover();
report();
window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
