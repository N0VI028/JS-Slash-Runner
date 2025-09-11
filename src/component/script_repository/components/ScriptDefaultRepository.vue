<template>
  <div class="script-item" :id="id">
    <div class="script-item-name flexGrow overflow-hidden marginLeft5" style="text-align: left">{{ scriptName }}</div>
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
import { onMounted } from 'vue';

interface Props {
  id: string;
  scriptName: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  scriptName: '',
});

const emit = defineEmits<{
  ready: [element: HTMLElement];
}>();

onMounted(() => {
  const $element = $(`#${props.id}`);
  if ($element.length > 0) {
    emit('ready', $element[0]);
  }
});

</script>

<style scoped>
.script-item {
  width: 100%;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: center;
  padding: 0 5px;
}</style>
