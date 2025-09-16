<template>
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>{{ t`酒馆助手新` }}</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="tavern-helper-status spaceBetween alignItemsCenter paddingLeftRight5 flex">
        <div class="alignItemsCenter flex">
          <i class="fa-solid fa-power-off margin-r5" :style="{ color: enabled ? 'green' : 'red' }"></i>
          <div class="inline-block">{{ enabled ? t`扩展已启用` : t`扩展已禁用` }}</div>
        </div>
        <div class="version"></div>
      </div>
      <div class="marginTop5 marginBot10">
        <div class="tavern-helper-tab-title alignItemsCenter width100p padding5 flex">
          <div
            v-for="({ name, icon }, index) in tabs"
            :key="index"
            class="tavern-helper-tab-title-text flex1 justifyCenter alignItemsCenter height100p flex"
            :class="{ 'tavern-helper-tab-title-text-active': active_tab === index }"
          >
            <div class="alignItemsCenter flex" @click="active_tab = index">
              <i class="margin-r5 fontsize80p" :class="icon"></i>{{ name }}
            </div>
          </div>
        </div>
        <template v-for="({ component }, index) in tabs" :key="index">
          <div v-show="active_tab === index" class="tavern-helper-tab-page flexFlowColumn gap10px flex">
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
import { useLocalStorage } from '@vueuse/core';

const enabled = toRef(useGlobalSettingsStore().settings, 'enabled');

const tabs = [
  { name: t`主设置`, icon: 'fa-solid fa-gear', component: Main },
  { name: t`渲染器`, icon: 'fa-solid fa-magic-wand-sparkles', component: Render },
  { name: t`脚本库`, icon: 'fa-solid fa-dice-d6', component: Script },
  { name: t`工具箱`, icon: 'fa-solid fa-toolbox', component: Toolbox },
] as const;
const active_tab = useLocalStorage<number>('tavern_helper_active_tab', 0);
</script>

<style lang="scss" scoped>
.tavern-helper-status {
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
