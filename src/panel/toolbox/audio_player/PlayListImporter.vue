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
      <div class="flex items-center justify-center gap-0.5">
        <h3>{{ t`导入音频链接` }}</h3>
      </div>

      <!-- Tab 切换按钮 -->
      <div class="mb-0.5 flex items-center gap-0.25">
        <button
          class="menu_button interactable flex-1"
          :class="{ 'bg-(--SmartThemeQuoteColor)! font-bold filter-none!': active_tab === 'single' }"
          @click="active_tab = 'single'"
        >
          {{ t`单个添加` }}
        </button>
        <button
          class="menu_button interactable flex-1"
          :class="{ 'bg-(--SmartThemeQuoteColor)! font-bold filter-none!': active_tab === 'batch' }"
          @click="active_tab = 'batch'"
        >
          {{ t`批量导入` }}
        </button>
      </div>

      <!-- 单个添加模式 -->
      <div v-if="active_tab === 'single'" class="flex flex-col gap-0.5">
        <div v-for="(item, index) in items" :key="index" class="flex items-center gap-0.25">
          <div class="flex w-full gap-0.25">
            <input v-model="item.title" type="text" :placeholder="t`标题（可选）`" class="text_pole flex-1" />
            <input v-model="item.url" type="text" :placeholder="t`音频链接 URL`" class="text_pole flex-2" />
          </div>
          <button
            v-if="items.length > 1"
            class="menu_button interactable bg-(--crimson70a)!"
            @click="removeItem(index)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <button class="menu_button interactable w-full!" @click="addItem">
          <i class="fa-solid fa-plus"></i> {{ t`添加更多` }}
        </button>
      </div>

      <!-- 批量导入模式 -->
      <div v-else-if="active_tab === 'batch'" class="flex flex-col gap-0.5">
        <small>
          {{ t`每行一个链接，可选格式：URL 或 URL,标题` }}
        </small>
        <textarea
          v-model="batch_text"
          :placeholder="
            t`示例：&#10;https://example.com/audio1.mp3&#10;https://example.com/audio2.mp3,我的音乐&#10;https://example.com/audio3.mp3`
          "
          rows="10"
          class="text_pole font-(family-name:--monoFontFamily)!"
        />
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import { handle_url_to_title } from '@/function/audio';
import Popup from '@/panel/component/Popup.vue';

const props = defineProps<{
  onSubmit: (items: { title: string; url: string }[]) => void;
}>();

const active_tab = ref<'single' | 'batch'>('single');
const items = ref<{ title: string; url: string }[]>([{ url: '', title: '' }]);
const batch_text = ref('');

const submit = (close: () => void) => {
  let validItems: { title: string; url: string }[] = [];

  if (active_tab.value === 'single') {
    // 单个添加模式：过滤出有效的项（至少有 URL）
    validItems = items.value
      .filter(item => item.url.trim() !== '')
      .map(item => {
        const url = item.url.trim();
        const title = item.title.trim();

        // 如果标题为空，自动从 URL 中提取标题
        const finalTitle = title || handle_url_to_title(url);

        return {
          url,
          title: finalTitle,
        };
      });
  } else {
    // 批量导入模式：解析多行文本
    validItems = batch_text.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => {
        // 使用英文逗号分隔 URL 和标题
        const parts = line.split(',').map(part => part.trim());
        const url = parts[0];
        const title = parts[1] || handle_url_to_title(url);

        return {
          url,
          title,
        };
      });
  }

  if (validItems.length > 0) {
    props.onSubmit(validItems);
  }
  close();
};

const addItem = () => {
  items.value.push({ url: '', title: '' });
};

const removeItem = (index: number) => {
  items.value.splice(index, 1);
};
</script>
