<template>
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>{{ t`酒馆助手` }} <span v-if="has_update" class="th-text-xs font-bold text-red-500">New!</span></b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
    </div>
    <div class="inline-drawer-content TH-custom-tailwind py-0.75">
      <!-- 更新提示条 -->
      <!-- prettier-ignore-attribute -->
      <div
        v-if="show_update_banner"
        class="
          mb-0.5 flex w-full items-center justify-between rounded-sm
          bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_20%,transparent)] py-0.25 pr-0.5 pl-1 th-text-sm
          text-(--SmartThemeBodyColor)
        "
      >
        <span>
          {{ t`发现新版本: ${latest_version}` }}
        </span>
        <div class="flex items-center gap-0.5">
          <div class="cursor-pointer rounded-xs border px-0.5 py-[3px] th-text-xs" @click="openUpdateModal">
            {{ t`更新` }}
          </div>
          <i class="fa-solid fa-xmark cursor-pointer p-0.25" @click="show_update_banner = false"></i>
        </div>
      </div>
      <div class="flex flex-col gap-0.75">
        <!-- 顶部导航栏 -->
        <!-- prettier-ignore-attribute -->
        <div
          class="
            flex w-full flex-wrap items-center rounded-md border border-x-2 border-(--grey5050a)
            border-x-(--SmartThemeQuoteColor) py-0.25 pr-0.5 pl-1
          "
        >
          <span class="th-text-md font-bold tracking-wide whitespace-nowrap text-(--SmartThemeBodyColor)">
            {{ current_tab?.name }}
          </span>
          <div class="ml-auto flex">
            <!-- prettier-ignore-attribute -->
            <div
              v-for="{ key, name, icon } in tabs"
              :key="key"
              class="
                flex h-2 w-2 cursor-pointer items-center justify-center rounded-xs text-(--grey50)
                [transition:background-color_0.3s_ease,color_0.2s_ease]
              "
              :class="
                active_tab === key &&
                `bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_80%,transparent)] px-0.5`
              "
              :style="{ color: active_tab === key ? getSmartThemeQuoteTextColor() : undefined }"
              :title="name"
              @click="active_tab = key"
            >
              <i
                :class="icon"
                class="shrink-0 th-text-base leading-[1.75]!"
                :style="key === 'develop' && listenerConnected ? { color: '#22c55e' } : undefined"
              ></i>
            </div>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="min-w-0">
          <template v-for="{ key, component } in tabs" :key="key">
            <div v-show="active_tab === key" class="flex flex-col gap-0.25">
              <component :is="component" />
            </div>
          </template>
        </div>
      </div>
    </div>
    <ModalsContainer />
  </div>
</template>

<script setup lang="ts">
import Develop from '@/panel/Develop.vue';
import Info from '@/panel/Info.vue';
import Main from '@/panel/Main.vue';
import { listenerConnected } from '@/panel/main/listener';
import { getLatestVersion, hasUpdate } from '@/panel/main/update';
import Update from '@/panel/main/Update.vue';
import Render from '@/panel/Render.vue';
import Script from '@/panel/Script.vue';
import Toolbox from '@/panel/Toolbox.vue';
import { ModalsContainer } from 'vue-final-modal';
import { useValidatedTab } from './panel/composable/use_validated_tab';
import { getSmartThemeQuoteTextColor } from './util/color';

// 暴露 Vue 从而让 vue devtool 能正确识别
useScriptTag('https://testingcf.jsdelivr.net/npm/vue/dist/vue.runtime.global.prod.min.js');

const tabs = [
  { key: 'render', name: t`渲染器`, icon: 'fa-solid fa-magic-wand-sparkles', component: Render },
  { key: 'script', name: t`脚本库`, icon: 'fa-solid fa-dice-d6', component: Script },
  { key: 'main', name: t`酒馆优化`, icon: 'fa-solid fa-circle-nodes', component: Main },
  { key: 'toolbox', name: t`工具箱`, icon: 'fa-solid fa-toolbox', component: Toolbox },
  { key: 'develop', name: t`开发工具`, icon: 'fa-solid fa-tools', component: Develop },
  { key: 'info', name: t`扩展信息`, icon: 'fa-solid fa-circle-info', component: Info },
] as const;
const active_tab = useValidatedTab('TH-Panel:active_tab', 'main', () => tabs.map(t => t.key));
const current_tab = computed(() => tabs.find(t => t.key === active_tab.value) ?? tabs[0]);

const has_update = ref(false);
const show_update_banner = ref(false);
const latest_version = ref('');

const { open: openUpdateModal } = useModal({
  component: Update,
});

onMounted(async () => {
  has_update.value = await hasUpdate();
  if (has_update.value) {
    latest_version.value = await getLatestVersion();
    show_update_banner.value = true;
  }
});
</script>
