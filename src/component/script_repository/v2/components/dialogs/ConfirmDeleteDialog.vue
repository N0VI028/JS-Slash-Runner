<template>
  <div class="confirm-delete-dialog">
    <div class="delete-warning">
      <div class="warning-icon">
        <i class="fa-solid fa-trash-alt"></i>
      </div>
      <div class="warning-content">
        <h4>确认删除脚本</h4>
        <p>
          您即将删除脚本 <strong>"{{ scriptName }}"</strong>。
        </p>
        <p class="warning-text">此操作不可撤销，脚本的所有内容和配置将永久丢失。</p>

        <div v-if="scriptInfo.buttons.length > 0" class="delete-details">
          <p class="detail-item">
            <i class="fa-solid fa-mouse-pointer"></i>
            将同时删除 {{ scriptInfo.buttons.length }} 个关联按钮
          </p>
        </div>

        <div v-if="scriptInfo.enabled" class="delete-details">
          <p class="detail-item warning">
            <i class="fa-solid fa-exclamation-triangle"></i>
            该脚本当前处于启用状态
          </p>
        </div>
      </div>
    </div>

    <!-- 确认输入 -->
    <div class="confirmation-input">
      <label>请输入脚本名称确认删除：</label>
      <input
        v-model="confirmInput"
        @keyup.enter="handleConfirm"
        type="text"
        :placeholder="scriptName"
        class="confirm-text-input"
        ref="confirmInputRef"
      />
      <div v-if="inputError" class="input-error">{{ inputError }}</div>
    </div>

    <!-- 选项 -->
    <div class="delete-options">
      <label class="option-item">
        <input v-model="options.keepInHistory" type="checkbox" />
        <span>在历史记录中保留脚本信息（推荐）</span>
      </label>
    </div>

    <!-- 按钮 -->
    <div class="dialog-actions">
      <button @click="handleCancel" class="btn btn-cancel">取消</button>
      <button @click="handleConfirm" :disabled="!canConfirm" class="btn btn-danger">
        <i class="fa-solid fa-trash-alt"></i>
        确认删除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

// Props
interface Props {
  scriptName: string;
  scriptInfo: {
    buttons: { name: string; visible: boolean }[];
    enabled: boolean;
  };
}

const props = defineProps<Props>();

// Emits
interface Emits {
  confirm: [options: { keepInHistory: boolean }];
  cancel: [];
}

const emit = defineEmits<Emits>();

// Refs
const confirmInput = ref('');
const confirmInputRef = ref<HTMLInputElement>();
const inputError = ref('');

// Options
const options = ref({
  keepInHistory: true,
});

// Computed
const canConfirm = computed(() => {
  return confirmInput.value.trim() === props.scriptName.trim();
});

// Methods
const handleConfirm = () => {
  if (!canConfirm.value) {
    inputError.value = '脚本名称输入不正确';
    return;
  }

  inputError.value = '';
  emit('confirm', options.value);
};

const handleCancel = () => {
  emit('cancel');
};

// 生命周期
onMounted(() => {
  nextTick(() => {
    confirmInputRef.value?.focus();
  });
});
</script>

<style scoped>
.confirm-delete-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.delete-warning {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.warning-icon {
  flex-shrink: 0;
  font-size: 32px;
  color: #ff6b6b;
}

.warning-content {
  flex: 1;
}

.warning-content h4 {
  margin: 0 0 8px 0;
  color: var(--SmartThemeEmColor);
  font-size: 16px;
}

.warning-content p {
  margin: 8px 0;
  line-height: 1.4;
  color: var(--SmartThemeBodyColor);
}

.warning-text {
  color: #ff6b6b !important;
  font-weight: 500;
}

.delete-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin: 4px 0;
}

.detail-item.warning {
  color: #ff9500;
}

.confirmation-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirmation-input label {
  font-weight: 500;
  color: var(--SmartThemeEmColor);
}

.confirm-text-input {
  padding: 10px 12px;
  border: 2px solid var(--SmartThemeBorderColor);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--SmartThemeBodyColor);
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.confirm-text-input:focus {
  outline: none;
  border-color: #ff6b6b;
}

.input-error {
  color: #ff6b6b;
  font-size: 12px;
  font-weight: 500;
}

.delete-options {
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--SmartThemeBodyColor);
}

.option-item input[type='checkbox'] {
  cursor: pointer;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-cancel {
  background: none;
  color: #888;
  border-color: #888;
}

.btn-cancel:hover {
  color: var(--SmartThemeBodyColor);
  border-color: var(--SmartThemeBodyColor);
  background: rgba(255, 255, 255, 0.05);
}

.btn-danger {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.btn-danger:hover:not(:disabled) {
  background: #ff5252;
  border-color: #ff5252;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
