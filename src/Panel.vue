<template>
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>酒馆助手新</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="extension-status flex spaceBetween alignItemsCenter paddingLeftRight5">
        <div class="flex alignItemsCenter">
          <i
            id="extension-status-icon"
            class="fa-solid fa-power-off margin-r5"
            :style="{ color: settings.enabled ? 'green' : 'red' }"
          ></i>
          <div id="extension-status" class="inline-block">{{ settings.enabled ? '扩展已启用' : '扩展已禁用' }}</div>
        </div>
        <div class="version"></div>
      </div>
      <div id="extension-container" class="marginTop5 marginBot10">
        <div class="extension-title flex alignItemsCenter width100p padding5">
          <div
            class="title-item flex flex1 justifyCenter alignItemsCenter height100p"
            v-for="view in views"
            :class="{ 'title-item-active': active_view === view }"
          >
            <div class="settings-title flex alignItemsCenter" @click="active_view = view">
              <i class="fa-solid fa-gear margin-r5 fontsize80p"></i>{{ view }}
            </div>
          </div>
        </div>
        <Main v-show="active_view === '主设置'" />
        <Render v-show="active_view === '渲染器'" />
        <Script v-show="active_view === '脚本库'" />
        <Toolbox v-show="active_view === '工具箱'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Main from '@/panel/Main.vue';
import Render from '@/panel/Render.vue';
import Script from '@/panel/Script.vue';
import Toolbox from '@/panel/Toolbox.vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useSettingsStore } from './store/settings';

const { settings } = storeToRefs(useSettingsStore());

const views = ['主设置', '渲染器', '脚本库', '工具箱'] as const;
const active_view = ref<(typeof views)[number]>('主设置');
</script>
