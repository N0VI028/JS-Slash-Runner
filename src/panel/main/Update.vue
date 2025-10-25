<template>
  <Popup width="wide" :buttons="[{ name: '更新', shouldEmphasize: true, onClick: onConfirm }, { name: '取消' }]">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="p-1.5 text-left" v-html="changelog" />
  </Popup>
</template>

<script setup lang="ts">
import { getChangelogHtml, update } from '@/panel/main/update';

const changelog = ref<string>(t`<div>更新日志加载中...</div>`);
onMounted(async () => {
  changelog.value = await getChangelogHtml();
});

async function onConfirm(close: () => void) {
  await update();
  close();
}
</script>
