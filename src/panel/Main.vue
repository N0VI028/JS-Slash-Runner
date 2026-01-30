<template>
  <div class="flex flex-col gap-0.5">
    <!-- 横向Tab栏 -->
    <div class="flex border-b-2 border-(--grey5050a)">
      <div
        v-for="({ name, icon }, index) in tabs"
        :key="index"
        class="TH-sub-tab"
        :class="{ 'TH-sub-tab--active': active_tab === index }"
        @click="active_tab = index"
      >
        <i :class="icon" class="th-text-xs" />
        <span>{{ name }}</span>
      </div>
    </div>
    <!-- 内容区 -->
    <div class="mt-0.5 flex flex-col gap-0.5">
      <template v-if="active_tab === 0">
        <Info />
      </template>
      <template v-else-if="active_tab === 1">
        <Optimize />
      </template>
      <template v-else-if="active_tab === 2">
        <div class="flex flex-col gap-0.75">
          <Listener />
          <MacroLike />
        </div>
      </template>
      <template v-else-if="active_tab === 3">
        <Reference />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Info from '@/panel/main/Info.vue';
import Listener from '@/panel/main/Listener.vue';
import MacroLike from '@/panel/main/MacroLike.vue';
import Optimize from '@/panel/main/Optimize.vue';
import Reference from '@/panel/main/Reference.vue';

const tabs = [
  { name: t`信息`, icon: 'fa-solid fa-info-circle' },
  { name: t`优化`, icon: 'fa-solid fa-wand-magic-sparkles' },
  { name: t`开发`, icon: 'fa-solid fa-tools' },
  { name: t`编写`, icon: 'fa-solid fa-book' },
];

const active_tab = useLocalStorage<number>('TH-Main:active_tab', 0);
</script>
