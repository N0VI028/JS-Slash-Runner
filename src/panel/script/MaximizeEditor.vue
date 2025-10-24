<template>
  <Popup
    :buttons="[
      { name: t`确认`, shouldEmphasize: true, onClick: close => onConfirm(close) },
      { name: t`取消`, onClick: close => onCancel(close) },
    ]"
    width="wide"
    @closed="() => emit('closed')"
  >
    <div class="flex h-full max-h-[80vh] w-full flex-col gap-1 overflow-y-auto text-left">
      <template v-if="props.target === 'content' || props.target === 'info'">
        <textarea
          v-model="text"
          :placeholder="props.target === 'content' ? t`JavaScript 代码` : t`备注文本`"
          class="text_pole h-dvh! min-h-[50vh] font-(family-name:--monoFontFamily)!"
        />
      </template>
      <template v-else>
        <JsonEditor v-model="data" class="py-1.5" />
      </template>
    </div>
  </Popup>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    target: 'content' | 'info' | 'data';
    initialText?: string;
    initialData?: Record<string, any>;
  }>(),
  {
    initialText: '',
    initialData: () => ({}),
  },
);

type MaximizeTarget = 'content' | 'info' | 'data';

const emit = defineEmits<{
  confirm: [payload: { target: MaximizeTarget; text?: string; data?: Record<string, any> }];
  closed: [void];
}>();

const text = ref<string>(props.initialText ?? '');
const data = ref<Record<string, any>>(klona(props.initialData ?? {}));

function onConfirm(close: () => void) {
  if (props.target === 'data') {
    emit('confirm', { target: props.target, data: klona(data.value) });
  } else {
    emit('confirm', { target: props.target, text: text.value });
  }
  close();
}

function onCancel(close: () => void) {
  close();
}
</script>
