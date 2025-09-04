<template>
  <div
    :class="['script-item', { selected: isSelected, disabled: !script.enabled }]"
    @click="$emit('select', script.id)"
  >
    <div class="script-item-content">
      <!-- 脚本头部信息 -->
      <div class="script-header">
        <div class="script-info">
          <h4 class="script-name">
            {{ getScriptDisplayName(script) }}
          </h4>
          <div class="script-meta">
            <span class="script-status" :class="{ enabled: script.enabled }">
              {{ getScriptStatusText(script) }}
            </span>
            <span v-if="script.buttons.length > 0" class="script-buttons-count">
              <i class="fa-solid fa-mouse-pointer"></i>
              {{ script.buttons.length }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="script-actions">
          <button
            @click.stop="$emit('toggle', script.id)"
            :class="['toggle-btn', { enabled: script.enabled }]"
            :title="script.enabled ? '禁用脚本' : '启用脚本'"
          >
            <i :class="script.enabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"></i>
          </button>

          <button
            @click.stop="$emit('run', script.id)"
            class="action-btn run-btn"
            title="运行脚本"
            :disabled="!script.enabled"
          >
            <i class="fa-solid fa-play"></i>
          </button>

          <button @click.stop="$emit('menu', script, $event)" class="action-btn menu-btn" title="更多操作">
            <i class="fa-solid fa-ellipsis-v"></i>
          </button>
        </div>
      </div>

      <!-- 脚本描述 -->
      <div v-if="script.info" class="script-description">
        {{ script.info }}
      </div>

      <!-- 脚本内容预览 -->
      <div v-if="showContentPreview" class="script-preview">
        <div class="preview-header">
          <span class="preview-label">代码预览</span>
          <button @click.stop="showContentPreview = false" class="preview-close-btn">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <pre class="preview-code">{{ getContentPreview(script.content) }}</pre>
      </div>

      <!-- 展开/收缩按钮 -->
      <div v-if="script.content && !showContentPreview" class="script-footer">
        <button @click.stop="showContentPreview = true" class="expand-btn" title="查看代码预览">
          <i class="fa-solid fa-code"></i>
          查看代码
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Script } from '../schemas/script.schema';

// Props
interface Props {
  script: Script;
  isSelected: boolean;
}

defineProps<Props>();

// Emits
interface Emits {
  select: [id: string];
  toggle: [id: string];
  run: [id: string];
  menu: [script: Script, event: Event];
}

defineEmits<Emits>();

// Local state
const showContentPreview = ref(false);

// Methods
/**
 * 获取脚本显示名称
 */
const getScriptDisplayName = (script: Script): string => {
  return script.name.trim() || '未命名脚本';
};

/**
 * 获取脚本状态文本
 */
const getScriptStatusText = (script: Script): string => {
  return script.enabled ? '已启用' : '已禁用';
};

/**
 * 获取内容预览
 */
const getContentPreview = (content: string): string => {
  const lines = content.split('\n');
  const maxLines = 10;
  const previewLines = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    previewLines.push('...');
  }

  return previewLines.join('\n');
};
</script>

<style scoped>
.script-item {
  background: var(--SmartThemeBlurTintColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.script-item:hover {
  background: var(--SmartThemeEmColor);
  border-color: var(--SmartThemeQuoteColor);
}

.script-item.selected {
  background: var(--SmartThemeQuoteColor);
  border-color: var(--SmartThemeEmColor);
}

.script-item.disabled {
  opacity: 0.6;
}

.script-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.script-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0; /* 防止文字溢出 */
}

.script-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--SmartThemeEmColor);
  word-break: break-word;
}

.script-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.script-status {
  color: #888;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.1);
}

.script-status.enabled {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.script-buttons-count {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #666;
}

.script-actions {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  flex-shrink: 0;
}

.toggle-btn,
.action-btn {
  background: none;
  border: 1px solid var(--SmartThemeBorderColor);
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--SmartThemeBodyColor);
  transition: all 0.2s ease;
  font-size: 12px;
}

.toggle-btn.enabled {
  color: #4caf50;
  border-color: #4caf50;
}

.action-btn:hover,
.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.run-btn:not(:disabled):hover {
  color: #4caf50;
  border-color: #4caf50;
}

.menu-btn:hover {
  color: var(--SmartThemeEmColor);
}

.script-description {
  font-size: 13px;
  color: var(--SmartThemeBodyColor);
  opacity: 0.8;
  line-height: 1.4;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.script-preview {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-label {
  font-size: 12px;
  color: var(--SmartThemeBodyColor);
  font-weight: 500;
}

.preview-close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 10px;
}

.preview-close-btn:hover {
  color: var(--SmartThemeEmColor);
}

.preview-code {
  padding: 12px;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #e8e8e8;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.script-footer {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.expand-btn {
  background: none;
  border: 1px solid var(--SmartThemeBorderColor);
  color: var(--SmartThemeBodyColor);
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.expand-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--SmartThemeEmColor);
  color: var(--SmartThemeEmColor);
}

/* 代码滚动条 */
.preview-code::-webkit-scrollbar {
  width: 6px;
}

.preview-code::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.preview-code::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.preview-code::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
