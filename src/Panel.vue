<template>
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>酒馆助手新</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="extension-status flex spaceBetween alignItemsCenter paddingLeftRight5">
        <div class="flex alignItemsCenter">
          <i class="fa-solid fa-power-off margin-r5" :style="{ color: enabled ? 'green' : 'red' }"></i>
          <div class="inline-block">{{ enabled ? '扩展已启用' : '扩展已禁用' }}</div>
        </div>
        <div class="version"></div>
      </div>
      <div class="marginTop5 marginBot10">
        <div class="tavern-helper-tab-title flex alignItemsCenter width100p padding5">
          <div
            v-for="(_view, name) in views"
            :key="name"
            class="tavern-helper-tab-title-text flex flex1 justifyCenter alignItemsCenter height100p"
            :class="{ 'tavern-helper-tab-title-text-active': active_view === name }"
          >
            <div class="flex alignItemsCenter" @click="active_view = name">
              <i class="fa-solid fa-gear margin-r5 fontsize80p"></i>{{ name }}
            </div>
          </div>
        </div>
        <div
          v-for="(view, name) in views"
          v-show="active_view === name"
          :key="name"
          class="tavern-helper-tab-page flex flexFlowColumn gap10px"
        >
          <component :is="view" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Main from '@/panel/Main.vue';
import Render from '@/panel/Render.vue';
import Script from '@/panel/Script.vue';
import Toolbox from '@/panel/Toolbox.vue';
import { useGlobalSettingsStore } from '@/store/settings';
import { ref, toRefs } from 'vue';

const { enabled } = toRefs(useGlobalSettingsStore().settings);

const views = { 主设置: Main, 渲染器: Render, 脚本库: Script, 工具箱: Toolbox } as const;
const active_view = ref<keyof typeof views>('主设置');
</script>

<style lang="scss" scoped>
.extension-status {
  font-size: calc(var(--mainFontSize) * 0.8) !important;
  opacity: 0.7;

  i {
    font-size: calc(var(--mainFontSize) * 0.8) !important;
    opacity: 1;
    filter: brightness(1.5);
  }
}

.tavern-helper-tab-title {
  height: calc(var(--mainFontSize) * 2.5);
  border: 1px solid var(--grey5050a);
  border-radius: 50px;
}

.tavern-helper-tab-title-text {
  border-radius: 50px;
  color: var(--grey50);
}

.tavern-helper-tab-title-text-active {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 80%, transparent);
  color: var(--SmartThemeBodyColor);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.tavern-helper-tab-page {
  margin: 10px 0;
  padding: 10px 10px;
}
</style>
