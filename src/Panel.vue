<template>
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>{{ t`酒馆助手` }} <span v-if="has_update" class="th-text-xs font-bold text-red-500">New!</span></b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
    </div>
    <div class="inline-drawer-content TH-custom-tailwind">
      <div class="mt-0.5 mb-0.75">
        <!-- prettier-ignore-attribute -->
        <div class="flex w-full items-center rounded-full border border-(--grey5050a) p-0.5 th-text-base">
          <div
            v-for="({ name, icon }, index) in tabs"
            :key="index"
            class="flex h-full flex-1 items-center justify-center rounded-full text-(--grey50)"
            :class="{
              'bg-[color-mix(in_srgb,_var(--SmartThemeQuoteColor)_80%,_transparent)] transition duration-300 ease-in-out':
                active_tab === index,
            }"
            @click="active_tab = index"
          >
            <div
              class="flex flex-wrap items-center justify-center gap-0.25"
              :style="{
                color: active_tab === index ? getSmartThemeQuoteTextColor() : 'inherit',
              }"
            >
              <i class="shrink-0 text-[80%]" :class="icon"></i>
              <span class="flex-grow text-center">{{ name }}</span>
            </div>
          </div>
        </div>
        <template v-for="({ component }, index) in tabs" :key="index">
          <div v-show="active_tab === index" class="mt-0.75 flex flex-col gap-0.25 px-0.75">
            <component :is="component" />
          </div>
        </template>
      </div>
    </div>
    <ModalsContainer />
  </div>
</template>

<script setup lang="ts">
import Main from '@/panel/Main.vue';
import { hasUpdate } from '@/panel/main/update';
import Render from '@/panel/Render.vue';
import Script from '@/panel/Script.vue';
import Toolbox from '@/panel/Toolbox.vue';
import { ModalsContainer } from 'vue-final-modal';
import { getSmartThemeQuoteTextColor } from './util/color';

// 暴露 Vue 从而让 vue devtool 能正确识别
useScriptTag('https://testingcf.jsdelivr.net/npm/vue/dist/vue.runtime.global.prod.min.js');

const tabs = [
  { name: t`主设置`, icon: 'fa-solid fa-gear', component: Main },
  { name: t`渲染器`, icon: 'fa-solid fa-magic-wand-sparkles', component: Render },
  { name: t`脚本库`, icon: 'fa-solid fa-dice-d6', component: Script },
  { name: t`工具箱`, icon: 'fa-solid fa-toolbox', component: Toolbox },
] as const;
const active_tab = useLocalStorage<number>('TH-Panel:active_tab', 0);

const has_update = ref(false);
onMounted(async () => {
  has_update.value = await hasUpdate();
});
</script>
