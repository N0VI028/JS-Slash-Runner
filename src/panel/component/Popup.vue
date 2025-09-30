<template>
  <VueFinalModal
    :click-to-close="clickToClose"
    overlay-behavior="persist"
    :z-index-fn="({ index }) => 9999 + 2 * index"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <!-- prettier-ignore-attribute -->
    <dialog class="popup pt-0.75!">
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
  </VueFinalModal>
</template>

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal';

const emit = defineEmits<{
  'update:modelValue': [model_value: boolean];
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
    clickToClose: false,
    buttons: () => [{ name: '取消' }],
  },
);

function close() {
  emit('update:modelValue', false);
}
</script>
