<template>
  <div class="flex h-full flex-col flex-wrap items-center gap-0.25 overflow-y-auto">
    <div class="my-0.5 text-(length:--TH-FontSize-md) font-bold">脚本编辑</div>
    <div id="script-name" class="TH-script-editor-container">
      <div>脚本名称</div>
      <input v-model="script.name" type="text" class="text_pole" />
    </div>
    <div id="script-content" class="TH-script-editor-container">
      <div>脚本内容</div>
      <textarea
        v-model="script.content"
        placeholder="脚本的JavaScript代码"
        rows="6"
        class="text_pole font-[family-name:var(--monoFontFamily)]!"
      />
    </div>
    <div id="script-info" class="TH-script-editor-container">
      <div>作者备注</div>
      <textarea
        id="script-info-textarea"
        v-model="script.info"
        placeholder="此处填写作者想要在脚本信息中展示的内容，例如作者名、版本和注意事项等，支持简单的markdown和html"
        rows="3"
        class="text_pole font-[family-name:var(--monoFontFamily)]!"
      />
    </div>
    <div id="variable-editor" class="TH-script-editor-container">
      <div class="flex flex-wrap items-center justify-center gap-[5px]">
        <div>变量列表</div>
        <div class="menu_button interactable" @click="addVariable">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
      <small>绑定到脚本的变量，会随脚本一同导出</small>
      <div id="variable-list" class="flex w-full flex-col flex-wrap gap-1"></div>
    </div>
    <div id="script-button-content" class="TH-script-editor-container">
      <div class="flex flex-wrap items-center justify-center gap-[5px]">
        <div>按钮触发</div>
        <div id="add-button-trigger" class="menu_button interactable">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
      <small>需配合eventOnButton使用</small>
      <div class="button-list"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TargetSelection } from '@/panel/script/TargetSelector.vue';
import { Script } from '@/type/scripts';
import { computed, watch } from 'vue';

const script = defineModel<Script>({ default: Script.parse({}) });

const props = withDefaults(defineProps<{ targetSelection?: TargetSelection }>(), {
  targetSelection: 'global',
});

const isNameEmpty = computed(() => !script.value.name.trim());

const validateScript = () => {
  if (isNameEmpty.value) {
    toastr.error('请输入脚本名称', '保存失败');
    return false;
  }
  return true;
};

const addVariable = () => {
  // TODO: 添加变量
};

watch(
  () => props.targetSelection,
  selection => {
    script.value.data.target = selection;
  },
  { immediate: true },
);

defineExpose({
  validateScript,
});

</script>

<style scoped>
@reference 'tailwindcss';

.TH-script-editor-container {
  @apply flex flex-col items-start mb-1 w-full;
}

#variable-list {
  max-height: 300px;
  margin-top: 10px;
  overflow-y: auto;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  padding: 10px;
}

:deep(#script-editor .variable-item .variable-value),
:deep(#script-editor .variable-item .variable-key),
#script-content-textarea,
#script-info-textarea {
  font-family: var(--monoFontFamily);
  padding: 8px;
}

:deep(.button-item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
</style>
