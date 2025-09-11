<template>
  <div>
    <h4 v-if="type === 'character'">此角色包含酒馆助手可用的嵌入式脚本，已导入至局部脚本库</h4>
    <h4 v-else-if="type === 'preset'">此预设包含酒馆助手可用的嵌入式脚本，已导入至局部脚本库</h4>
    <h4>是否现在就启用它们？</h4>
    <small>您可以选择否，稍后在"酒馆助手-脚本库-局部脚本"中手动启用它们</small>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type: 'character' | 'preset';
}

const props = defineProps<Props>();
</script>
