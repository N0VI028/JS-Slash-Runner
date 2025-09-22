<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">全局脚本</div>
        <div class="ml-0.5 flex cursor-pointer items-center justify-center" title="批量操作">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div
        class="
          mt-0.25
          text-(length:--TH-FontSizeSm)
          opacity-70
        "
      >
        应用于酒馆所有聊天
      </div>
    </div>
    <Toggle id="global-script-enable-toggle" v-model="enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <div ref="rootListRef" class="script-list TH-script-list flex flex-grow flex-col gap-0.5 overflow-y-auto py-1">
      <FolderItem data-sortable-item data-folder />
      <ScriptItem />
    </div>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/panel/script/FolderItem.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalSettingsStore } from '@/store/settings';
import { useSortable } from '@vueuse/integrations/useSortable';
type SortableMoveEvent = { to: Element; dragged: Element };

const store = useGlobalSettingsStore();
const enabled = computed<boolean>({
  get: () => store.settings.script.enabled.global,
  set: v => (store.settings.script.enabled.global = v),
});

const rootListRef = ref<HTMLElement | null>(null);
const rootListItems = ref<unknown[]>([]);

useSortable(rootListRef, rootListItems, {
  group: { name: 'scripts', pull: true, put: true },
  handle: '.TH-handle',
  draggable: '[data-sortable-item]',
  onMove: (evt: SortableMoveEvent) => {
    const to = evt.to as HTMLElement | null;
    const dragged = evt.dragged as HTMLElement | null;
    if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') return false;
    return true;
  },
});
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 20px;
  opacity: 0.5;
}

/* 拖拽状态样式 */
.script-list.root-drag-target {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 5%, transparent);
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
}
</style>
