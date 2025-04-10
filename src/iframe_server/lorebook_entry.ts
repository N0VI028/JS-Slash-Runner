import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/_impl';

import { debounce } from '@sillytavern/scripts/utils';
import {
  createWorldInfoEntry,
  deleteWIOriginalDataValue,
  loadWorldInfo,
  originalWIDataKeyMap,
  saveWorldInfo,
  setWIOriginalDataValue,
  world_names,
} from '@sillytavern/scripts/world-info';

interface IframeGetLorebookEntries extends IframeMessage {
  request: '[LorebookEntry][getLorebookEntries]';
  lorebook: string;
  option: Required<GetLorebookEntriesOption>;
}

interface IframeSetLorebookEntries extends IframeMessage {
  request: '[LorebookEntry][setLorebookEntries]';
  lorebook: string;
  entries: (Pick<LorebookEntry, 'uid'> & Partial<Omit<LorebookEntry, 'uid'>>)[];
}

interface IframeCreateLorebookEntry extends IframeMessage {
  request: '[LorebookEntry][createLorebookEntry]';
  lorebook: string;
  field_values: Partial<Omit<LorebookEntry, 'uid'>>;
}

interface IframeDeleteLorebookEntry extends IframeMessage {
  request: '[LorebookEntry][deleteLorebookEntry]';
  lorebook: string;
  lorebook_uid: number;
}

function toLorebookEntry(entry: any): LorebookEntry {
  return {
    uid: entry.uid,
    display_index: entry.displayIndex,
    comment: entry.comment,
    enabled: !entry.disable,
    type: entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'selective',
    position:
      // @ts-ignore
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
    logic: {
      0: 'and_any',
      1: 'and_all',
      2: 'not_any',
      3: 'not_all',
    }[entry.selectiveLogic as number] as 'and_any' | 'and_all' | 'not_any' | 'not_all',
    filter: entry.keysecondary,

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

function fromPartialLorebookEntry(entry: Partial<LorebookEntry>): any {
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

    key: (value: LorebookEntry['key']) => ({ key: value }),
    logic: (value: LorebookEntry['logic']) => ({
      selectiveLogic: {
        and_any: 0,
        and_all: 1,
        not_any: 2,
        not_all: 3,
      }[value],
    }),
    filter: (value: LorebookEntry['filter']) => ({ keysecondary: value }),

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

  return Object.entries(entry)
    .filter(([_, value]) => value !== undefined)
    .reduce(
      (result, [field, value]) => ({
        ...result,
        // @ts-ignore
        ...transformers[field]?.(value),
      }),
      {},
    );
}

function assignFieldValuesToWiEntry(data: any, wi_entry: any, field_values: any) {
  Object.entries(field_values).forEach(([field, value]) => {
    wi_entry[field] = value;
    // @ts-ignore
    const original_wi_mapped_key = originalWIDataKeyMap[field];
    if (original_wi_mapped_key) {
      // @ts-ignore
      setWIOriginalDataValue(data, wi_entry.uid, original_wi_mapped_key, value);
    }
  });
}

function reloadEditor(file: string): void {
  const currentIndex = Number($('#world_editor_select').val());
  const selectedIndex = world_names.indexOf(file);
  if (selectedIndex !== -1 && currentIndex === selectedIndex) {
    $('#world_editor_select').val(selectedIndex).trigger('change');
  }
}

const reloadEditorDebounced = debounce(reloadEditor);

export function registerIframeLorebookEntryHandler() {
  registerIframeHandler(
    '[LorebookEntry][getLorebookEntries]',
    async (event: MessageEvent<IframeGetLorebookEntries>): Promise<LorebookEntry[]> => {
      const lorebook = event.data.lorebook;
      const option = event.data.option;

      if (!world_names.includes(lorebook)) {
        throw Error(`未能找到世界书 '${lorebook}'`);
      }

      // @ts-ignore
      let entries: LorebookEntry[] = Object.values((await loadWorldInfo(lorebook)).entries).map(toLorebookEntry);
      if (option.filter !== 'none') {
        entries = entries.filter(entry =>
          Object.entries(option.filter).every(([field, expected_value]) => {
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

      console.info(`${getLogPrefix(event)}获取世界书 '${lorebook}' 中的条目, 选项: ${JSON.stringify(option)}`);
      return entries;
    },
  );

  registerIframeHandler(
    '[LorebookEntry][setLorebookEntries]',
    async (event: MessageEvent<IframeSetLorebookEntries>): Promise<void> => {
      const lorebook = event.data.lorebook;
      const entries = event.data.entries;

      if (!world_names.includes(lorebook)) {
        throw Error(`未能找到世界书 '${lorebook}'`);
      }
      const data = await loadWorldInfo(lorebook);

      const process_entry = async (entry: (typeof entries)[0]): Promise<void> => {
        // @ts-ignore
        const wi_entry = data.entries[entry.uid];
        if (!wi_entry) {
          throw Error(`未能在世界书 '${lorebook}' 中找到 uid=${entry.uid} 的条目`);
        }
        assignFieldValuesToWiEntry(data, wi_entry, fromPartialLorebookEntry(entry));
      };

      await Promise.all(entries.map(process_entry));
      await saveWorldInfo(lorebook, data);
      reloadEditorDebounced(lorebook);

      console.info(
        `${getLogPrefix(event)}修改世界书 '${lorebook}' 中以下条目的以下字段:\n${JSON.stringify(
          entries,
          undefined,
          2,
        )}`,
      );
    },
  );

  registerIframeHandler(
    '[LorebookEntry][createLorebookEntry]',
    async (event: MessageEvent<IframeCreateLorebookEntry>): Promise<number> => {
      const lorebook = event.data.lorebook;
      const field_values = event.data.field_values;

      if (!world_names.includes(lorebook)) {
        throw Error(`未能找到世界书 '${lorebook}'`);
      }
      const data = await loadWorldInfo(lorebook);
      const wi_entry = createWorldInfoEntry(lorebook, data) as any;
      const partial_lorebook_entry = fromPartialLorebookEntry(field_values);
      if (partial_lorebook_entry.uid) {
        delete partial_lorebook_entry.uid;
      }
      assignFieldValuesToWiEntry(data, wi_entry, partial_lorebook_entry);

      await saveWorldInfo(lorebook, data);
      reloadEditorDebounced(lorebook);

      console.info(
        `${getLogPrefix(event)}在世界书 '${lorebook}' 中新建 uid='${wi_entry.uid}' 条目, 并设置内容:\n${JSON.stringify(
          field_values,
          undefined,
          2,
        )}`,
      );
      return wi_entry.uid;
    },
  );

  registerIframeHandler(
    '[LorebookEntry][deleteLorebookEntry]',
    async (event: MessageEvent<IframeDeleteLorebookEntry>): Promise<boolean> => {
      const lorebook = event.data.lorebook;
      const lorebook_uid = event.data.lorebook_uid;

      const data = await loadWorldInfo(lorebook);
      // QUESTION: 好像没办法从 data 检测世界书是否存在?
      let deleted = false;
      // @ts-ignore 18046
      if (data.entries[lorebook_uid]) {
        // @ts-ignore 18046
        delete data.entries[lorebook_uid];
        deleted = true;
      }
      if (deleted) {
        // @ts-ignore 2345
        deleteWIOriginalDataValue(data, lorebook_uid);
        await saveWorldInfo(lorebook, data);
        reloadEditorDebounced(lorebook);
      }

      console.info(
        `${getLogPrefix(event)}删除世界书 '${lorebook}' 中的 uid='${lorebook_uid}' 条目${deleted ? '成功' : '失败'}`,
      );
      return deleted;
    },
  );
}
