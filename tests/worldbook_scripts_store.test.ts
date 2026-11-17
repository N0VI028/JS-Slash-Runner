import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import lodash from 'lodash';
import { klona } from 'klona';
import { getWorldbookScripts, setWorldbookScripts, DUMMY_NAME } from '../src/util/worldbook_script_data';

const host = vi.hoisted(() => ({
  names: [] as string[], selected: [] as string[], characters: [] as any[],
  metadata: {} as any, persona: {} as any, settings: { globalSelect: [] as string[], charLore: [] as any[] },
  data: {} as Record<string, any>, listeners: new Map<string, Set<(...args: any[]) => any>>(),
  gate: undefined as undefined | Promise<void>, saves: [] as string[],
  loadGate: undefined as undefined | Promise<void>,
  saveError: false,
}));
vi.mock('../src/store/settings', () => ({ useGlobalSettingsStore: () => ({ app_ready: true }) }));
vi.mock('../src/type/scripts', () => ({ flattenScriptTree: (tree: any) => tree.type === 'folder' ? tree.scripts : [tree] }));
vi.mock('@sillytavern/script', () => ({
  characters: host.characters, chat_metadata: host.metadata, this_chid: 0,
  event_types: { WORLDINFO_UPDATED: 'updated', WORLDINFO_SETTINGS_UPDATED: 'settings' },
  eventSource: {
    on: (event: string, fn: (...args: any[]) => any) => {
      if (!host.listeners.has(event)) host.listeners.set(event, new Set());
      host.listeners.get(event)!.add(fn);
    },
    removeListener: (event: string, fn: (...args: any[]) => any) => host.listeners.get(event)?.delete(fn),
  },
}));
vi.mock('@sillytavern/scripts/group-chats', () => ({ groups: [], selected_group: undefined }));
vi.mock('@sillytavern/scripts/power-user', () => ({ power_user: host.persona }));
vi.mock('@sillytavern/scripts/world-info', () => ({
  world_names: host.names, selected_world_info: host.selected,
  getWorldInfoSettings: () => ({ world_info: host.settings }),
  loadWorldInfo: vi.fn(async (name: string) => {
    const data = host.data[name];
    await host.loadGate;
    return data;
  }),
  saveWorldInfo: vi.fn(async (name: string, data: any) => {
    await host.gate;
    if (host.saveError) throw Error('save failed');
    host.saves.push(name);
    host.data[name] = structuredClone(data);
    host.listeners.get('updated')?.forEach(fn => fn(name, host.data[name]));
  }),
}));
const emit = (event: string, ...args: any[]) => host.listeners.get(event)?.forEach(fn => fn(...args));
const script = (id: string) => ({ type: 'script', id, name: id, enabled: true, content: id, data: {}, button: { enabled: true, buttons: [] } }) as any;
const book = (id: string) => setWorldbookScripts({ entries: { 1: { uid: 1, comment: 'ordinary', content: 'keep' } } }, [script(id)]);
const settle = async () => { for (let i = 0; i < 30; ++i) await Promise.resolve(); };
let store: ReturnType<(typeof import('../src/store/worldbook_scripts'))['useWorldbookScriptsStore']>;

beforeEach(async () => {
  vi.useFakeTimers();
  Object.entries(Vue).forEach(([name, value]) => vi.stubGlobal(name, value));
  vi.stubGlobal('defineStore', defineStore);
  vi.stubGlobal('_', lodash);
  vi.stubGlobal('klona', klona);
  vi.stubGlobal('toastr', { error: vi.fn() });
  host.names.splice(0, Infinity, 'a', 'b');
  host.selected.splice(0, Infinity, 'a', 'b');
  host.characters.splice(0);
  host.settings.globalSelect = [];
  host.settings.charLore = [];
  delete host.metadata.world_info;
  delete host.persona.persona_description_lorebook;
  host.data = { a: book('same'), b: book('same') };
  host.gate = undefined;
  host.loadGate = undefined;
  host.saves = [];
  host.saveError = false;
  host.listeners.clear();
  setActivePinia(createPinia());
  const module = await import('../src/store/worldbook_scripts');
  store = module.useWorldbookScriptsStore();
  await store.refresh();
  await settle();
});
afterEach(() => { store.$dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('worldbook script store host integration', () => {
  it('does not enable stale globalSelect books', async () => {
    host.selected.splice(0, Infinity, 'a');
    host.settings.globalSelect = ['b'];
    await store.refresh();
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a']);
    store.selected_name = 'b';
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a']);
  });

  it('keeps failed writes pending across external updates and retries on refresh', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    host.saveError = true;
    store.selected_name = 'a';
    store.script_trees[0].name = 'unsaved';
    await settle();
    expect(store.error).toBeTruthy();
    host.data.a.entries[1].content = 'external ordinary edit';
    emit('updated', 'a', host.data.a);
    await settle();
    expect(store.script_trees[0].name).toBe('unsaved');
    host.saveError = false;
    await store.refresh();
    await settle();
    expect(getWorldbookScripts(host.data.a)[0].name).toBe('unsaved');
    expect(host.data.a.entries[1].content).toBe('external ordinary edit');
    log.mockRestore();
  });

  it('retains all book loads across overlapping refreshes and binding changes', async () => {
    let release!: () => void;
    host.loadGate = new Promise<void>(resolve => { release = resolve; });
    host.names.push('c');
    host.data.c = book('third');
    const first = store.refresh();
    host.selected.push('c');
    const second = store.refresh();
    release();
    await Promise.all([first, second]);
    await settle();
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a', 'b', 'c']);
  });

  it('starts unselected while running every bound book, with namespaced ids', () => {
    expect(store.selected_name).toBe('');
    expect(store.script_trees).toEqual([]);
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a', 'b']);
    expect(new Set(store.enabled_scripts_with_source.map(item => item.runtime_id)).size).toBe(2);
    store.enabled = false;
    expect(store.enabled_scripts_with_source).toHaveLength(2);
  });

  it('detects rename after early UPDATED without a completion event', async () => {
    host.data.renamed = structuredClone(host.data.a);
    emit('updated', 'renamed', host.data.renamed);
    await settle();
    host.names.splice(0, Infinity, 'renamed', 'b');
    host.selected.splice(0, Infinity, 'renamed', 'b');
    await vi.advanceTimersByTimeAsync(1500);
    await settle();
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['renamed', 'b']);
    expect(store.names).not.toContain('a');
  });

  it('normalizes copied dummy entries once without modifying the host cache in place', async () => {
    const incoming = { entries: {
      1: { uid: 1, comment: DUMMY_NAME, extra: { tavern_helper: { scripts: [script('one')] } } },
      2: { uid: 2, comment: DUMMY_NAME, extra: { tavern_helper: { scripts: [script('two')] } } },
    } };
    host.data.a = incoming;
    const original = structuredClone(incoming);
    emit('updated', 'a', incoming);
    await settle();
    expect(incoming).toEqual(original);
    expect(getWorldbookScripts(host.data.a).map(tree => tree.id)).toEqual(['one', 'two']);
    expect(host.saves).toEqual(['a']);
    expect(store.script_counts.a).toBe(2);
  });

  it('keeps running scripts and their identity while ordinary-entry updates reload', async () => {
    const running = store.enabled_scripts_with_source;
    const original = running.find(item => item.source === 'a')!.script;
    let release!: () => void;
    host.loadGate = new Promise<void>(resolve => { release = resolve; });
    host.data.a.entries[1].content = 'ordinary edit';
    emit('updated', 'a', host.data.a);
    await settle();
    expect(store.enabled_scripts_with_source.find(item => item.source === 'a')!.script).toBe(original);
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a', 'b']);
    release();
    await settle();
    expect(store.enabled_scripts_with_source.find(item => item.source === 'a')!.script).toBe(original);
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['a', 'b']);
    expect(host.saves).toEqual([]);
  });

  it('serializes deep edits by captured book and preserves newer ordinary entries', async () => {
    let release!: () => void;
    host.gate = new Promise<void>(resolve => { release = resolve; });
    store.selected_name = 'a';
    store.script_trees[0].name = 'edited a';
    store.selected_name = 'b';
    store.script_trees[0].name = 'edited b';
    host.data.b.entries[1].content = 'new ordinary content';
    await settle();
    expect(host.saves).toEqual([]);
    release();
    await settle();
    expect(host.saves).toEqual(['a', 'b']);
    expect(getWorldbookScripts(host.data.a)[0].name).toBe('edited a');
    expect(getWorldbookScripts(host.data.b)[0].name).toBe('edited b');
    expect(host.data.b.entries[1].content).toBe('new ordinary content');
  });

  it('recomputes binding precedence and clears a deleted selection', async () => {
    host.selected.splice(0);
    host.characters.push({ avatar: 'char.png', data: { extensions: { world: 'a' } } });
    host.metadata.world_info = 'a';
    host.persona.persona_description_lorebook = 'b';
    emit('settings');
    await settle();
    expect(store.groups[1].names).toEqual(['a']);
    expect(store.groups[2].names).toEqual([]);
    expect(store.groups[3].names).toEqual(['b']);
    store.selected_name = 'a';
    host.names.splice(host.names.indexOf('a'), 1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(store.selected_name).toBe('');
    expect(store.enabled_scripts_with_source.map(item => item.source)).toEqual(['b']);
    store.$dispose();
    expect([...host.listeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  });

  it('does not apply an asynchronous stale load over a newer edit', async () => {
    let release!: () => void;
    host.loadGate = new Promise<void>(resolve => { release = resolve; });
    emit('updated', 'a', host.data.a);
    store.selected_name = 'a';
    store.script_trees = [script('newer')];
    host.loadGate = undefined;
    release();
    await settle();
    expect(store.script_trees.map(tree => tree.id)).toEqual(['newer']);
    expect(getWorldbookScripts(host.data.a).map(tree => tree.id)).toEqual(['newer']);
  });
});
