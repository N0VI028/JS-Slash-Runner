import { debounce } from 'lodash';
import log from 'loglevel';
import { setActivePinia, type Pinia } from 'pinia';
import { computed, watch } from 'vue';
import type { ScriptRepository, ScriptType } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

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

function bindRepositoryPersistence(store: any, type: ScriptType) {
  // 创建一个防抖函数，延迟 500ms 执行保存操作
  const debouncedSave = debounce(async (repo: ScriptRepository) => {
    try {
      await repositoryService.saveRepositoryByType(type, repo);
      log.info(`[ScriptRepository-Watcher] 保存 "${type}" 脚本库成功.`);
    } catch (e) {
      log.error(`[ScriptRepository-Watcher] 保存 "${type}" 脚本库失败:`, e);
      toastr.error(`保存 ${type} 脚本库失败`);
    }
  }, 500);

  // 深度监听 repository 的变化
  watch(
    () => store.repository,
    newRepo => {
      debouncedSave(newRepo);
    },
    { deep: true }, // deep: true 是关键，确保能监听到数组内部对象的变化
  );
}

function bindEnabledPersistence(store: any, type: ScriptType) {
  // 创建一个防抖函数，延迟 300ms 执行保存操作
  const debouncedSaveEnabled = debounce(async (enabled: boolean) => {
    try {
      switch (type) {
        case 'global':
          await repositoryService.saveGlobalEnabledState(enabled);
          break;
        case 'character':
          await repositoryService.saveCharacterEnabledState(enabled);
          break;
        case 'preset':
          await repositoryService.savePresetEnabledState(enabled);
          break;
      }
      log.info(`[ScriptRepository-Watcher] 已保存${type}脚本开关状态: ${enabled ? '启用' : '禁用'}`);
    } catch (err) {
      log.error(`[ScriptRepository-Watcher] 保存${type}脚本开关状态失败:`, err);
    }
  }, 300);

  watch(
    () => store.enabled,
    (enabled: boolean) => {
      debouncedSaveEnabled(enabled);
    },
  );
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

    /**
     * 监听类型级别的enabled状态变化
     */
    watch(
      () => store.enabled,
      async (enabled: boolean) => {
        try {
          const runtime = await getRuntime();
          await runtime.toggleScriptsByType(type as any, enabled);
          log.info(`[ScriptRepository-Watcher] 切换 "${type}" 脚本类型启用状态为 ${enabled ? '启用' : '禁用'}.`);
        } catch (err) {
          log.error(`[ScriptRepository-Watcher] 切换 "${type}" 脚本类型启用状态失败:`, err);
        }
      },
    );
  };

  bind(globalStore, 'global');
  bind(characterStore, 'character');
  bind(presetStore, 'preset');

  bindRepositoryPersistence(globalStore, 'global');
  bindRepositoryPersistence(characterStore, 'character');
  bindRepositoryPersistence(presetStore, 'preset');

  // 为所有类型添加开关状态持久化监听
  bindEnabledPersistence(globalStore, 'global');
  bindEnabledPersistence(characterStore, 'character');
  bindEnabledPersistence(presetStore, 'preset');
}
