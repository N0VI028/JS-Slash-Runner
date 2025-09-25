<template>
  <Teleport v-if="visible" to="body">
    <!-- prettier-ignore-attribute -->
    <dialog
      ref="popup_ref"
      class="
        TH-popup z-auto flex max-h-[calc(100dvh-2em)] min-h-fit w-[500px] max-w-[calc(100dvw-2em)] flex-col
        overflow-visible rounded-[10px] border border-(--SmartThemeBorderColor) bg-(--SmartThemeBlurTintColor) px-[14px]
        py-[4px] text-center subpixel-antialiased shadow-[0_0_14px_var(--black70a)] backface-hidden
      "
      @close="handleClose"
    >
      <div>
        <slot></slot>
      </div>
      <button @click="handleClose">关闭</button>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{ visible: boolean }>();
const popup_ref = ref<HTMLDialogElement>();

watch(
  () => props.visible,
  async visible => {
    if (visible) {
      await nextTick();
      if (!popup_ref.value) return;
      console.log('showModal1');
      popup_ref.value.showModal();
      console.log('showModal2');
    } else if (popup_ref.value?.open) {
      popup_ref.value.close();
    }
  },
  { immediate: true },
);

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();
const handleClose = () => emit('update:visible', false);
</script>

<style lang="scss" scoped>
.TH-popup[open]::backdrop {
  backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 2));
  background-color: var(--black30a);
}
</style>
