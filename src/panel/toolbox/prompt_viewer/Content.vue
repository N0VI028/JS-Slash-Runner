<template>
  <!-- prettier-ignore -->
  <div id="prompt-view-content" class="flex h-full flex-col overflow-hidden bg-(--SmartThemeBotMesBlurTintColor) p-1">
    <div class="z-1 flex-shrink-0">
      <div class="mb-0.75 flex items-center justify-between p-1">
        <div class="flex flex-col gap-0.25">
        <div
class="
  text-(length:--TH-FontSize)
  font-bold text-(--SmartThemeQuoteColor)
">总token数: 0</div>
        <div
class="
  text-(length:--TH-FontSizeSm)
  text-(--SmartThemeQuoteColor)
">共 0 条消息</div></div>
        <div
          id="prompt-view-status-fresh"
          :class="[
            `
              fa-solid fa-rotate-right cursor-pointer
              text-(length:--TH-FontSize)
              duration-200
            `,
            { 'animate-spin': isRefreshing }
          ]"
          title="刷新"
          @click="handleRefresh"
        ></div>
      </div>
      <div class="my-0.75 flex flex-col bg-(--grey5020a) px-0.5 py-1">
        <div class="flex items-center justify-between gap-0.5">
          <div
id="prompt-filter-icon" class="
  flex h-(--TH-FontSizeL) w-(--TH-FontSizeL) cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)
" title="筛选消息类型">
            <i class="fa-solid fa-filter"></i>
          </div>
          <div class="relative mr-1 flex-grow">
            <input
id="prompt-search" type="text" class="
  h-(--TH-FontSizeL) w-full rounded-sm border border-(--SmartThemeBorderColor) bg-transparent py-0.5 pr-8 pl-1
  text-(length:--TH-FontSize)
  text-(--mainTextColor)
" placeholder="搜索消息内容..." />
            <div
class="
  pointer-events-auto absolute top-[25%] right-1 flex items-center rounded-sm
  text-(length:--TH-FontSizeSm)
  whitespace-nowrap text-(--SmartThemeBodyColor)
">
              <input
id="prompt-search-compact-mode" type="checkbox"
                class="mr-0.25 mb-0 h-(--TH-FontSizeSm) w-(--TH-FontSizeSm)" />
              <label for="prompt-search-compact-mode">仅显示匹配</label>
            </div>
          </div>
        </div>
        <div id="prompt-filter-options" class="flex flex-wrap gap-1 pt-1 pr-1 pb-0 pl-0.5" style="display: none">
          <div class="flex items-center gap-0.5">
            <input id="filter-system" type="checkbox" data-role="system" checked />
            <label for="filter-system">system</label>
          </div>
          <div class="flex items-center gap-0.5">
            <input id="filter-user" type="checkbox" data-role="user" checked />
            <label for="filter-user">user</label>
          </div>
          <div class="flex items-center gap-0.5">
            <input id="filter-assistant" type="checkbox" data-role="assistant" checked />
            <label for="filter-assistant">assistant</label>
          </div>
        </div>
      </div>
    </div>
    <div class="relative hidden flex-1">
      <div class="h-full overflow-x-hidden overflow-y-auto">
        <div class="absolute inset-0 z-10 hidden text-center">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isRefreshing = ref<boolean>(false);

/**
 * 处理刷新按钮点击事件
 */
function handleRefresh(): void {
  if (isRefreshing.value) {
    return;
  }
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
  }, 2000);
  // TODO: 在这里添加实际的刷新逻辑
}
</script>
