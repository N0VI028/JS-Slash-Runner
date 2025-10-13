<template>
  <VueFinalModal
    v-model="visible"
    class="TH-popup absolute! top-1/2! left-1/2! h-fit -translate-x-1/2 -translate-y-1/2"
    content-class="flex items-center justify-center"
    :teleport-to="'body'"
    :z-index-fn="() => 10000"
    :hide-overlay="true"
  >
    <div
      ref="dialog_ref"
      class="popup box-border px-1.5! focus:outline-none"
      :class="width === 'normal' ? 'w-fit!' : width === 'wide' ? 'w-full!' : ''"
      :style="width !== 'normal' && width !== 'wide' ? `width: ${width} !important;` : ''"
      role="dialog"
      aria-modal="true"
    >
      <div class="max-h-[80vh] overflow-y-auto">
        <slot></slot>
      </div>
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
    </div>
  </VueFinalModal>
</template>

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal';

const visible = defineModel<boolean>();

const emit = defineEmits<{
  'update:modelValue': [model_value: boolean];
  opened: [void];
  beforeClose: [event: { stop: () => void }];
  closed: [void];
}>();

withDefaults(
  defineProps<{
    buttons?: {
      name: string;
      onClick?: ((close: () => void) => void) | ((close: () => void) => Promise<void>);
      shouldEmphasize?: boolean;
      class?: string;
    }[];
    width?: string | 'normal' | 'wide';
  }>(),
  {
    buttons: () => [{ name: '取消' }],
    width: 'normal',
  },
);

const dialog_ref = useTemplateRef<HTMLDivElement>('dialog_ref');

function close() {
  visible.value = false;
}
</script>
