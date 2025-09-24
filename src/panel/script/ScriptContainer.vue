<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">{{ props.title }}</div>
        <div class="ml-0.5 flex cursor-pointer items-center justify-center" title="批量操作">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div class="mt-0.25 text-(length:--TH-FontSize-sm) opacity-70">{{ props.description }}</div>
    </div>
    <Toggle id="global-script-enable-toggle" v-model="model.enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <div ref="list_ref" class="script-list TH-script-list flex flex-grow flex-col gap-0.5 overflow-y-auto py-1">
      <template v-for="(_script, index) in model.scripts" :key="model.scripts[index].id">
        <ScriptItem v-model="model.scripts[index]" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { useSortable } from '@vueuse/integrations/useSortable';

const props = defineProps<{
  title: string;
  description: string;
}>();

const model = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });
model.value.scripts = [
  {
    enabled: true,
    name: '测试脚本',
    id: 'test-script',
    content: '测试脚本内容',
    info: '测试脚本信息',
    buttons: [],
    data: {},
  },
  {
    enabled: true,
    name: '测试脚本2',
    id: 'test-script-2',
    content: '测试脚本内容2',
    info: '测试脚本信息2',
    buttons: [],
    data: {},
  },
  {
    enabled: false,
    name: '测试脚本3',
    id: 'test-script-3',
    content: '测试脚本内容3',
    info: '测试脚本信息3',
    buttons: [],
    data: {},
  },
];

const list_ref = useTemplateRef<HTMLDivElement>('list_ref');
useSortable(list_ref, model.value.scripts, {
  group: { name: 'scripts', pull: true, put: true },
  handle: '.TH-handle',
  draggable: '[data-sortable-item]',
  onMove: event => {
    const to = event.to;
    const dragged = event.dragged;
    if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') {
      return false;
    }
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

.script-list.root-drag-target {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 5%, transparent);
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
}
</style>
