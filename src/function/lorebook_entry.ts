import { reloadEditorDebounced } from '@/compatibility';

import { loadWorldInfo, saveWorldInfo, world_names } from '@sillytavern/scripts/world-info';

import log from 'loglevel';

interface LorebookEntry {
  uid: number;
  display_index: number;

  comment: string;
  enabled: boolean;
  type: 'constant' | 'selective' | 'vectorized';
  position:
    | 'before_character_definition' // 角色定义之前
    | 'after_character_definition' // 角色定义之后
    | 'before_example_messages' // 示例消息之前
    | 'after_example_messages' // 示例消息之后
    | 'before_author_note' // 作者注释之前
    | 'after_author_note' // 作者注释之后
    | 'at_depth_as_system' // @D⚙
    | 'at_depth_as_assistant' // @D👤
    | 'at_depth_as_user'; // @D🤖
  depth: number | null;
  order: number;
  probability: number;

  /** @deprecated 请使用 `keys` 代替 */
  key: string[];
  keys: string[];
  logic: 'and_any' | 'and_all' | 'not_all' | 'not_any';
  /** @deprecated 请使用 `filters` 代替 */
  filter: string[];
  filters: string[];

  scan_depth: 'same_as_global' | number;
  case_sensitive: 'same_as_global' | boolean;
  match_whole_words: 'same_as_global' | boolean;
  use_group_scoring: 'same_as_global' | boolean;
  automation_id: string | null;

  exclude_recursion: boolean;
  prevent_recursion: boolean;
  delay_until_recursion: boolean | number;

  content: string;

  group: string;
  group_prioritized: boolean;
  group_weight: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
}

interface _OriginalLorebookEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  vectorized: boolean;
  selective: boolean;
  selectiveLogic: 0 | 1 | 2 | 3; // 0: and_any, 1: and_all, 2: not_any, 3: not_all
  addMemo: boolean;
  order: number;
  position: number;
  disable: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  delayUntilRecursion: number;
  probability: number;
  useProbability: boolean;
  depth: number;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  role: 0 | 1 | 2; // 0: system, 1: user, 2: assistant
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
  displayIndex: number;
}

const default_original_lorebook_entry: Omit<_OriginalLorebookEntry, 'uid' | 'displayIndex'> = {
  key: [],
  keysecondary: [],
  comment: '',
  content: '',
  constant: false,
  vectorized: false,
  selective: true,
  selectiveLogic: 0,
  addMemo: true,
  order: 100,
  position: 0,
  disable: false,
  excludeRecursion: false,
  preventRecursion: false,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
  delayUntilRecursion: 0,
  probability: 100,
  useProbability: true,
  depth: 4,
  group: '',
  groupOverride: false,
  groupWeight: 100,
  scanDepth: null,
  caseSensitive: null,
  matchWholeWords: null,
  useGroupScoring: null,
  automationId: '',
  role: 0,
  sticky: null,
  cooldown: null,
  delay: null,
};

function toLorebookEntry(entry: _OriginalLorebookEntry): LorebookEntry {
  return {
    uid: entry.uid,
    display_index: entry.displayIndex,

    comment: entry.comment,
    enabled: !entry.disable,
    type: entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'selective',
    // @ts-ignore
    position:
      {
        0: 'before_character_definition',
        1: 'after_character_definition',
        5: 'before_example_messages',
        6: 'after_example_messages',
        2: 'before_author_note',
        3: 'after_author_note',
      }[entry.position] ??
      (entry.role === 0 ? 'at_depth_as_system' : entry.role === 1 ? 'at_depth_as_user' : 'at_depth_as_assistant'),
    depth: entry.position === 4 ? entry.depth : null,
    order: entry.order,
    probability: entry.probability,

    key: entry.key,
    keys: entry.key,
    logic: {
      0: 'and_any',
      1: 'and_all',
      2: 'not_any',
      3: 'not_all',
    }[entry.selectiveLogic as number] as 'and_any' | 'and_all' | 'not_any' | 'not_all',
    filter: entry.keysecondary,
    filters: entry.keysecondary,

    scan_depth: entry.scanDepth ?? 'same_as_global',
    case_sensitive: entry.caseSensitive ?? 'same_as_global',
    match_whole_words: entry.matchWholeWords ?? 'same_as_global',
    use_group_scoring: entry.useGroupScoring ?? 'same_as_global',
    automation_id: entry.automationId || null,

    exclude_recursion: entry.excludeRecursion,
    prevent_recursion: entry.preventRecursion,
    delay_until_recursion: entry.delayUntilRecursion,

    content: entry.content,

    group: entry.group,
    group_prioritized: entry.groupOverride,
    group_weight: entry.groupWeight,
    sticky: entry.sticky || null,
    cooldown: entry.cooldown || null,
    delay: entry.delay || null,
  };
}

interface GetLorebookEntriesOption {
  filter?: 'none' | Partial<LorebookEntry>;
}

export async function getLorebookEntries(
  lorebook: string,
  { filter = 'none' }: GetLorebookEntriesOption = {},
): Promise<LorebookEntry[]> {
  if (!world_names.includes(lorebook)) {
    throw Error(`未能找到世界书 '${lorebook}'`);
  }

  // @ts-ignore
  let entries: LorebookEntry[] = Object.values((await loadWorldInfo(lorebook)).entries).map(toLorebookEntry);
  if (filter !== 'none') {
    entries = entries.filter(entry =>
      Object.entries(filter).every(([field, expected_value]) => {
        // @ts-ignore
        const entry_value = entry[field];
        if (Array.isArray(entry_value)) {
          return (expected_value as string[]).every(value => entry_value.includes(value));
        }
        if (typeof entry_value === 'string') {
          return entry_value.includes(expected_value as string);
        }
        return entry_value === expected_value;
      }),
    );
  }

  log.info(`获取世界书 '${lorebook}' 中的条目, 选项: ${JSON.stringify({ filter })}`);
  return structuredClone(entries);
}

function fromPartialLorebookEntry(
  entry: Pick<LorebookEntry, 'uid' | 'display_index'> & Partial<LorebookEntry>,
): Pick<_OriginalLorebookEntry, 'uid' | 'displayIndex'> & Partial<_OriginalLorebookEntry> {
  if (_.has(entry, 'key') && !_.has(entry, 'keys')) {
    _.set(entry, 'keys', entry.key);
  }
  if (_.has(entry, 'filter') && !_.has(entry, 'filters')) {
    _.set(entry, 'filters', entry.filter);
  }

  const transformers = {
    uid: (value: LorebookEntry['uid']) => ({ uid: value }),
    display_index: (value: LorebookEntry['display_index']) => ({ displayIndex: value }),

    comment: (value: LorebookEntry['comment']) => ({ comment: value }),
    enabled: (value: LorebookEntry['enabled']) => ({ disable: !value }),
    type: (value: LorebookEntry['type']) => ({
      constant: value === 'constant',
      vectorized: value === 'vectorized',
    }),
    position: (value: LorebookEntry['position']) => ({
      position: {
        before_character_definition: 0,
        after_character_definition: 1,
        before_example_messages: 5,
        after_example_messages: 6,
        before_author_note: 2,
        after_author_note: 3,
        at_depth_as_system: 4,
        at_depth_as_user: 4,
        at_depth_as_assistant: 4,
      }[value],
      role:
        // @ts-ignore
        {
          at_depth_as_system: 0,
          at_depth_as_user: 1,
          at_depth_as_assistant: 2,
        }[value] ?? null,
    }),
    depth: (value: LorebookEntry['depth']) => ({ depth: value === null ? 4 : value }),
    order: (value: LorebookEntry['order']) => ({ order: value }),
    probability: (value: LorebookEntry['probability']) => ({ probability: value }),

    keys: (value: LorebookEntry['keys']) => ({ key: value }),
    logic: (value: LorebookEntry['logic']) => ({
      selectiveLogic: {
        and_any: 0,
        and_all: 1,
        not_any: 2,
        not_all: 3,
      }[value],
    }),
    filters: (value: LorebookEntry['filter']) => ({ keysecondary: value }),

    scan_depth: (value: LorebookEntry['scan_depth']) => ({ scanDepth: value === 'same_as_global' ? null : value }),
    case_sensitive: (value: LorebookEntry['case_sensitive']) => ({
      caseSensitive: value === 'same_as_global' ? null : value,
    }),
    match_whole_words: (value: LorebookEntry['match_whole_words']) => ({
      matchWholeWords: value === 'same_as_global' ? null : value,
    }),
    use_group_scoring: (value: LorebookEntry['use_group_scoring']) => ({
      useGroupScoring: value === 'same_as_global' ? null : value,
    }),
    automation_id: (value: LorebookEntry['automation_id']) => ({ automationId: value === null ? '' : value }),

    exclude_recursion: (value: LorebookEntry['exclude_recursion']) => ({ excludeRecursion: value }),
    prevent_recursion: (value: LorebookEntry['prevent_recursion']) => ({ preventRecursion: value }),
    delay_until_recursion: (value: LorebookEntry['delay_until_recursion']) => ({ delayUntilRecursion: value }),

    content: (value: LorebookEntry['content']) => ({ content: value }),

    group: (value: LorebookEntry['group']) => ({ group: value }),
    group_prioritized: (value: LorebookEntry['group_prioritized']) => ({ groupOverride: value }),
    group_weight: (value: LorebookEntry['group_weight']) => ({ groupWeight: value }),
    sticky: (value: LorebookEntry['sticky']) => ({ sticky: value === null ? 0 : value }),
    cooldown: (value: LorebookEntry['cooldown']) => ({ cooldown: value === null ? 0 : value }),
    delay: (value: LorebookEntry['delay']) => ({ delay: value === null ? 0 : value }),
  };

  return _.merge(
    {},
    default_original_lorebook_entry,
    ...Object.entries(entry)
      .filter(([_, value]) => value !== undefined)
      // @ts-ignore
      .map(([key, value]) => transformers[key]?.(value)),
  );
}

const MAX_UID = 1_000_000;

function handleLorebookEntriesCollision(
  entries: Partial<LorebookEntry>[],
): Array<Pick<LorebookEntry, 'uid' | 'display_index'> & Partial<LorebookEntry>> {
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

  let max_display_index = _.max(entries.map(entry => entry.display_index ?? -1)) ?? -1;
  return entries.map(entry => ({
    ...entry,
    uid: handle_uid_collision(entry.uid),
    display_index: entry.display_index ?? ++max_display_index,
  }));
}

export async function replaceLorebookEntries(lorebook: string, entries: Partial<LorebookEntry>[]): Promise<void> {
  if (!world_names.includes(lorebook)) {
    throw Error(`未能找到世界书 '${lorebook}'`);
  }

  const data = {
    entries: _.merge(
      {},
      ...handleLorebookEntriesCollision(entries)
        .map(fromPartialLorebookEntry)
        .map(entry => ({ [entry.uid]: entry })),
    ),
  };
  await saveWorldInfo(lorebook, data);
  reloadEditorDebounced(lorebook);

  log.info(`更新世界书 '${lorebook}' 中的条目`);
}

type LorebookEntriesUpdater =
  | ((entries: LorebookEntry[]) => Partial<LorebookEntry>[])
  | ((entries: LorebookEntry[]) => Promise<Partial<LorebookEntry>[]>);

export async function updateLorebookEntriesWith(
  lorebook: string,
  updater: LorebookEntriesUpdater,
): Promise<LorebookEntry[]> {
  log.info(`对世界书 '${lorebook}' 中的条目进行更新`);
  await replaceLorebookEntries(lorebook, await updater(await getLorebookEntries(lorebook)));
  return getLorebookEntries(lorebook);
}

export async function setLorebookEntries(
  lorebook: string,
  entries: Array<Pick<LorebookEntry, 'uid'> & Partial<LorebookEntry>>,
): Promise<LorebookEntry[]> {
  return await updateLorebookEntriesWith(lorebook, data => {
    for (const entry_to_set of entries) {
      const data_entry = data.find(entry => entry.uid === entry_to_set.uid);
      if (data_entry) {
        _.merge(data_entry, entry_to_set);
      }
    }
    return data;
  });
}

export async function createLorebookEntries(
  lorebook: string,
  entries: Partial<LorebookEntry>[],
): Promise<{ entries: LorebookEntry[]; new_uids: number[] }> {
  const new_uids: number[] = [];
  const updated_entries = await updateLorebookEntriesWith(lorebook, data => {
    const uid_set = new Set(data.map(entry => entry.uid));
    const get_free_uid = () => {
      for (let i = 0; i < MAX_UID; ++i) {
        if (!uid_set.has(i)) {
          uid_set.add(i);
          new_uids.push(i);
          return i;
        }
      }
      throw Error(`无法找到可用的世界书条目 uid`);
    };

    entries.forEach(entry => (entry.uid = get_free_uid()));
    return [...data, ...entries];
  });
  return { entries: updated_entries, new_uids: new_uids };
}

export async function deleteLorebookEntries(
  lorebook: string,
  uids: number[],
): Promise<{ entries: LorebookEntry[]; delete_occurred: boolean }> {
  let deleted: boolean = false;
  const updated_entires = await updateLorebookEntriesWith(lorebook, data => {
    const removed_data = _.remove(data, entry => uids.includes(entry.uid));
    deleted = removed_data.length > 0;
    return data;
  });
  return { entries: updated_entires, delete_occurred: deleted };
}

//----------------------------------------------------------------------------------------------------------------------
/** @deprecated 请使用 `createLorebookEntries` 代替 */
export async function createLorebookEntry(lorebook: string, field_values: Partial<LorebookEntry>): Promise<number> {
  return (await createLorebookEntries(lorebook, [field_values])).new_uids[0];
}

/** @deprecated 请使用 `deleteLorebookEntries` 代替 */
export async function deleteLorebookEntry(lorebook: string, uid: number): Promise<boolean> {
  return (await deleteLorebookEntries(lorebook, [uid])).delete_occurred;
}
