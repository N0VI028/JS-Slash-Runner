<template>
  <div class="flex h-full w-full flex-col overflow-hidden py-0.5">
    <div class="relative flex h-4 justify-start py-0.5">
      <DefineTabTemplate v-slot="{ id, active, name }">
        <div :id="id" :class="['TH-tab-item', { 'TH-active': active }]" @click="handleTabClick(id)">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </DefineTabTemplate>
      <ReuseTabTemplate id="global-tab" :active="active_tab === 'global'" :name="t`全局`" />
      <ReuseTabTemplate id="character-tab" :active="active_tab === 'character'" :name="t`角色`" />
      <ReuseTabTemplate id="chat-tab" :active="active_tab === 'chat'" :name="t`聊天`" />
      <ReuseTabTemplate id="message-tab" :active="active_tab === 'message'" :name="t`消息楼层`" />
    </div>
    <div class="flex-container justify-between px-1">
      <div class="flex items-center gap-1">
        <div
          id="filter-icon"
          class="flex h-2 w-2 cursor-pointer items-center justify-center rounded-sm transition-all duration-300"
          title="筛选变量类型"
        >
          <i class="fa-solid fa-filter"></i>
        </div>
      </div>
      <SearchBar v-model="search_input" :placeholder="t`搜索变量...`" :clearable="true" class="w-full flex-1" />
      <div class="flex gap-0.5 whitespace-nowrap">
        <div id="add-variable" class="menu_button_icon menu_button interactable">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新建` }}</span>
        </div>
        <div id="clear-all" class="menu_button_icon menu_button interactable">
          <i class="fa-solid fa-trash"></i>
          <span>{{ t`清空` }}</span>
        </div>
      </div>
    </div>
    <div
      id="TH-filter-options"
      class="mb-1 flex flex-wrap gap-1 rounded-sm bg-(--SmartThemeQuoteColor) p-1"
      style="display: none"
    >
      <DefineOptionTemplate v-slot="{ type, checked, name }">
        <div class="TH-filter-option">
          <input
            :id="`filter-${type}`"
            type="checkbox"
            class="TH-filter-checkbox"
            :data-type="type"
            :checked="checked"
          />
          <label :for="`filter-${type}`">{{ name }}</label>
        </div>
      </DefineOptionTemplate>
      <ReuseOptionTemplate type="string" :checked="true" :name="t`字符串`" />
      <ReuseOptionTemplate type="object" :checked="true" :name="t`对象`" />
      <ReuseOptionTemplate type="array" :checked="true" :name="t`数组`" />
      <ReuseOptionTemplate type="number" :checked="true" :name="t`数字`" />
      <ReuseOptionTemplate type="boolean" :checked="true" :name="t`布尔值`" />
    </div>

    <div
      id="floor-filter-container"
      class="my-0.75 hidden rounded-sm bg-(--SmartThemeQuoteColor) p-0.75 text-(length:--TH-FontSize-sm)"
    >
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center justify-between gap-0.75">
          <div class="flex flex-1 items-center">
            <input id="floor-min" type="number" class="TH-floor-input" min="0" placeholder="最小" />
            <span class="mx-0.5 text-(--SmartThemeBodyColor)">~</span>
            <input id="floor-max" type="number" class="TH-floor-input" min="0" placeholder="最大" />
          </div>
          <!-- prettier-ignore-attribute -->
          <button
            id="floor-filter-btn"
            class="
              flex items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75 py-0.25
              text-(length:--TH-FontSize-sm)
              text-(--SmartThemeTextColor)
            "
          >
            <i class="fa-solid fa-check"></i>
            <span>确认</span>
          </button>
        </div>
        <div id="floor-filter-error" class="hidden py-0.25 text-(length:--TH-FontSize-sm) text-(--warning)">
          最大楼层不能小于最小楼层
        </div>
      </div>
    </div>
    <DefineContentTemplate v-slot="{ id, hidden }">
      <div :id="id" :class="[hidden ? 'hidden' : '']">
        <div class="variable-list">
          <Card name="示例变量" content="示例值" />
        </div>
      </div>
    </DefineContentTemplate>

    <div class="flex-1 overflow-y-auto p-1">
      <ReuseContentTemplate id="global-content" :hidden="active_tab !== 'global'" />
      <ReuseContentTemplate id="character-content" :hidden="active_tab !== 'character'" />
      <ReuseContentTemplate id="chat-content" :hidden="active_tab !== 'chat'" />
      <ReuseContentTemplate id="message-content" :hidden="active_tab !== 'message'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';
import { createReusableTemplate } from '@vueuse/core';

const [DefineContentTemplate, ReuseContentTemplate] = createReusableTemplate<{ id: string; hidden?: boolean }>();
const [DefineOptionTemplate, ReuseOptionTemplate] = createReusableTemplate<{
  type: string;
  checked?: boolean;
  name?: string;
}>();
const [DefineTabTemplate, ReuseTabTemplate] = createReusableTemplate<{ id: string; active?: boolean; name?: string }>();

const active_tab = useLocalStorage<string>('tavern_helper_variable_manager_active_tab', 'global');
const search_input = ref('');

const handleTabClick = (tabId: string) => {
  // 从 tab id 中提取 tab 名称 (例如: "character-tab" -> "character")
  const tab_name = tabId.replace('-tab', '');
  active_tab.value = tab_name;
};
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-tab-item {
  @apply px-1 cursor-pointer relative flex items-center z-1 h-full;

  &-text {
    @apply text-(length:--TH-FontSize-base) transition-all duration-300 ease-in-out relative inline-block;
  }

  &-text::after {
    @apply content-[''] absolute left-0 bottom-0 w-full h-0.25 bg-(--SmartThemeQuoteColor) transition-transform duration-300 ease-in-out;
    transform: scaleX(0);
    transform-origin: center;
  }

  &.TH-active &-text {
    @apply font-bold text-(length:--TH-FontSize-md);
  }
  &.TH-active &-text::after {
    transform: scaleX(1);
  }
}

.TH-filter-option {
  @apply flex items-center gap-0.5;
}

.TH-filter-checkbox {
  @apply m-0;
}

.TH-floor-input,
.TH-variable-search {
  @apply w-full h-2 rounded-sm bg-(--SmartThemeQuoteColor) px-1 py-0.5 text-(--SmartThemeTextColor);
}
</style>
