<template>
  <div class="mt-1">
    <!-- prettier-ignore-attribute -->
    <div
      class="
        my-0.5 flex cursor-pointer items-center justify-center gap-0.5 rounded-sm border
        border-(--SmartThemeBorderColor) px-1 py-0.5 th-text-sm text-(--SmartThemeQuoteColor)
      "
      @click="expanded = !expanded"
    >
      <template v-if="expanded">{{ t`收起图片` }}<i class="fa-solid fa-chevron-up"></i></template>
      <template v-else>{{ t`显示图片` }}({{ props.images.length }})<i class="fa-solid fa-chevron-down"></i></template>
    </div>
    <div v-if="expanded" class="flex flex-col gap-1">
      <div v-for="(img, idx) in props.images" :key="idx" class="flex flex-col gap-0.25">
        <img
          :src="img.url"
          alt="image"
          class="max-h-60 max-w-full rounded-sm border border-(--SmartThemeBorderColor)"
        />
        <div class="th-text-xs text-(--SmartThemeQuoteColor)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  images: { url: string }[];
}>();

const expanded = ref<boolean>(false);
</script>
