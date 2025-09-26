<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog ref="popup_ref" class="popup" @close="visible = false">
      <slot></slot>
      <div v-if="actionsToRender.length" class="flex items-center justify-center gap-[20px]">
        <button
          v-for="action in actionsToRender"
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
type PopupAction = {
  key?: string | number;
  label: string;
  handler?: () => unknown | Promise<unknown>;
  closeOnClick?: boolean; //点击按钮后是否关闭弹窗
  class?: string;
};

const visible = defineModel<boolean>({ required: true });
const popup_ref = useTemplateRef<HTMLDialogElement>('popup_ref');

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'action', action: PopupAction): void;
}>();

const props = withDefaults(
  defineProps<{
    actions?: PopupAction[];
    onConfirm?: () => unknown | Promise<unknown>;
    onCancel?: () => unknown | Promise<unknown>;
    // 控制是否显示默认的确认按钮
    showConfirm?: boolean;
  }>(),
  {
    actions: undefined,
    onConfirm: undefined,
    onCancel: undefined,
    showConfirm: true,
  },
);
/**
 * 创建确认按钮
 */
const createConfirmAction = (): PopupAction => ({
  key: 'confirm',
  label: '确认',
  class: 'popup-button-ok',
  handler: async () => {
    emit('confirm');
    if (props.onConfirm) {
      return await props.onConfirm();
    }
    return true;
  },
  closeOnClick: true, 
});

/**
 * 创建取消按钮
 */
const createCancelAction = (): PopupAction => ({
  key: 'cancel',
  label: '取消',
  handler: async () => {
    emit('cancel');
    if (props.onCancel) {
      return await props.onCancel();
    }
    return true;
  },
  closeOnClick: true, 
});

const actionsToRender = computed(() => {
  const actions: PopupAction[] = [];

  if (props.actions && props.actions.length > 0) {
    actions.push(...props.actions);
  } else if (props.showConfirm !== false) {
    actions.push(createConfirmAction());
  }

  const hasCancelAction = actions.some(action => action.key === 'cancel');
  if (!hasCancelAction) {
    actions.push(createCancelAction());
  }

  return actions;
});

const close = () => {
  visible.value = false;
};

const handleActionClick = async (action: PopupAction) => {
  emit('action', action);

  const result = action.handler ? await action.handler() : undefined;
  // 如果返回 false，则暂时不关闭弹窗
  if (result === false) {
    return;
  }

  if (action.closeOnClick ?? true) {
    close();
  }
};

/**
 * 监听 visible 的变化，如果 visible 为 true，则显示弹窗，如果 visible 为 false，则关闭弹窗
 */
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

<style lang="scss" scoped></style>
