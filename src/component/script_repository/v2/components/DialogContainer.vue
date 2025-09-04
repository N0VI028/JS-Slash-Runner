<template>
  <Teleport to="body">
    <!-- 对话框容器 -->
    <div v-if="hasDialogs" class="dialog-overlay" @click="handleOverlayClick">
      <Transition name="dialog" appear>
        <div v-if="currentDialog" class="dialog" @click.stop>
          <!-- 对话框头部 -->
          <div class="dialog-header">
            <h3 class="dialog-title">{{ currentDialog.title }}</h3>
            <button v-if="currentDialog.cancelable" @click="handleCancel" class="dialog-close-btn" title="关闭">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="dialog-body">
            <!-- 内置消息类型 -->
            <div v-if="currentDialog.type === 'alert' || currentDialog.type === 'confirm'" class="dialog-message">
              <div class="message-icon">
                <i :class="getDialogIcon(currentDialog.type)"></i>
              </div>
              <div class="message-text">{{ currentDialog.message }}</div>
            </div>

            <!-- 自定义组件 -->
            <component
              v-else-if="currentDialog.component"
              :is="currentDialog.component"
              v-bind="currentDialog.props || {}"
              @confirm="handleConfirm"
              @cancel="handleCancel"
            />
          </div>

          <!-- 对话框底部按钮 -->
          <div class="dialog-footer">
            <template v-if="currentDialog.type === 'confirm'">
              <button @click="handleCancel" class="dialog-btn dialog-btn-cancel">取消</button>
              <button @click="handleConfirm" class="dialog-btn dialog-btn-confirm">确认</button>
            </template>
            <template v-else-if="currentDialog.type === 'alert'">
              <button @click="handleConfirm" class="dialog-btn dialog-btn-primary">确定</button>
            </template>
            <!-- 自定义组件的按钮由组件内部处理 -->
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../stores/ui.store';

// Store
const uiStore = useUiStore();

// Computed
const hasDialogs = computed(() => uiStore.hasDialogs);
const currentDialog = computed(() => uiStore.currentDialog);

// Methods
/**
 * 获取对话框图标
 */
const getDialogIcon = (type: string): string => {
  const iconMap = {
    confirm: 'fa-solid fa-question-circle',
    alert: 'fa-solid fa-exclamation-triangle',
  };
  return iconMap[type as keyof typeof iconMap] || 'fa-solid fa-info-circle';
};

/**
 * 处理遮罩层点击
 */
const handleOverlayClick = (): void => {
  if (currentDialog.value?.cancelable && !currentDialog.value?.persistent) {
    handleCancel();
  }
};

/**
 * 处理确认
 */
const handleConfirm = (data?: any): void => {
  if (currentDialog.value?.onConfirm) {
    currentDialog.value.onConfirm(data);
  }
  uiStore.closeDialog();
};

/**
 * 处理取消
 */
const handleCancel = (): void => {
  if (currentDialog.value?.onCancel) {
    currentDialog.value.onCancel();
  }
  uiStore.closeDialog();
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.dialog {
  background: var(--SmartThemeBlurTintColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid var(--SmartThemeBorderColor);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--SmartThemeEmColor);
}

.dialog-close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dialog-close-btn:hover {
  color: var(--SmartThemeEmColor);
  background: rgba(255, 255, 255, 0.1);
}

.dialog-body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.dialog-message {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.message-icon {
  flex-shrink: 0;
  font-size: 24px;
  color: var(--SmartThemeEmColor);
}

.message-text {
  flex: 1;
  line-height: 1.5;
  color: var(--SmartThemeBodyColor);
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 20px 24px;
  border-top: 1px solid var(--SmartThemeBorderColor);
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--SmartThemeBorderColor);
  background: none;
  color: var(--SmartThemeBodyColor);
}

.dialog-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dialog-btn-cancel {
  color: #888;
}

.dialog-btn-cancel:hover {
  color: var(--SmartThemeBodyColor);
  border-color: var(--SmartThemeBodyColor);
}

.dialog-btn-confirm,
.dialog-btn-primary {
  background: var(--SmartThemeQuoteColor);
  color: var(--SmartThemeEmColor);
  border-color: var(--SmartThemeEmColor);
}

.dialog-btn-confirm:hover,
.dialog-btn-primary:hover {
  background: var(--SmartThemeEmColor);
  color: var(--SmartThemeQuoteColor);
}

/* 过渡动画 */
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

/* 滚动条样式 */
.dialog-body::-webkit-scrollbar {
  width: 6px;
}

.dialog-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.dialog-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
