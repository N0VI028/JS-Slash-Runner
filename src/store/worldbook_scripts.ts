import { useGlobalSettingsStore } from '@/store/settings';
import { flattenScriptTree, type ScriptTree } from '@/type/scripts';
import { getWorldbookScripts, normalizeWorldbookScriptData, setWorldbookScripts } from '@/util/worldbook_script_data';
import { characters, chat_metadata, eventSource, event_types, this_chid } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';
import { getWorldInfoSettings, loadWorldInfo, saveWorldInfo, selected_world_info, world_names } from '@sillytavern/scripts/world-info';

export function getWorldbookScriptRuntimeId(name: string, id: string): string {
  // CSS-safe and contains no "--": _getScriptId uses that iframe-name delimiter.
  const encode = (value: string) => value.split('').map(char => char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  return `worldbook_${encode(name)}_${encode(id)}`;
}

/** Read bindings, never maintain an independent enabled-book list. */
export function getWorldbookScriptGroups() {
  const settings = getWorldInfoSettings().world_info as { charLore?: { name: string; extraBooks: string[] }[] };
  const current = this_chid === undefined ? undefined : characters[Number(this_chid)];
  // Host getCharacterLore uses the current speaker, including in group chats.
  const members = [current].filter(Boolean);
  const character_books = members.flatMap(character => [
    character.data?.extensions?.world,
    ...(settings.charLore?.find(item => item.name === character.avatar.replace(/\.[^/.]+$/, ''))?.extraBooks ?? []),
  ]);
  const seen = new Set<string>();
  return [
    { label: '已开启（全局）', names: [...selected_world_info] },
    { label: '角色卡', names: character_books },
    { label: '聊天', names: [chat_metadata.world_info] },
    { label: 'persona', names: [power_user.persona_description_lorebook] },
    { label: '其他', names: [...world_names] },
  ].map(group => ({ ...group, names: group.names.filter((name): name is string => {
    if (typeof name !== 'string' || !world_names.includes(name) || seen.has(name)) return false;
    seen.add(name);
    return true;
  }) }));
}

export const useWorldbookScriptsStore = defineStore('worldbook_scripts', () => {
  const settings = useGlobalSettingsStore();
  const selected_name = ref('');
  const groups = ref<ReturnType<typeof getWorldbookScriptGroups>>([]);
  const names = computed(() => groups.value.flatMap(group => group.names));
  const books = ref<Record<string, ScriptTree[]>>({});
  const error = ref<unknown>(null);
  const revisions = new Map<string, number>();
  const pending = new Map<string, ScriptTree[]>();
  const dirty = new Set<string>();
  let disposed = false;
  let applying = false;
  let queue = Promise.resolve();
  let generation = 0;
  const report = (reason: unknown) => {
    error.value = reason;
    console.error('[酒馆助手]世界书脚本保存/读取失败', reason);
    toastr.error(String(reason), '[酒馆助手]世界书脚本保存/读取失败');
  };
  const enqueue = (work: () => Promise<boolean>) => {
    const task = queue.then(async () => { if (!disposed) await work(); });
    queue = task.catch(report);
    return task.then(() => !disposed, () => false);
  };
  const persist = (name: string, scripts?: ScriptTree[]) => enqueue(async () => {
    if (!world_names.includes(name)) throw Error(`世界书 '${name}' 已不存在`);
    // Load at execution time: never save a snapshot captured before a normal-entry edit.
    const loaded = await loadWorldInfo(name);
    if (!loaded || !world_names.includes(name)) throw Error(`无法读取世界书 '${name}'`);
    const data = klona(loaded);
    const before = JSON.stringify(data);
    if (scripts) setWorldbookScripts(data, klona(scripts));
    else normalizeWorldbookScriptData(data);
    // The host updates its cache before the network request. Equality after a failed
    // request is not proof of persistence: explicit pending edits must be retried.
    if (scripts || JSON.stringify(data) !== before) await saveWorldInfo(name, data, true);
    return true;
  });
  const writing = new Set<string>();
  const flushPending = (name: string) => {
    const snapshot = pending.get(name);
    if (!snapshot || writing.has(name)) return;
    writing.add(name);
    void persist(name, snapshot).then(success => {
      writing.delete(name);
      if (success && pending.get(name) === snapshot) pending.delete(name);
      else if (success) flushPending(name);
    });
  };
  const enabled_names = computed(() => groups.value.slice(0, 4).flatMap(group => group.names));
  const enabled = computed({ get: () => enabled_names.value.includes(selected_name.value), set: () => {} });
  const source = computed(() => selected_name.value);
  const script_trees = computed({
    get: () => books.value[selected_name.value] ?? [],
    set: (value: ScriptTree[]) => {
      if (!selected_name.value) throw Error('尚未选择世界书');
      books.value[selected_name.value] = value;
    },
  });
  watch(books, () => {
    if (applying) return;
    for (const [name, trees] of Object.entries(books.value)) {
      const snapshot = klona(trees);
      if (_.isEqual(snapshot, saved.get(name))) continue;
      saved.set(name, snapshot);
      revisions.set(name, (revisions.get(name) ?? 0) + 1);
      pending.set(name, snapshot);
      flushPending(name);
    }
  }, { deep: true, flush: 'sync' });
  const saved = new Map<string, ScriptTree[]>();

  async function refresh() {
    if (!settings.app_ready || disposed) return;
    const token = ++generation;
    groups.value = getWorldbookScriptGroups();
    for (const name of pending.keys()) if (world_names.includes(name)) flushPending(name);
    if (!world_names.includes(selected_name.value)) selected_name.value = '';
    await Promise.all(world_names.map(async name => {
      if (Object.hasOwn(books.value, name) && !dirty.has(name)) return;
      const revision = revisions.get(name) ?? 0;
      try {
        const loaded = await loadWorldInfo(name);
        if (!loaded || disposed || !world_names.includes(name) || pending.has(name) || revision !== (revisions.get(name) ?? 0)) return;
        const data = klona(loaded);
        const before = JSON.stringify(data);
        const trees = klona(getWorldbookScripts(data));
        applying = true;
        saved.set(name, klona(trees));
        // Keep runtime inputs stable during ordinary-entry edits, and keep the
        // previous scripts mounted until a changed script payload is available.
        if (!_.isEqual(books.value[name], trees)) books.value[name] = trees;
        dirty.delete(name);
        applying = false;
        if (JSON.stringify(data) !== before) void persist(name);
      } catch (reason) { report(reason); }
    }));
    if (token !== generation) return;
    applying = true;
    for (const name of Object.keys(books.value)) if (!world_names.includes(name)) {
      delete books.value[name];
      saved.delete(name);
      dirty.delete(name);
    }
    applying = false;
  }
  const updated = (name: string) => {
    revisions.set(name, (revisions.get(name) ?? 0) + 1);
    // Local edits take precedence until their serialized write finishes.
    if (!pending.has(name)) {
      dirty.add(name);
    }
    void refresh();
  };
  const settingsUpdated = () => { void refresh(); };
  eventSource.on(event_types.WORLDINFO_UPDATED, updated);
  eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, settingsUpdated);
  watch(() => settings.app_ready, () => { void refresh(); }, { immediate: true });
  // Host rename updates bindings after WORLDINFO_UPDATED and has no completion event.
  // Compare only cheap metadata; unchanged snapshots never reload any books.
  let snapshot = '';
  const timer = setInterval(() => {
    if (!settings.app_ready) return;
    const next = JSON.stringify(getWorldbookScriptGroups());
    if (next !== snapshot) { snapshot = next; void refresh(); }
  }, 1500);
  onScopeDispose(() => {
    disposed = true;
    ++generation;
    clearInterval(timer);
    eventSource.removeListener(event_types.WORLDINFO_UPDATED, updated);
    eventSource.removeListener(event_types.WORLDINFO_SETTINGS_UPDATED, settingsUpdated);
  });
  const activeScripts = (trees: ScriptTree[]) => trees.filter(tree => tree.enabled)
    .flatMap(flattenScriptTree).filter(script => script.enabled);
  const enabled_scripts = computed(() => enabled.value ? activeScripts(script_trees.value) : []);
  const enabled_scripts_with_source = computed(() => enabled_names.value.flatMap(name =>
    activeScripts(books.value[name] ?? []).map(script => ({ source: name, script,
      runtime_id: getWorldbookScriptRuntimeId(name, script.id) }))));
  const script_counts = computed(() => Object.fromEntries(Object.entries(books.value)
    .map(([name, trees]) => [name, trees.flatMap(flattenScriptTree).length])));
  const replaceScripts = (name: string, trees: ScriptTree[]) => {
    if (!world_names.includes(name)) throw Error(`世界书 '${name}' 已不存在`);
    books.value[name] = trees;
  };
  return { selected_name, groups, names, script_counts, enabled, script_trees, source, enabled_scripts,
    enabled_scripts_with_source, refresh, replaceScripts, error: readonly(error) };
});
