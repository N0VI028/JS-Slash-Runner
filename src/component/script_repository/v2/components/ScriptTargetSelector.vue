<template>
  <div>
    <h3>{{ title }}</h3>
    <div class="flex-container flexFlowColumn width100p padding10 justifyLeft">
      <label :for="`${prefix}-target-global`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-global`" value="global" checked />
        <span> {{ globalLabel }} </span>
      </label>
      <label :for="`${prefix}-target-character`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-character`" value="character" />
        <span> {{ characterLabel }} </span>
      </label>
      <label v-if="showPresetOption" :for="`${prefix}-target-preset`">
        <input type="radio" :name="`${prefix}-target`" :id="`${prefix}-target-preset`" value="preset" />
        <span> {{ presetLabel }} </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props接口定义
interface Props {
  title: string;
  prefix: string;
  globalLabel: string;
  characterLabel: string;
  presetLabel?: string;
  showPresetOption?: boolean;
  currentPresetName?: string;
}

// Props
withDefaults(defineProps<Props>(), {
  title: '',
  prefix: '',
  globalLabel: '',
  characterLabel: '',
  presetLabel: '',
  showPresetOption: false,
  currentPresetName: undefined,
});

// 这个组件只是表单选择，不需要特殊的事件绑定
</script>

<style scoped>
/* 预留的局部CSS空间 */
/* 你可以在这里添加scoped样式 */
</style>
