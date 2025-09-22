import Dialog from '@/panel/component/Dialog.vue';
import { h, ref, Teleport, type Component, type VNode } from 'vue';

export interface FloatingDialogState {
  id: string;
  title: string;
  contentComponent: Component;
  isOpen: boolean;
}

// 全局浮窗状态
const dialogStates = ref<Map<string, FloatingDialogState>>(new Map());

export function isDialogOpen(id: string): boolean {
  const state = dialogStates.value.get(id);
  return state?.isOpen ?? false;
}

export function closeDialogById(id: string): void {
  const state = dialogStates.value.get(id);
  if (state) {
    state.isOpen = false;
    // 延迟删除状态，给动画时间
    setTimeout(() => {
      dialogStates.value.delete(id);
    }, 300);
  }
}

export function openDialogOnceById(id: string, title: string, contentComponent: Component): void {
  const existingState = dialogStates.value.get(id);
  if (existingState?.isOpen) {
    return;
  }

  const state: FloatingDialogState = {
    id,
    title,
    contentComponent,
    isOpen: true,
  };

  dialogStates.value.set(id, state);
}

/**
 * 渲染所有活动的浮窗
 * 这个函数应该在主应用的模板中调用
 */
export function renderFloatingDialogs(): VNode[] {
  return Array.from(dialogStates.value.values())
    .filter(state => state.isOpen)
    .map(state =>
      h(
        Teleport,
        { to: 'body', key: state.id },
        h(
          Dialog,
          {
            title: state.title,
            storageId: state.id,
            onClose: () => closeDialogById(state.id),
          },
          {
            content: () => h(state.contentComponent),
          },
        ),
      ),
    );
}
