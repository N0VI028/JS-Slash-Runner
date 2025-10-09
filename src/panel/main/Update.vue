<template>
  <Popup :buttons="[{ name: '更新', shouldEmphasize: true, onClick: onConfirm }, { name: '取消' }]">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="changelog" />
  </Popup>
</template>

<script setup lang="ts">
import { getChangelogHtml } from '@/panel/main/update';
import { make_TODO } from '@/todo';

const changelog = ref<string>(t`<div>更新日志加载中...</div>`);
onMounted(async () => {
  changelog.value = await getChangelogHtml();
});

async function onConfirm(close: () => void) {
  make_TODO('更新功能做好了但现在不能测, 之后应该实际接上更新功能并测试');
  // await update();
  close();
}
</script>
