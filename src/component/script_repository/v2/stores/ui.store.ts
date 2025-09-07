import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Toast 消息类型
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // 0 表示不自动消失
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * 加载状态
 */
export interface LoadingState {
  id: string;
  message: string;
  progress?: number; // 0-100
}

export const useUiStore = defineStore('ui', () => {
  // ===== State =====

  /**
   * Toast 消息队列
   */
  const toasts = ref<ToastMessage[]>([]);

  /**
   * 加载状态
   */
  const loadingStates = ref<Map<string, LoadingState>>(new Map());

  /**
   * 全局 pending 操作计数
   */
  const pendingCount = ref<number>(0);

  // ===== Getters =====

  /**
   * 是否显示 toast
   */
  const hasToasts = computed(() => toasts.value.length > 0);

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => loadingStates.value.size > 0 || pendingCount.value > 0);

  /**
   * 当前加载状态列表
   */
  const currentLoadingStates = computed(() => Array.from(loadingStates.value.values()));

  // ===== Actions =====

  /**
   * 推送 Toast 消息
   */
  function pushToast(toast: Omit<ToastMessage, 'id'>): string {
    const id = crypto.randomUUID();
    const toastMessage: ToastMessage = {
      id,
      duration: 5000, // 默认5秒
      ...toast,
    };

    toasts.value.push(toastMessage);

    // 自动移除
    if (toastMessage.duration && toastMessage.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastMessage.duration);
    }

    return id;
  }

  /**
   * 移除 Toast 消息
   */
  function removeToast(id: string): void {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  /**
   * 清空所有 Toast
   */
  function clearToasts(): void {
    toasts.value = [];
  }

  /**
   * 显示成功消息
   */
  function showSuccess(title: string, message?: string): string {
    return pushToast({
      type: 'success',
      title,
      message,
    });
  }

  /**
   * 显示错误消息
   */
  function showError(title: string, message?: string): string {
    return pushToast({
      type: 'error',
      title,
      message,
      duration: 0, // 错误消息不自动消失
    });
  }

  /**
   * 显示警告消息
   */
  function showWarning(title: string, message?: string): string {
    return pushToast({
      type: 'warning',
      title,
      message,
    });
  }

  /**
   * 显示信息消息
   */
  function showInfo(title: string, message?: string): string {
    return pushToast({
      type: 'info',
      title,
      message,
    });
  }

  /**
   * 开始加载状态
   */
  function beginLoading(id: string, message: string, progress?: number): void {
    loadingStates.value.set(id, {
      id,
      message,
      progress,
    });
  }

  /**
   * 更新加载进度
   */
  function updateLoadingProgress(id: string, progress: number): void {
    const state = loadingStates.value.get(id);
    if (state) {
      state.progress = progress;
    }
  }

  /**
   * 结束加载状态
   */
  function endLoading(id: string): void {
    loadingStates.value.delete(id);
  }

  /**
   * 清空所有加载状态
   */
  function clearAllLoading(): void {
    loadingStates.value.clear();
  }

  /**
   * 增加 pending 计数
   */
  function incrementPending(): void {
    pendingCount.value++;
  }

  /**
   * 减少 pending 计数
   */
  function decrementPending(): void {
    if (pendingCount.value > 0) {
      pendingCount.value--;
    }
  }

  /**
   * 重置 pending 计数
   */
  function resetPending(): void {
    pendingCount.value = 0;
  }

  return {
    // State
    toasts,
    loadingStates,
    pendingCount,

    // Getters
    hasToasts,
    isLoading,
    currentLoadingStates,

    // Toast Actions
    pushToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Loading Actions
    beginLoading,
    updateLoadingProgress,
    endLoading,
    clearAllLoading,
    incrementPending,
    decrementPending,
    resetPending,
  };
});