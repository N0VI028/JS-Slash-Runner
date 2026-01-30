<template>
  <Optimize />
    <CollapsiblePanel :title="t`开发工具`" icon="fa-solid fa-tools">
    </CollapsiblePanel>
  <!-- <Divider type="major">
    <i class="fa-solid fa-tools mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`开发工具` }}</div>
  </Divider>
  <div class="flex flex-col gap-0.75">
    <Listener />
    <Reference />
    <MacroLike />
  </div> -->
  <!-- <Divider type="major">
    <i class="fa-solid fa-shapes mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`扩展信息` }}</div>
  </Divider> -->
  <Info class="mt-0.5"/>
</template>

<script setup lang="ts">
import Info from '@/panel/main/Info.vue';
import Listener from '@/panel/main/Listener.vue';
import MacroLike from '@/panel/main/MacroLike.vue';
import Optimize from '@/panel/main/Optimize.vue';
import Reference from '@/panel/main/Reference.vue';
</script>
