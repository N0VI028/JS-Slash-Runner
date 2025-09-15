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
            v-for="{ name, icon } in views"
            :key="name"
            class="tavern-helper-tab-title-text flex flex1 justifyCenter alignItemsCenter height100p"
            :class="{ 'tavern-helper-tab-title-text-active': active_view === name }"
          >
            <div class="flex alignItemsCenter" @click="active_view = name">
              <i class="margin-r5 fontsize80p" :class="icon"></i>{{ name }}
            </div>
          </div>
        </div>
        <template v-for="{ name, component } in views" :key="name">
          <div v-show="active_view === name" class="tavern-helper-tab-page flex flexFlowColumn gap10px">
            <component :is="component" />
          </div>
        </template>
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
import { ref, toRef } from 'vue';

const enabled = toRef(useGlobalSettingsStore().settings, 'enabled');

const views = [
  { name: '主设置', icon: 'fa-solid fa-gear', component: Main },
  { name: '渲染器', icon: 'fa-solid fa-magic-wand-sparkles', component: Render },
  { name: '脚本库', icon: 'fa-solid fa-dice-d6', component: Script },
  { name: '工具箱', icon: 'fa-solid fa-toolbox', component: Toolbox },
] as const;
const active_view = ref<(typeof views)[number]['name']>('主设置');
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
