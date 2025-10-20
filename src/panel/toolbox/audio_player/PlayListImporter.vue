<template>
  <!-- prettier-ignore -->
  <Popup v-model="isVisible" :buttons="popupButtons">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-center gap-0.5">
        <h3>导入音频链接</h3>
      </div>

      <!-- Tab 切换按钮 -->
      <div class="mb-0.5 flex items-center gap-0.25">
        <button
          class="menu_button interactable flex-1"
          :class="{ 'bg-(--SmartThemeQuoteColor)! font-bold filter-none!': activeTab === 'single' }"
          @click="activeTab = 'single'"
        >
          单个添加
        </button>
        <button
          class="menu_button interactable flex-1"
          :class="{ 'bg-(--SmartThemeQuoteColor)! font-bold filter-none!': activeTab === 'batch' }"
          @click="activeTab = 'batch'"
        >
          批量导入
        </button>
      </div>

      <!-- 单个添加模式 -->
      <div v-if="activeTab === 'single'" class="flex flex-col gap-0.5">
        <div v-for="(item, index) in items" :key="index" class="flex items-center gap-0.25">
          <div class="flex w-full gap-0.25">
            <input
              v-model="item.title"
              type="text"
              placeholder="标题（可选）"
              class="text_pole flex-1"
            />
            <input
              v-model="item.url"
              type="text"
              placeholder="音频链接 URL"
              class="text_pole flex-2"
            />
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
          <i class="fa-solid fa-plus"></i> 添加更多
        </button>
      </div>

      <!-- 批量导入模式 -->
      <div v-else-if="activeTab === 'batch'" class="flex flex-col gap-0.5">
        <small>
          每行一个链接，可选格式：URL 或 URL,标题
        </small>
        <textarea
          v-model="batchText"
          placeholder="示例：&#10;https://example.com/audio1.mp3&#10;https://example.com/audio2.mp3,我的音乐&#10;https://example.com/audio3.mp3"
          rows="10"
          class="text_pole font-[family-name:var(--monoFontFamily)]!"
        />
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import { handle_url_to_title } from '@/function/audio';
import Popup from '@/panel/component/Popup.vue';

const props = defineProps<{
  onSubmit?: (items: { title: string; url: string }[]) => void;
}>();

const activeTab = ref<'single' | 'batch'>('single');
const items = ref<{ title: string; url: string }[]>([{ url: '', title: '' }]);
const batchText = ref('');

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
  let validItems: { title: string; url: string }[] = [];

  if (activeTab.value === 'single') {
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
    validItems = batchText.value
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
    props.onSubmit?.(validItems);
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
