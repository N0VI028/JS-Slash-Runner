<template>
  <Popup
    :buttons="[
      {
        name: t`确认`,
        shouldEmphasize: true,
        onClick: submit,
      },
      { name: t`取消` },
    ]"
  >
    <div class="flex flex-col gap-0.5">
      <h3>{{ t`编辑音频项` }}</h3>
      <div class="flex flex-col gap-0.5">
        <label>
          <strong>{{ t`标题` }}</strong
          ><small class="block">{{ t`留空将自动从链接中提取文件名` }}</small>
          <input v-model="title" type="text" class="text_pole" :placeholder="t`音频标题（可选）`" />
        </label>
        <label>
          <strong>{{ t`链接` }}</strong>
          <input v-model="url" type="text" class="text_pole" :placeholder="t`音频链接`" required />
        </label>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import { handle_url_to_title } from '@/function/audio';

const props = defineProps<{
  item: { title: string; url: string };
  onSubmit: (item: { title: string; url: string }) => void;
}>();

const url = ref(props.item.url);
const title = ref(props.item.title || '');

const submit = (close: () => void) => {
  if (!url.value.trim()) {
    return;
  }

  // 如果标题为空，自动从 URL 中提取标题
  const finalTitle = title.value.trim() || handle_url_to_title(url.value);

  props.onSubmit({
    url: url.value,
    title: finalTitle,
  });
  close();
};
</script>
