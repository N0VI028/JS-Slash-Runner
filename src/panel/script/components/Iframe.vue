<template>
  <iframe v-show="false" :id="script.id" @load="onLoad" />
</template>

<script setup lang="ts">
import { Script } from '@/type/scripts';

defineProps<{ script: Script }>();

function onLoad() {
  toastr.success('加载成功');
}
</script>
