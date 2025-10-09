<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog ref="dialog_ref" class="popup pt-0.75!">
      <slot></slot>
      <div v-if="buttons.length" class="flex items-center justify-center gap-[20px]">
        <button
          v-for="action in buttons"
          :key="action.name"
          class="menu_button interactable w-[unset]!"
          :class="[action.class, { 'popup-button-ok': action.shouldEmphasize }]"
          @click="action.onClick ? action.onClick(close) : close()"
        >
          {{ action.name }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>();

const emit = defineEmits<{
  'update:modelValue': [model_value: boolean];
  opened: [void];
  beforeClose: [event: { stop: () => void }];
  closed: [void];
}>();

withDefaults(
  defineProps<{
    clickToClose?: boolean;
    buttons?: {
      name: string;
      onClick?: ((close: () => void) => void) | ((close: () => void) => Promise<void>);
      shouldEmphasize?: boolean;
      class?: string;
    }[];
  }>(),
  {
    modelValue: true,
    clickToClose: false,
    buttons: () => [{ name: '取消' }],
  },
);

onMounted(() => {
  emit('opened');
});
function close() {
  let should_stop = false;
  emit('beforeClose', { stop: () => (should_stop = true) });
  if (should_stop) {
    return;
  }

  visible.value = false;
  emit('closed');
}

const dialog_ref = useTemplateRef('dialog_ref');
onMounted(() => {
  dialog_ref.value?.showModal();
});
onBeforeUnmount(() => {
  dialog_ref.value?.close();
});
</script>

