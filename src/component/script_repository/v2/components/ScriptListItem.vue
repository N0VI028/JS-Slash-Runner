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
/* 脚本项容器 */
.script-item {
  width: 100%;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  background-color: var(--SmartThemeBlurTintColor);
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.script-item:hover {
  background-color: var(--SmartThemeQuoteColor);
}

.script-item.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  border-color: var(--SmartThemeQuoteColor);
}

.script-item.disabled {
  opacity: 0.6;
}

.script-item.disabled .script-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

/* 脚本内容 */
.script-item-content {
  padding: 10px;
  width: 100%;
}

/* 脚本头部 */
.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.script-info {
  flex: 1;
  min-width: 0;
}

.script-name {
  margin: 0 0 5px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--SmartThemeBodyColor);
  word-break: break-word;
}

.script-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--SmartThemeBodyColor);
  opacity: 0.8;
}

.script-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: var(--crimson70a);
  color: white;
}

.script-status.enabled {
  background-color: var(--green70a);
}

.script-buttons-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 操作按钮 */
.script-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
}

.toggle-btn,
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 6px;
  background-color: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover,
.action-btn:hover {
  background-color: var(--SmartThemeQuoteColor);
}

.toggle-btn.enabled {
  color: var(--green70a);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.run-btn {
  color: var(--green70a);
}

.menu-btn {
  color: var(--SmartThemeBodyColor);
}

/* 脚本描述 */
.script-description {
  margin: 8px 0;
  padding: 8px;
  background-color: var(--black30a);
  border-radius: 5px;
  font-size: 0.9rem;
  color: var(--SmartThemeBodyColor);
  opacity: 0.9;
  line-height: 1.4;
}

/* 代码预览 */
.script-preview {
  margin: 8px 0;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 5px;
  background-color: var(--black30a);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--SmartThemeBorderColor);
  background-color: var(--grey5020a);
}

.preview-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--SmartThemeBodyColor);
}

.preview-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background-color: transparent;
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.preview-close-btn:hover {
  opacity: 1;
  background-color: var(--SmartThemeBorderColor);
}

.preview-code {
  padding: 12px;
  margin: 0;
  font-family: var(--monoFontFamily);
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--SmartThemeBodyColor);
  background-color: transparent;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
}

/* 脚本底部 */
.script-footer {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 5px;
  background-color: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-btn:hover {
  background-color: var(--SmartThemeQuoteColor);
}
</style>
