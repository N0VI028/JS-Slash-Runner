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

  <!-- TODO: 完成显示, 取消 v-if="false" -->
  <div v-if="false" class="mb-1 flex flex-wrap gap-1 rounded-sm bg-(--SmartThemeQuoteColor) p-1">
    <DefineFilter v-slot="{ type, checked, name }">
      <div class="TH-filter-option">
        <input :id="`filter-${type}`" type="checkbox" class="TH-filter-checkbox" :data-type="type" :checked="checked" />
        <label :for="`filter-${type}`">{{ name }}</label>
      </div>
    </DefineFilter>
    <Filter type="string" :checked="true" :name="t`字符串`" />
    <Filter type="object" :checked="true" :name="t`对象`" />
    <Filter type="array" :checked="true" :name="t`数组`" />
    <Filter type="number" :checked="true" :name="t`数字`" />
    <Filter type="boolean" :checked="true" :name="t`布尔值`" />
  </div>
</template>

<script setup lang="ts">
const search_input = defineModel<string>('search_input', { required: true });

const [DefineFilter, Filter] = createReusableTemplate<{
  type: string;
  checked?: boolean;
  name?: string;
}>();
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-filter-option {
  @apply flex items-center gap-0.5;
}

.TH-filter-checkbox {
  @apply m-0;
}
</style>
