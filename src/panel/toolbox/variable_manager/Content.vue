<template>
  <!-- prettier-ignore -->
  <div class="flex h-full w-full flex-col overflow-hidden py-1">
    <div class="relative flex h-4 justify-start py-0.5">
      <div id="global-tab" class="TH-tab-item active">
        <div
class="TH-tab-item-text">全局</div>
      </div>
      <div id="character-tab" class="TH-tab-item"><div class="TH-tab-item-text">角色</div></div>
      <div id="chat-tab" class="TH-tab-item"><div class="TH-tab-item-text">聊天</div></div>
      <div id="message-tab" class="TH-tab-item"><div class="TH-tab-item-text">消息楼层</div></div>
    </div>
    <div class="flex-container" style="margin: 1px; justify-content: space-between">
      <div class="flex max-w-[calc(100%-200px)] flex-grow items-center gap-1">
        <div
id="filter-icon" class="flex h-2 w-2 cursor-pointer items-center justify-center rounded-sm transition-all duration-300" title="筛选变量类型">
          <i class="fa-solid fa-filter"></i>
        </div>
        <div class="min-w-5 flex-grow">
          <input
id="variable-search" type="text" class="
  h-2 w-full rounded-sm bg-(--SmartThemeQuoteColor) px-1 py-0.5 text-(--SmartThemeTextColor)
" placeholder="搜索变量..." />
        </div>
      </div>
      <div class="right-controls">
        <div id="add-variable" class="menu_button_icon menu_button interactable">
          <i class="fa-solid fa-plus"></i>
          <span>新建</span>
        </div>
        <div id="clear-all" class="menu_button_icon menu_button interactable">
          <i class="fa-solid fa-trash"></i>
          <span>清空</span>
        </div>
      </div>
    </div>
    <div id="filter-options" class="filter-options" style="display: none">
      <div class="filter-option">
        <input id="filter-string" type="checkbox" class="filter-checkbox" data-type="string" checked />
        <label for="filter-string">字符串</label>
      </div>
      <div class="filter-option">
        <input id="filter-object" type="checkbox" class="filter-checkbox" data-type="object" checked />
        <label for="filter-object">对象</label>
      </div>
      <div class="filter-option">
        <input id="filter-array" type="checkbox" class="filter-checkbox" data-type="array" checked />
        <label for="filter-array">数组</label>
      </div>
      <div class="filter-option">
        <input id="filter-number" type="checkbox" class="filter-checkbox" data-type="number" checked />
        <label for="filter-number">数字</label>
      </div>
      <div class="filter-option">
        <input id="filter-boolean" type="checkbox" class="filter-checkbox" data-type="boolean" checked />
        <label for="filter-boolean">布尔值</label>
      </div>
    </div>

    <div id="floor-filter-container" class="floor-filter-container" style="display: none">
      <div class="floor-filter-content">
        <div class="floor-range-inputs">
          <div class="floor-input-group">
            <input id="floor-min" type="number" class="floor-input" min="0" placeholder="最小" />楼
            <span class="floor-separator">~</span>
            <input id="floor-max" type="number" class="floor-input" min="0" placeholder="最大" />楼
          </div>
          <button id="floor-filter-btn" class="floor-filter-btn">
            <i class="fa-solid fa-check"></i>
            <span>确认</span>
          </button>
        </div>
        <div id="floor-filter-error" class="floor-filter-error" style="display: none">最大楼层不能小于最小楼层</div>
      </div>
    </div>

    <div class="tab-content-container">
      <div id="global-content" class="tab-content active">
        <div class="variable-list"></div>
      </div>
      <div id="character-content" class="tab-content">
        <div class="variable-list"></div>
      </div>
      <div id="chat-content" class="tab-content">
        <div class="variable-list"></div>
      </div>
      <div id="message-content" class="tab-content">
        <div class="variable-list"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeTab = ref('global');
</script>

<style scoped>
@reference "tailwindcss";
.TH-tab-item {
  @apply px-1 cursor-pointer relative flex items-center z-1 h-full;

  &-text {
    @apply text-[length:var(--TH-FontSize-md)] transition-all duration-300 ease-in-out relative inline-block;
  }

  &-text::after {
    @apply content-[''] absolute left-0 bottom-0 w-full h-0.25 bg-(--SmartThemeQuoteColor) transition-transform duration-300 ease-in-out;
    transform: scaleX(0);
    transform-origin: center;
  }

  &.active &-text {
    @apply font-bold text-[length:var(--TH-FontSize-lg)];
  }
  &.active &-text::after {
    transform: scaleX(1);
  }
}
</style>
