<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog ref="dialog_ref" class="popup" @close="close">
      <slot></slot>
      <div v-if="all_actions.length" class="flex items-center justify-center gap-[20px]">
        <button
          v-for="action in all_actions"
          :key="action.key ?? action.label"
          class="menu_button interactable w-[unset]!"
          :class="action.class"
          @click="handleActionClick(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue';

const dialog_ref = ref<HTMLDialogElement | null>(null);

type PopupButton = {
  key?: string | number;
  label: string;
  /** 返回 true 代表关闭弹窗。 */
  onClick: (() => boolean) | (() => Promise<boolean>);
  class?: string;
};

const visible = defineModel<boolean>({ required: true });

const props = defineProps<{
  buttons?: PopupButton[];
  /** 可选确认处理。 */
  onConfirm?: (() => boolean) | (() => Promise<boolean>);
  /** 可选取消处理，默认直接关闭。 */
  onCancel?: (() => boolean) | (() => Promise<boolean>);
}>();

const all_actions = computed(() => {
  const actions: PopupButton[] = [];

  if (props.buttons && props.buttons.length > 0) {
    actions.push(...props.buttons);
  }

  const has_confirm = actions.some(action => action.key === 'confirm');
  if (!has_confirm && props.onConfirm) {
    actions.push({
      key: 'confirm',
      label: '确认',
      onClick: async () => {
        return await props.onConfirm!();
      },
      class: 'popup-button-ok',
    });
  }

  const has_cancel = actions.some(action => action.key === 'cancel');
  if (!has_cancel) {
    actions.push({
      key: 'cancel',
      label: '取消',
      onClick: async () => {
        if (!props.onCancel) {
          return true;
        }
        return await props.onCancel();
      },
    });
  }

  return actions;
});

const ensureDialogClosed = () => {
  const dialogEl = dialog_ref.value;
  if (dialogEl?.open) {
    dialogEl.close();
  }
};

const ensureDialogVisible = async () => {
  await nextTick();
  const dialogEl = dialog_ref.value;
  if (dialogEl && !dialogEl.open) {
    dialogEl.showModal();
  }
};

const syncDialogVisibility = (shouldOpen: boolean) => {
  if (shouldOpen) {
    ensureDialogVisible();
  } else {
    ensureDialogClosed();
  }
};

const handleActionClick = async (action: PopupButton) => {
  const result = await action.onClick();
  if (result) {
    close();
  }
};

const close = () => {
  ensureDialogClosed();
  visible.value = false;
};

watch(
  () => visible.value,
  newValue => {
    syncDialogVisibility(newValue);
  },
  { immediate: true },
);

onMounted(() => {
  syncDialogVisibility(visible.value);
});

defineExpose({ close });
</script>
