<template>
  <Item type="box">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-between gap-0.75">
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="th-text-base font-bold">{{ t`实时监听` }}</div>
          <div class="mt-0.25 th-text-xs opacity-70">{{ t`连接编写模板，将代码修改实时同步到酒馆` }}</div>
        </div>
        <i class="fa-solid fa-wifi" :style="{ color: connected ? 'green' : 'rgb(170, 0, 0)' }" />
      </div>

      <Divider type="major" margin-y="my-0.25" weight="h-[0.75px]" />

      <div class="flex flex-wrap items-center justify-between gap-0.5">
        <div class="flex-container">
          <div class="flex items-center">
            <input v-model="enabled" type="checkbox" style="margin: 0 5px 0 1px" />
            <span style="margin-right: 10px">{{ t`允许监听` }}</span>
          </div>
          <div class="flex items-center">
            <input v-model="enable_echo" type="checkbox" style="margin: 0 5px 0 1px" />
            <span>{{ t`启用弹窗报错` }}</span>
          </div>
        </div>
        <div class="menu_button menu_button_icon interactable">
          <a
            href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html"
            target="_blank"
          >
            <small><i class="fa-solid fa-book" style="margin-right: 5px" />{{ t`使用方法` }}</small>
          </a>
        </div>
      </div>
      <div class="flex flex-col flex-wrap gap-0.5">
        <div class="flex flex-col">
          <b>{{ t`刷新间隔 (毫秒)` }}</b>
          <input v-model="duration" class="text_pole" type="number" min="1" />
        </div>
      </div>
    </div>
  </Item>
</template>

<script setup lang="ts">
import { useListener } from '@/panel/developer/listener';
import { useGlobalSettingsStore } from '@/store/settings';

const { enabled, enable_echo, url, duration } = toRefs(useGlobalSettingsStore().settings.listener);
const connected = useListener(enabled, enable_echo, url, duration);
</script>
