<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog class="popup z-[9999]" @close="close">
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
type PopupButton = {
  key?: string | number;
  label: string;
  /** 点击按钮后的回调, 返回值表示是否关闭该弹窗 */
  onClick: (() => boolean) | (() => Promise<boolean>);
  class?: string;
};

const visible = defineModel<boolean>({ required: true });

const props = defineProps<{
  buttons?: PopupButton[];
  /** 确认按钮, 不填则默认没有确认按钮 */
  onConfirm?: (() => boolean) | (() => Promise<boolean>);
  /** 取消按钮, 不填则默认添加一个 */
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

const handleActionClick = async (action: PopupButton) => {
  const result = await action.onClick();
  if (result) {
    close();
  }
};

const close = () => {
  visible.value = false;
};

defineExpose({ close });
</script>
