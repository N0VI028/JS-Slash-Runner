<template>
  <div class="preset-regex-panel">
    <div class="divider marginTop10 marginBot10"></div>
    <div class="extension-content-item">
      <div class="flex flexFlowColumn">
        <div class="flex alignItemsCenter">
          <div class="settings-title-text">预设正则</div>
        </div>
        <div class="settings-title-description">绑定到当前预设的正则表达式</div>
      </div>
    </div>
    <div class="flex-container flexFlowColumn alignItemsCenter">
      <div v-if="!currentPresetName" class="settings-title-description">请先切换到一个预设</div>
      <div v-else-if="!binding || binding.regexes.length === 0" class="settings-title-description">
        预设 "{{ currentPresetName }}" 暂无绑定正则
      </div>
      <div v-else>
        <div class="settings-title-description">
          预设 "{{ currentPresetName }}" 绑定了 {{ binding.regexes.length }} 个正则
        </div>
        <div class="flex-container flexFlowColumn alignItemsCenter" style="gap: 5px; margin-top: 10px">
          <div v-for="regexId in binding.regexes" :key="regexId" class="regex-item" style="width: 100%">
            <div class="regex-item-name">{{ regexId }}</div>
            <div class="regex-item-controls">
              <i class="fa-solid fa-link" title="已绑定到预设"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePresetBundlesStore } from '@/component/preset_manager/store/presetBundles.store';
import { computed } from 'vue';

// 使用 Pinia store
const store = usePresetBundlesStore();

// 计算属性
const currentPresetName = computed(() => store.currentPresetName);
const binding = computed(() => {
  if (!currentPresetName.value) return null;
  return store.getBinding(currentPresetName.value);
});
</script>

<style scoped>
.preset-regex-panel {
  width: 100%;
}

.regex-item {
  width: 100%;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: center;
  padding: 0 5px;
}

.regex-item-name {
  flex: 1;
  padding: 8px;
}

.regex-item-controls {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
}
</style>
