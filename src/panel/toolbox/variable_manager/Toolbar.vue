<template>
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
    <SearchBar v-model="model.search_input" :placeholder="t`搜索变量...`" :clearable="true" class="w-full flex-1" />
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
</template>

<script setup lang="ts">
const model = defineModel<{ search_input: string }>({ required: true });
</script>
