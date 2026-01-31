<template>
  <div class="flex flex-col rounded-md border border-(--grey5050a) p-1">
    <!-- 横向Tab栏 -->
    <div class="mb-0.5 flex border-b-2 border-(--grey5050a)">
      <div
        v-for="{ key, name, icon } in tabs"
        :key="key"
        class="TH-sub-tab"
        :class="{ 'TH-sub-tab--active': active_tab === key }"
        @click="active_tab = key"
      >
        <i :class="icon" class="th-text-xs" />
        <span>{{ name }}</span>
      </div>
    </div>
    <!-- 内容区 -->
    <div class="flex flex-col gap-0.5">
      <template v-if="active_tab === 'info'">
        <Info />
      </template>
      <template v-else-if="active_tab === 'optimize'">
        <Optimize />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Info from '@/panel/main/Info.vue';
import Optimize from '@/panel/main/Optimize.vue';
import { useValidatedTab } from '@/panel/composable/use_validated_tab';

const tabs = [
  { key: 'info', name: t`扩展信息`, icon: 'fa-solid fa-info-circle' },
  { key: 'optimize', name: t`酒馆优化`, icon: 'fa-solid fa-wand-magic-sparkles' },
];

const active_tab = useValidatedTab('TH-Main:active_tab', 'info', () => tabs.map(t => t.key));
</script>
