<template>
  <div class="script-item" :id="id">
    <div class="script-item-name flexGrow overflow-hidden marginLeft5" style="text-align:left;">{{ scriptName }}</div>
    <div class="script-item-control flex-container flexnowrap alignItemsCenter">
      <div class="script-info menu_button interactable">
        <i class="fa-solid fa-info-circle"></i>
      </div>
      <div class="add-script menu_button interactable">
        <i class="fa-solid fa-plus"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

// Props接口定义
interface Props {
  id: string;
  scriptName: string;
}

// Props
const props = withDefaults(defineProps<Props>(), {
  id: '',
  scriptName: '',
});

// Emits
const emit = defineEmits<{
  ready: [element: HTMLElement];
}>();

// 在组件挂载后，触发ready事件，让父组件可以绑定jQuery事件
onMounted(() => {
  const $element = $(`#${props.id}`);
  if ($element.length > 0) {
    emit('ready', $element[0]);
  }
});

onUnmounted(() => {
  // 清理工作，如果需要的话
});
</script>

<style scoped>
/* 预留的局部CSS空间 */
/* 你可以在这里添加scoped样式 */

</style>
