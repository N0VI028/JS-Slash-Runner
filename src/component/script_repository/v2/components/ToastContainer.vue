<template>
  <Teleport to="body">
    <div class="toast-container">
      <Transition-group name="toast" tag="div">
        <div v-for="toast in toasts" :key="toast.id" :class="['toast', `toast-${toast.type}`]">
          <div class="toast-content">
            <div class="toast-icon">
              <i :class="getToastIcon(toast.type)"></i>
            </div>

            <div class="toast-body">
              <div class="toast-title">{{ toast.title }}</div>
              <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
            </div>

            <div class="toast-actions">
              <button
                v-for="action in toast.actions"
                :key="action.label"
                @click="handleActionClick(action)"
                class="toast-action-btn"
              >
                {{ action.label }}
              </button>

              <button @click="removeToast(toast.id)" class="toast-close-btn" title="关闭">
                <i class="fa-solid fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </Transition-group>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../stores/ui.store';

// Store
const uiStore = useUiStore();

// Computed
const toasts = computed(() => uiStore.toasts);

// Methods
/**
 * 获取Toast图标
 */
const getToastIcon = (type: string): string => {
  const iconMap = {
    success: 'fa-solid fa-check-circle',
    error: 'fa-solid fa-exclamation-circle',
    warning: 'fa-solid fa-exclamation-triangle',
    info: 'fa-solid fa-info-circle',
  };
  return iconMap[type as keyof typeof iconMap] || iconMap.info;
};

/**
 * 移除Toast
 */
const removeToast = (id: string): void => {
  uiStore.removeToast(id);
};

/**
 * 处理操作按钮点击
 */
const handleActionClick = (action: { label: string; action: () => void }): void => {
  action.action();
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  margin-bottom: 12px;
  max-width: 400px;
  min-width: 300px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.toast-success {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(67, 160, 71, 0.95));
  border-left: 4px solid #4caf50;
}

.toast-error {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(229, 57, 53, 0.95));
  border-left: 4px solid #f44336;
}

.toast-warning {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(251, 140, 0, 0.95));
  border-left: 4px solid #ff9800;
}

.toast-info {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(30, 136, 229, 0.95));
  border-left: 4px solid #2196f3;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  color: white;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 18px;
  margin-top: 2px;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
}

.toast-actions {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  flex-shrink: 0;
}

.toast-action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toast-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toast-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.toast-close-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
