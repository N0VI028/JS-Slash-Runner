<template>
  <div class="my-0.75 rounded-sm bg-(--SmartThemeQuoteColor) p-0.75 text-(length:--TH-FontSize-sm)">
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
      <div id="floor-filter-error" class="py-0.25 text-(length:--TH-FontSize-sm) text-(--warning)">
        最大楼层不能小于最小楼层
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.TH-floor-input {
  @apply w-full h-2 rounded-sm bg-(--SmartThemeQuoteColor) px-1 py-0.5 text-(--SmartThemeTextColor);
}
</style>
