<template>
  <div class="script-editor-container">
    <!-- 编辑器头部 -->
    <div class="editor-header">
      <div class="editor-info">
        <h3 v-if="currentScript" class="script-title">编辑脚本: {{ currentScript.name }}</h3>
        <h3 v-else class="script-title">请选择要编辑的脚本</h3>

        <div v-if="currentScript" class="editor-status">
          <span :class="['status-indicator', { dirty: editorStore.isDirty, saving: editorStore.isSaving }]">
            <i v-if="editorStore.isSaving" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else-if="editorStore.isDirty" class="fa-solid fa-circle"></i>
            <i v-else class="fa-solid fa-check-circle"></i>
            {{ editorStatus }}
          </span>

          <span v-if="editorStore.lastSaved" class="last-saved">
            最后保存: {{ formatTime(editorStore.lastSaved) }}
          </span>
        </div>
      </div>

      <div v-if="currentScript" class="editor-actions">
        <button
          @click="handleSave"
          :disabled="!editorStore.isDirty || editorStore.isSaving"
          class="save-btn"
          title="保存脚本 (Ctrl+S)"
        >
          <i class="fa-solid fa-save"></i>
          保存
        </button>

        <button @click="handleFormat" :disabled="!editorStore.hasActiveScript" class="format-btn" title="格式化代码">
          <i class="fa-solid fa-magic"></i>
          格式化
        </button>

        <button
          @click="handleRunScript"
          :disabled="!currentScript?.enabled || editorStore.isDirty"
          class="run-btn"
          title="运行脚本"
        >
          <i class="fa-solid fa-play"></i>
          运行
        </button>

        <button
          @click="showScriptInfo = !showScriptInfo"
          class="info-btn"
          :class="{ active: showScriptInfo }"
          title="脚本信息"
        >
          <i class="fa-solid fa-info-circle"></i>
          信息
        </button>
      </div>
    </div>

    <!-- 脚本信息面板 -->
    <div v-if="showScriptInfo && currentScript" class="script-info-panel">
      <div class="info-grid">
        <div class="info-field">
          <label>脚本名称</label>
          <input
            v-model="localScriptName"
            @input="handleScriptInfoChange"
            type="text"
            class="text-input"
            placeholder="输入脚本名称..."
          />
        </div>

        <div class="info-field">
          <label>状态</label>
          <button @click="handleToggleEnabled" :class="['status-toggle', { enabled: currentScript.enabled }]">
            <i :class="currentScript.enabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"></i>
            {{ currentScript.enabled ? '已启用' : '已禁用' }}
          </button>
        </div>

        <div class="info-field full-width">
          <label>脚本描述</label>
          <textarea
            v-model="localScriptInfo"
            @input="handleScriptInfoChange"
            class="text-area"
            placeholder="输入脚本描述..."
            rows="3"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div v-if="currentScript" class="editor-body">
      <!-- 代码编辑器 -->
      <div class="code-editor-container">
        <textarea
          ref="codeEditor"
          v-model="editorContent"
          @input="handleContentChange"
          @keydown="handleKeydown"
          class="code-editor"
          placeholder="在此输入JavaScript代码..."
          spellcheck="false"
        ></textarea>

        <!-- 编辑器底部状态栏 -->
        <div class="editor-statusbar">
          <span class="cursor-position">
            行 {{ editorStore.cursorPosition.line }}, 列 {{ editorStore.cursorPosition.column }}
          </span>

          <span class="editor-mode">JavaScript</span>

          <span class="content-stats"> {{ contentStats.lines }} 行, {{ contentStats.chars }} 字符 </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-editor">
      <div class="empty-content">
        <i class="fa-solid fa-code"></i>
        <h3>未选择脚本</h3>
        <p>请从左侧列表选择要编辑的脚本</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRepositorySelectors } from '../composables/useRepositorySelectors';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import { useEditorStore } from '../stores/editor.store';

// Stores and composables
const editorStore = useEditorStore();
const selectors = useRepositorySelectors();
const commands = useScriptRepoCommands();

// Refs
const codeEditor = ref<HTMLTextAreaElement>();
const showScriptInfo = ref(false);

// Local reactive data for script info editing
const localScriptName = ref('');
const localScriptInfo = ref('');

// Computed
const currentScript = computed(() => selectors.selectedScript.value);
const editorStatus = computed(() => editorStore.editorStatus);
const editorContent = computed({
  get: () => editorStore.content,
  set: (value: string) => editorStore.setContent(value),
});

const contentStats = computed(() => {
  const content = editorContent.value;
  return {
    lines: content.split('\n').length,
    chars: content.length,
  };
});

// Watch for script selection changes
watch(
  currentScript,
  newScript => {
    if (newScript) {
      editorStore.selectScript(newScript);
      localScriptName.value = newScript.name;
      localScriptInfo.value = newScript.info;
    } else {
      editorStore.clear();
      localScriptName.value = '';
      localScriptInfo.value = '';
    }
  },
  { immediate: true },
);

// Event handlers
/**
 * 处理内容变化
 */
const handleContentChange = () => {
  // 更新光标位置
  if (codeEditor.value) {
    const { selectionStart } = codeEditor.value;
    const content = codeEditor.value.value;
    const lines = content.substring(0, selectionStart).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    editorStore.updateCursorPosition(line, column);
  }
};

/**
 * 处理键盘快捷键
 */
const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl+S 保存
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    handleSave();
  }

  // Tab 键处理
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 插入两个空格代替Tab
    const newValue = value.substring(0, start) + '  ' + value.substring(end);
    editorContent.value = newValue;

    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    });
  }
};

/**
 * 保存脚本
 */
const handleSave = async () => {
  if (!currentScript.value || !editorStore.isDirty) {
    return;
  }

  try {
    // 先保存编辑器内容
    await editorStore.save();

    // 然后更新脚本信息（如果有修改）
    await commands.updateScript({
      id: currentScript.value.id,
      name: localScriptName.value,
      info: localScriptInfo.value,
      content: editorContent.value,
    });
  } catch (error) {
    console.error('保存脚本失败:', error);
  }
};

/**
 * 格式化代码
 */
const handleFormat = () => {
  editorStore.formatCode();
};

/**
 * 运行脚本
 */
const handleRunScript = () => {
  if (currentScript.value) {
    commands.runScript(currentScript.value.id);
  }
};

/**
 * 切换脚本启用状态
 */
const handleToggleEnabled = () => {
  if (currentScript.value) {
    commands.toggleScriptEnabled(currentScript.value.id);
  }
};

/**
 * 处理脚本信息变化
 */
const handleScriptInfoChange = () => {
  editorStore.markDirty(true);
};

/**
 * 格式化时间
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString();
};

// 生命周期
onMounted(() => {
  // 监听全局键盘事件
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.script-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--SmartThemeBlurTintColor);
  border-radius: 6px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--SmartThemeBorderColor);
}

.editor-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.script-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--SmartThemeEmColor);
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #888;
}

.status-indicator.dirty {
  color: #ff9500;
}

.status-indicator.saving {
  color: #4caf50;
}

.status-indicator i {
  font-size: 10px;
}

.last-saved {
  color: #666;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.save-btn,
.format-btn,
.run-btn,
.info-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 4px;
  background: none;
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.save-btn:not(:disabled):hover {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.run-btn:not(:disabled):hover {
  background: #2196f3;
  border-color: #2196f3;
  color: white;
}

.format-btn:not(:disabled):hover {
  background: #ff9800;
  border-color: #ff9800;
  color: white;
}

.info-btn:hover,
.info-btn.active {
  background: var(--SmartThemeQuoteColor);
  border-color: var(--SmartThemeEmColor);
  color: var(--SmartThemeEmColor);
}

.save-btn:disabled,
.format-btn:disabled,
.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.script-info-panel {
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--SmartThemeBorderColor);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 12px;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-field.full-width {
  grid-column: 1 / -1;
}

.info-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--SmartThemeEmColor);
}

.text-input,
.text-area {
  padding: 8px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--SmartThemeBodyColor);
  font-size: 13px;
}

.text-input:focus,
.text-area:focus {
  outline: none;
  border-color: var(--SmartThemeEmColor);
}

.status-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 4px;
  background: none;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.status-toggle.enabled {
  color: #4caf50;
  border-color: #4caf50;
}

.status-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.code-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.code-editor {
  flex: 1;
  padding: 16px;
  border: none;
  background: rgba(0, 0, 0, 0.2);
  color: var(--SmartThemeBodyColor);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.code-editor::placeholder {
  color: #666;
}

.editor-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid var(--SmartThemeBorderColor);
  font-size: 11px;
  color: #888;
}

.cursor-position,
.editor-mode,
.content-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-editor {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-content {
  text-align: center;
  color: var(--SmartThemeBodyColor);
}

.empty-content i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: #666;
}

.empty-content h3 {
  margin: 0 0 8px 0;
  color: var(--SmartThemeEmColor);
}

.empty-content p {
  margin: 0;
  opacity: 0.8;
}

/* 滚动条样式 */
.code-editor::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.code-editor::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.code-editor::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}

.code-editor::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
