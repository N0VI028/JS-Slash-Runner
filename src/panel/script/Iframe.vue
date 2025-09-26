<template>
  <iframe v-show="false" :id="script.id" />
</template>

<script setup lang="ts">
import { ScriptRuntime } from '@/panel/script/type';

defineProps<{ script: ScriptRuntime }>();

// TODO: 实际编写
</script>
