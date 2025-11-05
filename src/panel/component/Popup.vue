<template>
  <VueFinalModal
    v-model="visible"
    class="TH-popup TH-custom-tailwind absolute! flex h-full w-full items-center justify-center"
    :teleport-to="'body'"
    :z-index-fn="() => 10000"
    :hide-overlay="true"
    @closed="emit('closed')"
  >
    <div
      ref="dialog_ref"
      class="popup box-border justify-between px-1.5! focus:outline-none"
      role="dialog"
      aria-modal="true"
      :class="{
        'w-[500px]': width === 'normal',
        'h-dvh w-dvw!': width === 'full',
        'w-fit!': width === 'fit',
      }"
      :style="
        ['normal', 'full', 'fit'].includes(width)
          ? ''
          : width === 'wide'
            ? 'min-width: 50vw !important'
            : `width: ${width} !important;`
      "
    >
      <div class="h-full max-h-[80vh] overflow-y-auto">
        <slot></slot>
      </div>
      <div v-if="buttons.length" class="my-0.5 flex items-center justify-center gap-[20px]">
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
    width?: string | 'normal' | 'wide' | 'full' | 'fit';
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
