import {
  getCharLorebooks,
  getChatLorebook,
  getOrCreateChatLorebook,
  setChatLorebook,
  setCurrentCharLorebooks,
} from '@/function/lorebook';
import { reloadEditor, reloadEditorDebounced } from '@/util/compatibility';
import { saveSettingsDebounced } from '@sillytavern/script';
import {
  createNewWorldInfo,
  deleteWorldInfo,
  getWorldInfoSettings,
  loadWorldInfo,
  parseRegexFromString,
  saveWorldInfo,
  selected_world_info,
  world_names,
} from '@sillytavern/scripts/world-info';
import { LiteralUnion, PartialDeep } from 'type-fest';

export function getWorldbookNames(): string[] {
  return klona(world_names);
}

export function getGlobalWorldbookNames(): string[] {
  return klona((getWorldInfoSettings().world_info as { globalSelect: string[] }).globalSelect);
}
export async function rebindGlobalWorldbooks(worldbook_names: string[]): Promise<void> {
  const $world_info = $('#world_info');
  $world_info.find('option[value!=""]').remove();
  $world_info.append(
    world_names.map((item, i) => {
      const should_select = worldbook_names.includes(item);
      return new Option(item, String(i), should_select, should_select);
    }),
  );

  selected_world_info.length = 0;
  selected_world_info.push(...worldbook_names);
  _.set(getWorldInfoSettings().world_info, 'globalSelect', selected_world_info);
  saveSettingsDebounced();
}

type CharWorldbooks = {
  primary: string | null;
  additional: string[];
};
export function getCharWorldbookNames(character_name: LiteralUnion<'current', string>): CharWorldbooks {
  return getCharLorebooks(character_name === 'current' ? undefined : { name: character_name });
}
export async function rebindCharWorldbooks(character_name: 'current', char_worldbooks: CharWorldbooks): Promise<void> {
  if (character_name !== 'current') {
    throw Error(`目前不支持对非当前角色卡调用 bindCharWorldbooks`);
  }
  // TODO: 重做 characters.ts, 然后直接访问后端来修改这里
  return setCurrentCharLorebooks(char_worldbooks);
}

export function getChatWorldbookName(chat_name: 'current'): string | null {
  if (chat_name !== 'current') {
    throw Error(`目前不支持对非当前聊天调用 getChatWorldbookName`);
  }
  return getChatLorebook();
}
export async function rebindChatWorldbook(chat_name: 'current', worldbook_name: string): Promise<void> {
  if (chat_name !== 'current') {
    throw Error(`目前不支持对非当前聊天调用 getChatWorldbookName`);
  }
  await setChatLorebook(worldbook_name);
}
export async function getOrCreateChatWorldbook(chat_name: 'current', worldbook_name?: string): Promise<string> {
  if (chat_name !== 'current') {
    throw Error(`目前不支持对非当前聊天调用 getChatWorldbookName`);
  }
  return await getOrCreateChatLorebook(worldbook_name);
}

type WorldbookEntry = {
  uid: number;
  name: string;
  enabled: boolean;

  strategy: {
    type: 'constant' | 'selective' | 'vectorized';
    keys: (string | RegExp)[];
    keys_secondary: { logic: 'and_any' | 'and_all' | 'not_all' | 'not_any'; keys: (string | RegExp)[] };
    scan_depth: 'same_as_global' | number;
  };
  position: {
    type:
      | 'before_character_definition'
      | 'after_character_definition'
      | 'before_example_messages'
      | 'after_example_messages'
      | 'before_author_note'
      | 'after_author_note'
      | 'at_depth';
    role: 'system' | 'assistant' | 'user';
    depth: number;
    order: number;
  };

  content: string;

  probability: number;
  recursion: {
    prevent_incoming: boolean;
    prevent_outgoing: boolean;
    delay_until: null | number;
  };
  effect: {
    sticky: null | number;
    cooldown: null | number;
    delay: null | number;
  };

  extra?: Record<string, any>;
};

const _default_implicit_keys: _ImplicitKeys = {
  addMemo: true,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
  group: '',
  groupOverride: false,
  groupWeight: 100,
  caseSensitive: null,
  matchWholeWords: null,
  useGroupScoring: null,
  automationId: '',
} as const;
type _ImplicitKeys = {
  addMemo: true;
  matchPersonaDescription: false;
  matchCharacterDescription: false;
  matchCharacterPersonality: false;
  matchCharacterDepthPrompt: false;
  matchScenario: false;
  matchCreatorNotes: false;
  group: '';
  groupOverride: false;
  groupWeight: 100;
  caseSensitive: null;
  matchWholeWords: null;
  useGroupScoring: null;
  automationId: '';
};
type _OriginalWorldbookEntry = {
  uid: number;
  displayIndex: number;
  comment: string;
  disable: boolean;

  constant: boolean;
  selective: boolean;
  key: string[];
  selectiveLogic: 0 | 1 | 2 | 3; // 0: and_any, 1: not_all, 2: not_any, 3: and_all
  keysecondary: string[];
  scanDepth: number | null;
  vectorized: boolean;
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  role: 0 | 1 | 2 | null; // 0: system, 1: user, 2: assistant
  depth: number;
  order: number;

  content: string;

  useProbability: boolean;
  probability: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean | number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;

  extra?: Record<string, any>;
};
function toWorldbookEntry(entry: _OriginalWorldbookEntry & _ImplicitKeys): WorldbookEntry & Partial<_ImplicitKeys> {
  let result = _({})
    .set('uid', entry.uid)
    .set('name', entry.comment)
    .set('enabled', !entry.disable)

    .set('strategy.type', entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'selective')
    .set(
      'strategy.keys',
      entry.key.map(value => parseRegexFromString(value) ?? value),
    )
    .set('strategy.keys_secondary', {
      logic: ({ 0: 'and_any', 1: 'not_all', 2: 'not_any', 3: 'and_all' } as const)[entry.selectiveLogic],
      keys: entry.keysecondary.map(value => parseRegexFromString(value) ?? value),
    })
    .set('strategy.scan_depth', entry.scanDepth ?? 'same_as_global')

    .set(
      'position.type',
      {
        0: 'before_character_definition',
        1: 'after_character_definition',
        5: 'before_example_messages',
        6: 'after_example_messages',
        2: 'before_author_note',
        3: 'after_author_note',
        4: 'at_depth',
      }[entry.position],
    )
    .set('position.role', ({ 0: 'system', 1: 'user', 2: 'assistant' } as const)[entry.role ?? 0])
    .set('position.depth', entry.depth)
    .set('position.order', entry.order)

    .set('content', entry.content)

    .set('probability', entry.useProbability ? entry.probability : 100)

    .set('recursion.prevent_incoming', entry.excludeRecursion)
    .set('recursion.prevent_outgoing', entry.preventRecursion)
    .set(
      'recursion.delay_until',
      typeof entry.delayUntilRecursion === 'number' && entry.delayUntilRecursion > 0 ? entry.delayUntilRecursion : null,
    )

    .set('effect.sticky', typeof entry.sticky === 'number' && entry.sticky > 0 ? entry.sticky : null)
    .set('effect.cooldown', typeof entry.cooldown === 'number' && entry.cooldown > 0 ? entry.cooldown : null)
    .set('effect.delay', typeof entry.delay === 'number' && entry.delay > 0 ? entry.delay : null);

  if (entry.extra) {
    result = result.set('extra', entry.extra);
  }

  result = result.merge(_.pick(entry, Object.keys(_default_implicit_keys)));

  return result.value() as WorldbookEntry & _ImplicitKeys;
}
function fromWorldbookEntry(
  entry: Pick<WorldbookEntry, 'uid'> & PartialDeep<WorldbookEntry & _ImplicitKeys>,
  display_index: number,
): _OriginalWorldbookEntry & _ImplicitKeys {
  let result = _({})
    .set('uid', entry.uid)
    .set('displayIndex', display_index)
    .set('comment', entry.name ?? '')
    .set('disable', !(entry.enabled ?? true))

    .set('constant', entry?.strategy?.type ? entry?.strategy?.type === 'constant' : true)
    .set('selective', entry?.strategy?.type === 'selective')
    .set('key', entry?.strategy?.keys?.map(_.toString) ?? [])
    .set(
      'selectiveLogic',
      (
        {
          and_any: 0,
          not_all: 1,
          not_any: 2,
          and_all: 3,
        } as const
      )[entry?.strategy?.keys_secondary?.logic ?? 'and_any'],
    )
    .set('keysecondary', entry?.strategy?.keys_secondary?.keys?.map(_.toString) ?? [])
    .set('scanDepth', entry?.strategy?.scan_depth === 'same_as_global' ? null : (entry?.strategy?.scan_depth ?? null))
    .set('vectorized', entry?.strategy?.type === 'vectorized')
    .set(
      'position',
      {
        before_character_definition: 0,
        after_character_definition: 1,
        before_example_messages: 5,
        after_example_messages: 6,
        before_author_note: 2,
        after_author_note: 3,
        at_depth: 4,
      }[entry?.position?.type ?? 'at_depth'],
    )
    .set('role', ({ system: 0, user: 1, assistant: 2 } as const)[entry?.position?.role ?? 'system'])
    .set('depth', entry?.position?.depth ?? 4)
    .set('order', entry?.position?.order ?? 100)

    .set('content', entry.content ?? '')

    .set('useProbability', true)
    .set('probability', entry.probability ?? 100)
    .set('excludeRecursion', entry.recursion?.prevent_incoming ?? false)
    .set('preventRecursion', entry.recursion?.prevent_outgoing ?? false)
    .set('delayUntilRecursion', entry.recursion?.delay_until ?? false)
    .set('sticky', entry.effect?.sticky ?? null)
    .set('cooldown', entry.effect?.cooldown ?? null)
    .set('delay', entry.effect?.delay ?? null);

  if (entry.extra) {
    result = result.set('extra', entry.extra);
  }

  result = result.merge(_default_implicit_keys as object).merge(_.pick(entry, Object.keys(_default_implicit_keys)));

  return result.value() as _OriginalWorldbookEntry & _ImplicitKeys;
}

function handleWorldbookEntriesCollision(
  entries: PartialDeep<WorldbookEntry>[],
): Array<Pick<WorldbookEntry, 'uid'> & PartialDeep<WorldbookEntry & _ImplicitKeys>> {
  const MAX_UID = 1_000_000 as const;

  const uid_set = new Set<number>();
  const handle_uid_collision = (index: number | undefined) => {
    if (index === undefined) {
      index = _.random(0, MAX_UID - 1);
    }

    let i = 1;
    while (true) {
      if (!uid_set.has(index)) {
        uid_set.add(index);
        return index;
      }

      index = (index + i * i) % MAX_UID;
      ++i;
    }
  };

  return entries.map(entry => ({
    ...entry,
    uid: handle_uid_collision(entry.uid),
  }));
}
export async function createWorldbook(worldbook_name: string, worldbook: WorldbookEntry[] = []): Promise<boolean> {
  if (getWorldbookNames().includes(worldbook_name)) {
    return false;
  }
  return await createOrReplaceWorldbook(worldbook_name, worldbook);
}

interface ReplaceWorldbookOptions {
  render?: 'debounced' | 'immediate';
}
export async function createOrReplaceWorldbook(
  worldbook_name: string,
  worldbook: PartialDeep<WorldbookEntry>[] = [],
  { render = 'debounced' }: ReplaceWorldbookOptions = {},
): Promise<boolean> {
  const is_existing = getWorldbookNames().includes(worldbook_name);
  if (!getWorldbookNames().includes(worldbook_name)) {
    const success = await createNewWorldInfo(worldbook_name, { interactive: false });
    if (!success) {
      return false;
    }
  }
  if (is_existing || worldbook.length > 0) {
    await saveWorldInfo(worldbook_name, {
      entries: _.merge(
        {},
        ..._(handleWorldbookEntriesCollision(worldbook))
          .map(fromWorldbookEntry)
          .map(entry => ({ [entry.uid]: entry }))
          .value(),
      ),
    });
    if (render === 'debounced') {
      reloadEditorDebounced(worldbook_name);
    } else {
      reloadEditor(worldbook_name);
    }
  }
  return !is_existing;
}

export async function deleteWorldbook(worldbook_name: string): Promise<boolean> {
  return await deleteWorldInfo(worldbook_name);
}

// TODO: rename 需要处理世界书绑定
// export function renameWorldbook(old_name: string, new_name: string): boolean;

export async function getWorldbook(worldbook_name: string): Promise<WorldbookEntry[]> {
  if (!getWorldbookNames().includes(worldbook_name)) {
    throw Error(`未能找到世界书 '${worldbook_name}'`);
  }
  const original_worldbook_entries = await loadWorldInfo(worldbook_name).then(
    data => (data! as { entries: { [uid: number]: _OriginalWorldbookEntry & _ImplicitKeys } }) ?? {},
  );

  return klona(_(original_worldbook_entries.entries).values().sortBy('displayIndex').map(toWorldbookEntry).value());
}

export async function replaceWorldbook(
  worldbook_name: string,
  worldbook: PartialDeep<WorldbookEntry>[],
  options?: ReplaceWorldbookOptions,
): Promise<void> {
  if (!getWorldbookNames().includes(worldbook_name)) {
    throw Error(`未能找到世界书 '${worldbook_name}'`);
  }
  await createOrReplaceWorldbook(worldbook_name, worldbook, options);
}

type WorldbookUpdater =
  | ((worldbook: WorldbookEntry[]) => PartialDeep<WorldbookEntry>[])
  | ((worldbook: WorldbookEntry[]) => Promise<PartialDeep<WorldbookEntry>[]>);
export async function updateWorldbookWith(
  worldbook_name: string,
  updater: WorldbookUpdater,
  options?: ReplaceWorldbookOptions,
): Promise<WorldbookEntry[]> {
  await replaceWorldbook(worldbook_name, await updater(await getWorldbook(worldbook_name)), options);
  return await getWorldbook(worldbook_name);
}

export async function createWorldbookEntries(
  worldbook_name: string,
  new_entries: PartialDeep<WorldbookEntry>[],
  options?: ReplaceWorldbookOptions,
): Promise<{ worldbook: WorldbookEntry[]; new_entries: WorldbookEntry[] }> {
  let slice_start;
  const worldbook = await updateWorldbookWith(
    worldbook_name,
    data => {
      slice_start = data.length;
      return [...data, ...new_entries];
    },
    options,
  );
  return { worldbook, new_entries: worldbook.slice(slice_start) };
}

export async function deleteWorldbookEntries(
  worldbook_name: string,
  predicate: (entry: WorldbookEntry) => boolean,
  options?: ReplaceWorldbookOptions,
): Promise<{ worldbook: WorldbookEntry[]; deleted_entries: WorldbookEntry[] }> {
  let deleted_entries: WorldbookEntry[] = [];
  const worldbook = await updateWorldbookWith(
    worldbook_name,
    data => {
      deleted_entries = _.remove(data, predicate);
      return data;
    },
    options,
  );
  return { worldbook, deleted_entries };
}
