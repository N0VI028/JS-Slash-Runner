import { describe, expect, it, vi, beforeEach } from 'vitest';
import lodash from 'lodash';
import { klona } from 'klona';
import type { ScriptTree } from '../src/type/scripts';
import {
  DUMMY_NAME,
  MAX_UID,
  getWorldbookScripts,
  normalizeWorldbookScriptData,
  preserveWorldbookScriptData,
  setWorldbookScripts,
} from '../src/util/worldbook_script_data';

const script = (id = 'a', content = 'one') =>
  ({ type: 'script', id, content, data: { nested: content } }) as ScriptTree;
const dummy = (uid: number, scripts: ScriptTree[], extra = {}) => ({
  uid,
  comment: DUMMY_NAME,
  extra: { ...extra, tavern_helper: { scripts } },
});

describe('worldbook script storage', () => {
  it('filters malformed imported nodes while retaining valid folder children', () => {
    const data = {
      entries: {
        1: null,
        2: dummy(2, [
          null,
          false,
          'bad',
          {},
          script(),
          { type: 'folder', id: 'folder', scripts: [null, script('child')] },
          { type: 'folder', id: 'broken', scripts: null },
        ] as any),
      },
    };
    const trees = getWorldbookScripts(data);
    expect(trees.map(node => node.id)).toEqual(['a', 'folder', 'broken']);
    expect(trees[1]).toMatchObject({ scripts: [{ id: 'child' }] });
    expect(getWorldbookScripts(null as any)).toEqual([]);
  });
  it('does not retain empty dummy entries', () => {
    const data = { entries: { 2: dummy(2, []) } };
    expect(normalizeWorldbookScriptData(data).entries).toEqual({});
    setWorldbookScripts(data, [script()]);
    expect(getWorldbookScripts(data)).toHaveLength(1);
    setWorldbookScripts(data, []);
    expect(data.entries).toEqual({});
  });

  it('retains an empty folder as a valid script-tree node', () => {
    const folder = { type: 'folder', id: 'empty', scripts: [] } as unknown as ScriptTree;
    const data = { entries: { 1: dummy(1, [folder]) } };
    expect(getWorldbookScripts(data)).toEqual([folder]);
    expect(data.entries).toHaveProperty(String(MAX_UID));
  });

  it('preserves unrepresented ordinary fields and leaves previous data untouched', () => {
    const previous = { entries: {
      7: { uid: 7, comment: 'ordinary', hostOnly: { keep: true }, extra: { plugin: { a: 1 } } },
      8: dummy(8, [script()]),
    } };
    const before = structuredClone(previous);
    const result = preserveWorldbookScriptData({ entries: {
      7: { uid: 7, comment: 'edited', extra: { plugin: { b: 2 } } },
    } }, previous);
    expect(result.entries[7]).toMatchObject({
      hostOnly: { keep: true }, extra: { plugin: { a: 1, b: 2 } },
    });
    expect(previous).toEqual(before);
    expect(getWorldbookScripts(result)).toHaveLength(1);
  });

  it('merges moved copies, deduplicates exact content, and recovers conflicting child ids', () => {
    const folder = { type: 'folder', id: 'folder', scripts: [script(), script('a', 'two')] } as ScriptTree;
    const data = { entries: { 8: dummy(8, [folder]), 9: dummy(9, [folder, script('a', 'three')]) } };
    const trees = getWorldbookScripts(data);
    expect(trees).toHaveLength(2);
    const children = trees[0].type === 'folder' ? trees[0].scripts : [];
    expect(children.map(child => child.content)).toEqual(['one', 'two']);
    expect(new Set([...children, trees[1]].map(node => node.id)).size).toBe(3);
    expect(getWorldbookScripts(data)).toEqual(trees);
  });

  it('preserves ordinary reserved uid entries and nested metadata and places dummy last', () => {
    const data = {
      metadata: { keep: true },
      entries: {
        [MAX_UID]: { uid: MAX_UID, comment: 'ordinary', content: 'keep' },
        12: dummy(12, [script()], { unknown: { a: 1 } }),
        13: dummy(13, [script()], { unknown: { b: 2 } }),
        2000000: { uid: 2000000, comment: 'large' },
      },
    };
    normalizeWorldbookScriptData(data);
    const entries = Object.values(data.entries) as any[];
    expect(entries.map(entry => entry.comment)).toEqual(['ordinary', 'large', DUMMY_NAME]);
    expect(entries.at(-1)).toMatchObject({
      uid: MAX_UID,
      order: MAX_UID,
      displayIndex: MAX_UID,
      disable: true,
      content: '',
      extra: { unknown: { a: 1, b: 2 } },
    });
    expect(data.metadata).toEqual({ keep: true });
  });
});

const host = vi.hoisted(() => ({ data: { entries: {} } as any }));
vi.mock('@sillytavern/scripts/world-info', () => ({
  world_names: ['test'],
  selected_world_info: [],
  // Match the host cache: reads can return the same object repeatedly.
  loadWorldInfo: vi.fn(async () => host.data),
  saveWorldInfo: vi.fn(async (_name, data) => {
    host.data = structuredClone(data);
  }),
  createNewWorldInfo: vi.fn(),
  deleteWorldInfo: vi.fn(),
  getWorldInfoSettings: vi.fn(),
  parseRegexFromString: () => null,
}));
vi.mock('@sillytavern/script', () => ({ saveSettingsDebounced: vi.fn() }));
vi.mock('../src/util/compatibility', () => ({ reloadEditor: vi.fn(), reloadEditorDebounced: vi.fn() }));
vi.mock('../src/function/lorebook', () => ({}));
vi.mock('../src/function/raw_character', () => ({ RawCharacter: {} }));

describe('worldbook API preservation', () => {
  beforeEach(() => {
    vi.stubGlobal('_', lodash);
    vi.stubGlobal('klona', klona);
    host.data = { metadata: { keep: true }, entries: { 3: dummy(3, [script()], { unknown: { keep: true } }) } };
  });

  it.each(['modern', 'legacy'])('%s reads normalize a copy, not the host cache', async kind => {
    host.data.entries[MAX_UID] = { uid: MAX_UID, comment: 'ordinary', key: [], keysecondary: [] };
    host.data.entries[8] = dummy(8, [script('b')]);
    const before = structuredClone(host.data);
    const entries = kind === 'modern'
      ? await (await import('../src/function/worldbook')).getWorldbook('test')
      : await (await import('../src/function/lorebook_entry')).getLorebookEntries('test');
    expect(entries.at(-1)?.uid).toBe(MAX_UID);
    expect(host.data).toEqual(before);
  });

  it('keeps the modern dummy last even with non-finite or missing ordinary display indices', async () => {
    for (const [uid, displayIndex] of [undefined, NaN, Infinity, -Infinity, 0].entries()) {
      host.data.entries[uid + 10] = {
        uid: uid + 10, comment: `ordinary-${uid}`, key: [], keysecondary: [], displayIndex,
      };
    }
    const before = structuredClone(host.data);
    const entries = await (await import('../src/function/worldbook')).getWorldbook('test');
    expect(entries).toHaveLength(6);
    expect(entries.at(-1)).toMatchObject({ uid: MAX_UID, name: DUMMY_NAME });
    expect(entries.slice(0, -1).every(entry => entry.name !== DUMMY_NAME)).toBe(true);
    expect(host.data).toEqual(before);
  });

  it.each(['modern', 'legacy'])('%s merges multiple API dummies before uid indexing', async kind => {
    const extras = [
      { tavern_helper: { scripts: [script('first')] }, plugin: { a: 1 } },
      { tavern_helper: { scripts: [script('second')] }, plugin: { b: 2 } },
    ];
    if (kind === 'modern') {
      await (await import('../src/function/worldbook')).replaceWorldbook('test', [
        ...extras.map(extra => ({ uid: MAX_UID, name: DUMMY_NAME, extra })),
        { uid: 4, name: 'one' }, { uid: 4, name: 'two' }, { uid: 5, name: 'three' },
      ]);
    } else {
      await (await import('../src/function/lorebook_entry')).replaceLorebookEntries('test', [
        ...extras.map(extra => ({ uid: MAX_UID, comment: DUMMY_NAME, extra })),
        { uid: 4, comment: 'one' }, { uid: 4, comment: 'two' }, { uid: 5, comment: 'three' },
      ]);
    }
    expect(getWorldbookScripts(host.data).map(node => node.id)).toEqual(['first', 'second']);
    expect(host.data.entries[MAX_UID].extra.plugin).toEqual({ a: 1, b: 2 });
    expect(host.data.entries[5].comment).toBe('three');
    expect(Object.values(host.data.entries)).toHaveLength(4);
    expect(Object.values(host.data.entries).at(-1)).toMatchObject({ uid: MAX_UID, order: MAX_UID });
  });

  it('preserves scripts across modern replace/create/delete and honors explicit clearing', async () => {
    const api = await import('../src/function/worldbook');
    await api.replaceWorldbook('test', [{ name: 'ordinary' }]);
    const created = await api.createWorldbookEntries('test', [{ name: 'new' }]);
    expect(created.new_entries.map(entry => entry.name)).toEqual(['new']);
    await api.deleteWorldbookEntries('test', () => true);
    expect(getWorldbookScripts(host.data)).toHaveLength(1);
    expect((await api.getWorldbook('test')).at(-1)?.name).toBe(DUMMY_NAME);
    await api.updateWorldbookWith('test', entries =>
      entries.map(entry => ({ ...entry, extra: { tavern_helper: { scripts: [] } } })),
    );
    expect(getWorldbookScripts(host.data)).toEqual([]);
  });

  it('preserves bindings and unknown extra through legacy replacement and permits explicit edits', async () => {
    const api = await import('../src/function/lorebook_entry');
    await api.replaceLorebookEntries('test', [{ comment: 'ordinary' }]);
    await api.createLorebookEntries('test', [{ comment: 'new' }]);
    await api.deleteLorebookEntries('test', [MAX_UID]);
    const entries = await api.getLorebookEntries('test');
    expect(entries.at(-1)?.comment).toBe(DUMMY_NAME);
    expect(host.data.entries[MAX_UID].extra.unknown).toEqual({ keep: true });
    await api.setLorebookEntries('test', [{ uid: MAX_UID, extra: { tavern_helper: { scripts: [] } } }]);
    expect(getWorldbookScripts(host.data)).toEqual([]);
    expect(host.data.metadata).toEqual({ keep: true });
  });
});
