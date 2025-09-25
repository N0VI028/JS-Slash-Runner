<template>
  <iframe v-show="false" :id="script.id" />
</template>

<script setup lang="ts">
import { Script } from '@/type/scripts';

defineProps<{ script: Script }>();

// TODO: 实际编写
</script>
