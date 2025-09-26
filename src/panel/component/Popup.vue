<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog ref="popup_ref" class="popup" @close="visible = false">
      <slot></slot>
      <div v-if="actionsToRender.length" class="flex items-center justify-center gap-[5px]">
        <button
          v-for="action in actionsToRender"
          :key="action.key ?? action.label"
          class="menu_button interactable w-[unset]!"
          :class="action.class"
          :disabled="action.disabled"
          @click="handleActionClick(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
type PopupAction = {
  key?: string | number;
  label: string;
  handler?: () => unknown | Promise<unknown>;
  closeOnClick?: boolean; //点击按钮后是否关闭弹窗
  class?: string;
  disabled?: boolean; //控制交互，比如表单填写不正确时按钮不可点击
};

const visible = defineModel<boolean>({ required: true });
const popup_ref = useTemplateRef<HTMLDialogElement>('popup_ref');

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'action', action: PopupAction): void;
}>();

const props = defineProps<{
  actions?: PopupAction[];
}>();

const defaultActions: PopupAction[] = [
  {
    key: 'confirm',
    label: '确认',
    class: 'popup-button-ok',
    handler: () => emit('confirm'),
    closeOnClick: true,
  },
  {
    key: 'cancel',
    label: '取消',
    handler: () => emit('cancel'),
    closeOnClick: true,
  },
];

const actionsToRender = computed(() => (props.actions !== undefined ? props.actions : defaultActions));

const close = () => {
  visible.value = false;
};

const handleActionClick = async (action: PopupAction) => {
  emit('action', action);

  try {
    await action.handler?.();
  } catch (error) {
    console.error('[TH-Popup] Popup 弹窗操作处理错误:', error);
    return;
  }

  if (action.closeOnClick ?? true) {
    close();
  }
};

watch(
  visible,
  async visible => {
    if (visible) {
      await nextTick();
      if (!popup_ref.value) {
        return;
      }
      popup_ref.value.showModal();
    } else if (popup_ref.value?.open) {
      popup_ref.value.close();
    }
  },
  { immediate: true },
);

defineExpose({ close });
</script>

<style lang="scss" scoped>
</style>
