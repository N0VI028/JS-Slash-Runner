<template>
  <div id="script-editor" class="flex-container flexFlowColumn alignItemsCenter height100p overflowYAuto">
    <h3 class="flex-container alignItemsCenter">脚本编辑</h3>
    <div id="script-name" class="script-editor-container">
      <h4>脚本名称</h4>
      <input type="text" id="script-name-input" />
    </div>
    <div id="script-content" class="script-editor-container">
      <h4>脚本内容</h4>
      <textarea id="script-content-textarea" placeholder="脚本的JavaScript代码" rows="6"></textarea>
    </div>
    <div id="script-info" class="script-editor-container">
      <h4>作者备注</h4>
      <textarea
        id="script-info-textarea"
        placeholder="此处填写作者想要在脚本信息中展示的内容，例如作者名、版本和注意事项等，支持简单的markdown和html"
        rows="3"
      ></textarea>
    </div>
    <div id="variable-editor" class="script-editor-container">
      <div class="flex-container alignItemsCenter justifyContentCenter">
        <h4>变量列表</h4>
        <div class="menu_button interactable" id="add-variable-trigger">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
      <small>绑定到脚本的变量，会随脚本一同导出</small>
      <div id="variable-list" class="flex-container flexFlowColumn width100p gap10p"></div>
    </div>
    <div id="script-button-content" class="script-editor-container">
      <div class="flex-container gap10 alignItemsCenter justifyContentCenter">
        <h4>按钮触发</h4>
        <div class="menu_button interactable" id="add-button-trigger">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
      <small>需配合eventOnButton使用</small>
      <div class="button-list"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

interface Props {
  script?: {
    name?: string;
    content?: string;
    info?: string;
    data?: Record<string, any>;
    buttons?: Array<{
      name: string;
      buttonText: string;
    }>;
  };
}

const props = withDefaults(defineProps<Props>(), {
  script: undefined,
});

const emit = defineEmits<{
  ready: [element: HTMLElement];
}>();

onMounted(() => {
  const $element = $('#script-editor');
  if ($element.length > 0) {
    if (props.script) {
      $element.find('#script-name-input').val(props.script.name || '');
      $element.find('#script-content-textarea').val(props.script.content || '');
      $element.find('#script-info-textarea').val(props.script.info || '');
    }

    emit('ready', $element[0]);
  }
});
</script>

<style scoped>
.script-editor-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 10px;
  width: 100%;
}

/* 变量编辑器样式 */
#variable-editor {
  margin-bottom: 15px;
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

#script-content-textarea,
#script-info-textarea {
  white-space: pre-wrap;
  tab-size: 4;
  color: var(--text-color-main);
  grid-column: 1;
  grid-row: 1;
  caret-color: var(--ac-style-color-text);
  overflow: auto;
}

#script-name-input {
  padding: 0.75em;
}

:deep(.button-item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
</style>
