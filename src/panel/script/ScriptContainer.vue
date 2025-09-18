<template>
  <!-- prettier-ignore -->
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">全局脚本</div>
        <div class="ml-0.5 cursor-pointer">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <div
class="
  mt-0.25
  text-(length:--TH-FontSizeSm)
  opacity-70
">应用于酒馆所有聊天</div>
    </div>
    <Toggle id="global-script-enable-toggle" v-model="enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <div class="TH-script-list flex flex-grow flex-col gap-0.5 overflow-y-auto py-1">
      <ScriptItem />
    </div>
  </div>
</template>

<script setup lang="ts">
import Toggle from '@/panel/component/Toggle.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalSettingsStore } from '@/store/settings';

const enabled = toRef(useGlobalSettingsStore().settings.script.enabled, 'global');
</script>

<style scoped lang="scss">
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
