<template>
  <div class="script-item" :id="script.id">
    <input type="checkbox" class="script-checkbox" style="display: none" />
    <span class="drag-handle menu-handle">☰</span>
    <div class="script-item-name flexGrow overflow-hidden marginLeft5" :class="{ disabled: !script.enabled }">
      {{ script.name }}
    </div>
    <div class="script-item-control flex-container flexnowrap alignItemsCenter">
      <div class="script-toggle" :class="{ enabled: script.enabled }" @click="toggleScript" title="切换脚本启用状态">
        <i class="fa-solid fa-toggle-off" :style="{ display: script.enabled ? 'none' : 'inline' }"></i>
        <i class="fa-solid fa-toggle-on" :style="{ display: script.enabled ? 'inline' : 'none' }"></i>
      </div>
      <div class="script-info menu_button interactable" @click="showInfo" title="查看脚本信息">
        <i class="fa-solid fa-info-circle"></i>
      </div>
      <div class="edit-script menu_button interactable" @click="editScript" title="编辑脚本">
        <i class="fa-solid fa-pencil"></i>
      </div>
      <div
        :class="moveToClass + ' script-storage-location menu_button interactable'"
        @click="moveScript"
        :title="moveToTitle"
      >
        <i class="fa-solid" :class="moveToIcon"></i>
      </div>
      <div class="export-script menu_button interactable" @click="exportScript" title="导出脚本">
        <i class="fa-solid fa-file-export"></i>
      </div>
      <div class="delete-script menu_button interactable" @click="deleteScript" title="删除脚本">
        <i class="fa-solid fa-trash"></i>
      </div>
      <div class="remove-from-preset menu_button interactable" @click="removeFromPreset" title="从预设中移除">
        <i class="fa-solid fa-unlink"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps } from 'vue';
import { renderMarkdown } from '../../../util/render_markdown';
import { scriptEvents, ScriptRepositoryEventType } from '../events';
import type { Script } from '../types';
import { ScriptType } from '../types';

// 定义组件属性
const props = defineProps<{
  script: Script;
  scriptType: ScriptType;
}>();

// 定义事件
const emit = defineEmits<{
  toggle: [script: Script, type: ScriptType, enable: boolean];
  edit: [scriptId: string, type: ScriptType];
  move: [script: Script, fromType: ScriptType];
  export: [script: Script];
  delete: [scriptId: string, type: ScriptType];
  removeFromPreset: [scriptId: string];
}>();

// 计算属性
const moveToClass = computed(() => {
  return props.scriptType === 'global' ? 'move-to-character' : 'move-to-global';
});

const moveToIcon = computed(() => {
  return props.scriptType === 'global' ? 'fa-user' : 'fa-globe';
});

const moveToTitle = computed(() => {
  return props.scriptType === 'global' ? '移动到角色脚本' : '移动到全局脚本';
});

// 方法
const toggleScript = () => {
  const newState = !props.script.enabled;
  emit('toggle', props.script, props.scriptType, newState);

  // 触发原有事件系统
  scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_TOGGLE, {
    script: props.script,
    type: props.scriptType,
    enable: newState,
    userInput: true,
  });
};

const showInfo = () => {
  const scriptInfo = props.script.info || '';
  try {
    const htmlText = renderMarkdown(scriptInfo);
    // Use global callGenericPopup if available
    if (typeof (window as any).callGenericPopup === 'function') {
      (window as any).callGenericPopup(htmlText, 'DISPLAY', undefined, { wide: true });
    } else {
      // Fallback to simple alert
      alert(scriptInfo || '暂无脚本信息');
    }
  } catch (error) {
    console.error('[ScriptItem] Error showing info:', error);
    alert(scriptInfo || '暂无脚本信息');
  }
};

const editScript = () => {
  emit('edit', props.script.id, props.scriptType);
  scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, {
    type: props.scriptType,
    scriptId: props.script.id,
  });
};

const moveScript = () => {
  emit('move', props.script, props.scriptType);
  scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_MOVE, {
    script: props.script,
    fromType: props.scriptType,
  });
};

const exportScript = async () => {
  const fileName = `${props.script.name.replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, '_').toLowerCase()}.json`;

  // 获取脚本完整数据用于导出
  const scriptData = {
    id: props.script.id,
    name: props.script.name,
    content: props.script.content,
    info: props.script.info,
    enabled: props.script.enabled,
    buttons: props.script.buttons,
    data: props.script.data,
  };

  const fileData = JSON.stringify(scriptData, null, 2);

  try {
    // Use browser download API
    const blob = new Blob([fileData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[ScriptItem] Error exporting script:', error);
    // Fallback: copy to clipboard
    try {
      navigator.clipboard.writeText(fileData);
      alert('导出失败，脚本内容已复制到剪贴板');
    } catch (clipError) {
      console.error('[ScriptItem] Error copying to clipboard:', clipError);
      alert('导出失败');
    }
  }

  emit('export', props.script);
};

const deleteScript = async () => {
  let confirm = false;

  try {
    // Use global callGenericPopup if available
    if (typeof (window as any).callGenericPopup === 'function') {
      confirm = await (window as any).callGenericPopup('确定要删除这个脚本吗？', 'CONFIRM');
    } else {
      // Fallback to native confirm
      confirm = window.confirm('确定要删除这个脚本吗？');
    }
  } catch (error) {
    console.error('[ScriptItem] Error showing confirm dialog:', error);
    confirm = window.confirm('确定要删除这个脚本吗？');
  }

  if (!confirm) {
    return;
  }

  emit('delete', props.script.id, props.scriptType);
  scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_DELETE, {
    scriptId: props.script.id,
    type: props.scriptType,
  });
};

const removeFromPreset = async () => {
  let confirm = false;

  try {
    // Use global callGenericPopup if available
    if (typeof (window as any).callGenericPopup === 'function') {
      confirm = await (window as any).callGenericPopup(`确定要从预设中移除脚本 "${props.script.name}" 吗？`, 'CONFIRM');
    } else {
      // Fallback to native confirm
      confirm = window.confirm(`确定要从预设中移除脚本 "${props.script.name}" 吗？`);
    }
  } catch (error) {
    console.error('[ScriptItem] Error showing confirm dialog:', error);
    confirm = window.confirm(`确定要从预设中移除脚本 "${props.script.name}" 吗？`);
  }

  if (!confirm) {
    return;
  }

  emit('removeFromPreset', props.script.id);
};
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
}

.script-item.preset-mode {
  background-color: var(--SmartThemeBlurTintColor);
}

.script-item-name {
  text-align: left;
  transition: all 0.2s ease;
}

.script-item-name.disabled {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.script-toggle {
  cursor: pointer;
  transition: color 0.2s ease;
}

.script-toggle:hover {
  color: var(--SmartThemeQuoteColor);
}

.script-toggle.enabled .fa-toggle-on {
  color: var(--green);
}

.script-toggle:not(.enabled) .fa-toggle-off {
  color: var(--red);
}

.menu_button {
  cursor: pointer;
  padding: 5px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.menu_button:hover {
  background-color: var(--grey20);
}

.preset-bind-indicator {
  color: var(--SmartThemeQuoteColor);
  cursor: default;
}

.preset-bind-indicator:hover {
  background-color: transparent;
}

.drag-handle {
  cursor: move;
  padding: 5px;
  opacity: 0.6;
  user-select: none;
}

.drag-handle:hover {
  opacity: 1;
}

.script-item-control {
  gap: 5px;
}
</style>
