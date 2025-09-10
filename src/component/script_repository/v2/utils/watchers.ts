import { setActivePinia, type Pinia } from 'pinia';
import { computed, watch } from 'vue';
import type { ScriptType } from '../schemas/script.schema';

async function getStores(pinia: Pinia) {
  const { useGlobalScriptStore, useCharacterScriptStore, usePresetScriptStore } = await import('../stores/factory');
  const globalStore = useGlobalScriptStore(pinia);
  const characterStore = useCharacterScriptStore(pinia);
  const presetStore = usePresetScriptStore(pinia);
  return { globalStore, characterStore, presetStore };
}

async function getRuntime() {
  const { useScriptRuntime } = await import('../composables/useScriptRuntime');
  return useScriptRuntime();
}

function toEnabledMap(list: Array<{ id: string; enabled: boolean }>): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const s of list) map[s.id] = !!s.enabled;
  return map;
}

function diffEnabled(prev: Record<string, boolean>, next: Record<string, boolean>) {
  const changed: Array<{ id: string; enabled: boolean }> = [];
  const ids = new Set([...Object.keys(prev), ...Object.keys(next)]);
  ids.forEach(id => {
    const a = !!prev[id];
    const b = !!next[id];
    if (a !== b) changed.push({ id, enabled: b });
  });
  return changed;
}

export async function registerScriptWatchers(pinia: Pinia): Promise<void> {
  if (!pinia) return;
  setActivePinia(pinia);

  const { globalStore, characterStore, presetStore } = await getStores(pinia);

  const bind = (store: any, type: ScriptType) => {
    const enabledMap = computed(() => toEnabledMap(store.allScripts));
    let last = { ...enabledMap.value };
    watch(
      enabledMap,
      async curr => {
        const changes = diffEnabled(last, curr);
        if (changes.length === 0) {
          last = { ...curr };
          return;
        }
        const runtime = await getRuntime();
        for (const ch of changes) {
          try {
            if (ch.enabled) await runtime.startScript(ch.id, type);
            else await runtime.stopScript(ch.id, type);

            const s = store.getScript(ch.id);
            if (s) {
              const nextData = { ...(s.data || {}), state: { ...(s.data?.state || {}), enabled: ch.enabled } };
              await store.updateScript(ch.id, { data: nextData });
            }
          } catch (e) {
            // ignore single failure to avoid breaking the watcher
          }
        }
        last = { ...curr };
      },
      { deep: true },
    );
  };

  bind(globalStore, 'global');
  bind(characterStore, 'character');
  bind(presetStore, 'preset');
}
