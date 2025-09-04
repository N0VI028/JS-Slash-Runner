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
  duration?: number; // 毫秒，0 表示不自动消失
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * 对话框配置
 */
export interface DialogConfig {
  id: string;
  type: 'confirm' | 'alert' | 'custom';
  title: string;
  message?: string;
  component?: string; // 自定义组件名称
  props?: Record<string, any>; // 传递给组件的属性
  onConfirm?: (data?: any) => void;
  onCancel?: () => void;
  cancelable?: boolean; // 是否可以取消
  persistent?: boolean; // 是否持久显示（不能点击外部关闭）
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
   * 对话框栈
   */
  const dialogs = ref<DialogConfig[]>([]);

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
   * 是否显示对话框
   */
  const hasDialogs = computed(() => dialogs.value.length > 0);

  /**
   * 当前对话框
   */
  const currentDialog = computed(() => (dialogs.value.length > 0 ? dialogs.value[dialogs.value.length - 1] : null));

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
   * 打开对话框
   */
  function openDialog(dialog: Omit<DialogConfig, 'id'>): string {
    const id = crypto.randomUUID();
    const dialogConfig: DialogConfig = {
      id,
      cancelable: true,
      persistent: false,
      ...dialog,
    };

    dialogs.value.push(dialogConfig);
    return id;
  }

  /**
   * 关闭对话框
   */
  function closeDialog(id?: string): void {
    if (id) {
      const index = dialogs.value.findIndex(dialog => dialog.id === id);
      if (index !== -1) {
        dialogs.value.splice(index, 1);
      }
    } else {
      // 关闭最顶层的对话框
      dialogs.value.pop();
    }
  }

  /**
   * 关闭所有对话框
   */
  function closeAllDialogs(): void {
    dialogs.value = [];
  }

  /**
   * 显示确认对话框
   */
  function showConfirm(title: string, message: string, onConfirm?: () => void, onCancel?: () => void): string {
    return openDialog({
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  }

  /**
   * 显示警告对话框
   */
  function showAlert(title: string, message: string): string {
    return openDialog({
      type: 'alert',
      title,
      message,
      cancelable: false,
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
  function updateLoadingProgress(id: string, progress: number, message?: string): void {
    const state = loadingStates.value.get(id);
    if (state) {
      state.progress = progress;
      if (message) {
        state.message = message;
      }
      loadingStates.value.set(id, { ...state });
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
  function clearLoading(): void {
    loadingStates.value.clear();
  }

  /**
   * 开始 pending 操作
   */
  function beginPending(): void {
    pendingCount.value++;
  }

  /**
   * 结束 pending 操作
   */
  function endPending(): void {
    if (pendingCount.value > 0) {
      pendingCount.value--;
    }
  }

  /**
   * 清空 pending 计数
   */
  function clearPending(): void {
    pendingCount.value = 0;
  }

  return {
    // State
    toasts,
    dialogs,
    loadingStates: loadingStates.value,
    pendingCount,

    // Getters
    hasToasts,
    hasDialogs,
    currentDialog,
    isLoading,
    currentLoadingStates,

    // Actions - Toast
    pushToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Actions - Dialog
    openDialog,
    closeDialog,
    closeAllDialogs,
    showConfirm,
    showAlert,

    // Actions - Loading
    beginLoading,
    updateLoadingProgress,
    endLoading,
    clearLoading,

    // Actions - Pending
    beginPending,
    endPending,
    clearPending,
  };
});
