import { watchIgnorable } from '@vueuse/core';
import { klona } from 'klona';
import { createPinia, defineStore, disposePinia, setActivePinia } from 'pinia';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markRaw, nextTick, readonly, ref, watch } from 'vue';
import { z } from 'zod';

const host = vi.hoisted(() => ({
  id: '0',
  characters: [] as any[],
  listeners: [] as (() => void)[],
  writeExtensionField: vi.fn(),
}));

vi.mock('@sillytavern/script', () => ({
  get this_chid() {
    return host.id;
  },
  characters: host.characters,
  event_types: { CHAT_CHANGED: 'chat_changed' },
  eventSource: {
    makeFirst: (_event: string, callback: () => void) => host.listeners.unshift(callback),
    on: vi.fn(),
    once: vi.fn(),
  },
}));
vi.mock('@sillytavern/scripts/world-info', () => ({ loadWorldInfo: vi.fn(), saveWorldInfo: vi.fn() }));
vi.mock('@/util/compatibility', () => ({ fromCharacterBook: vi.fn(), updateWorldInfoList: vi.fn() }));
vi.mock('@/util/tavern', () => ({ writeExtensionField: host.writeExtensionField }));
vi.mock('@/panel/script/export_by', () => ({ collectExportSummaryItems: vi.fn(), showExportSummaryToast: vi.fn() }));
// Isolate store switching from schema migrations and the host's Zod version.
vi.mock('@/type/backward', () => ({ CharacterSettings: {} }));
vi.mock('@/type/scripts', () => ({ flattenScriptTree: vi.fn() }));
vi.mock('@/type/settings', () => ({
  setting_field: 'tavern_helper',
  CharacterSettings: z.object({
    scripts: z.array(z.any()).default([]),
    variables: z.record(z.string(), z.any()).default({}),
  }),
}));
vi.mock('@/store/settings', async () => ({
  ...(await import('@/store/settings/character')),
  usePresetSettingsStore: () => ({ name: 'preset' }),
}));

// The application supplies these through auto-imports and browser globals.
for (const [name, value] of Object.entries({ defineStore, ref, readonly, watch, watchIgnorable, klona, z })) {
  vi.stubGlobal(name, value);
}
vi.stubGlobal('_', {
  get: (object: any, path: string) => path.split('.').reduce((value, key) => value?.[key], object),
  isArray: Array.isArray,
});
vi.stubGlobal('$', () => ({ on: vi.fn() }));

const { useCharacterSettingsStore } = await import('@/store/settings/character');
const { useVariableSchemasStore } = await import('@/store/variable_schemas');

function makeCharacter(avatar: string, scriptId: string, name = 'Same name') {
  return {
    name,
    avatar,
    data: {
      extensions: {
        tavern_helper: {
          scripts: [{ type: 'script', id: scriptId, enabled: true, content: scriptId }],
          variables: { owner: scriptId },
        },
      },
    },
  };
}

async function switchTo(id: string) {
  host.id = id;
  host.listeners.forEach(callback => callback());
  await nextTick();
}

let pinia: ReturnType<typeof createPinia>;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  host.id = '0';
  host.listeners.length = 0;
  host.characters.splice(
    0,
    host.characters.length,
    makeCharacter('first.png', 'first-script'),
    makeCharacter('second.png', 'second-script'),
    makeCharacter('third.png', 'third-script', 'Different name'),
  );
  host.writeExtensionField.mockClear();
  vi.stubGlobal('window', { fetch: vi.fn() });
});
afterEach(() => disposePinia(pinia));
afterAll(() => vi.unstubAllGlobals());

describe('character settings on CHAT_CHANGED', () => {
  it('loads each same-name card’s own scripts and variables in both directions', async () => {
    const store = useCharacterSettingsStore();
    await switchTo('1');
    expect(store.id).toBe('1');
    expect(store.settings.scripts[0].id).toBe('second-script');
    expect(store.settings.variables.owner).toBe('second-script');
    await switchTo('0');
    expect(store.settings.scripts[0].id).toBe('first-script');
    expect(store.settings.variables.owner).toBe('first-script');
    expect(host.writeExtensionField).not.toHaveBeenCalled();
  });

  it('saves edits to the newly selected same-name card, not the previous card', async () => {
    const store = useCharacterSettingsStore();
    await switchTo('1');
    store.settings.variables.edited = true;
    await nextTick();
    expect(host.writeExtensionField).toHaveBeenCalledExactlyOnceWith(
      '1',
      'tavern_helper',
      expect.objectContaining({ variables: { owner: 'second-script', edited: true } }),
      true,
    );
  });

  it('does not reload character scripts when changing chats on the same card', async () => {
    const store = useCharacterSettingsStore();
    const settings = store.settings;
    await switchTo('0');
    expect(store.settings).toBe(settings);
    expect(host.writeExtensionField).not.toHaveBeenCalled();
  });

  it('still reloads on different-name switches and renames at the same index', async () => {
    const store = useCharacterSettingsStore();
    await switchTo('2');
    expect(store.settings.variables.owner).toBe('third-script');
    host.characters[2] = makeCharacter('third.png', 'renamed-script', 'Renamed');
    await switchTo('2');
    expect(store.name).toBe('Renamed');
    expect(store.settings.variables.owner).toBe('renamed-script');
    expect(host.writeExtensionField).not.toHaveBeenCalled();
  });

  it('clears character-scoped schemas when switching same-name cards', async () => {
    const schemas = useVariableSchemasStore();
    schemas.global = markRaw(z.object({}));
    const globalSchema = schemas.global;
    schemas.character = markRaw(z.object({}));
    schemas.chat = markRaw(z.object({}));
    schemas.message = markRaw(z.object({}));
    await switchTo('1');
    expect(schemas.character).toBeUndefined();
    expect(schemas.chat).toBeUndefined();
    expect(schemas.message).toBeUndefined();
    expect(schemas.global).toBe(globalSchema);
  });
});
