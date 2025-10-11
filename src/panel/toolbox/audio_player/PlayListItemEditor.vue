<template>
  <Popup v-model="isVisible" :buttons="popupButtons">
    <div class="flex flex-col gap-0.5">
      <h4>编辑音频项</h4>
      <div class="flex flex-col gap-0.5">
        <label>
          <span>标题（可选）</span>
          <input v-model="title" type="text" class="text_pole" placeholder="音频标题（可选）" />
        </label>
        <label>
          <span>链接</span>
          <input v-model="url" type="text" class="text_pole" placeholder="音频链接" required />
        </label>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">

const props = defineProps<{
  item: { url: string; title?: string };
  onSubmit?: (item: { url: string; title?: string }) => void;
}>();

const url = ref(props.item.url);
const title = ref(props.item.title || '');

const popupButtons = computed(() => [
  {
    name: '确认',
    shouldEmphasize: true,
    onClick: submit,
  },
  { name: '取消' },
]);

const isVisible = ref(true);

const submit = (close: () => void) => {
  if (!url.value.trim()) {
    return;
  }
  props.onSubmit?.({
    url: url.value,
    title: title.value || undefined,
  });
  close();
};
</script>
