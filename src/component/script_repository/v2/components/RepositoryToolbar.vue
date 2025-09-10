<template>
  <div class="width100p">
    <div class="flex-container">
      <div id="create-script" class="menu_button menu_button_icon interactable" @click="$emit('create-script')">
        <i class="fa-solid fa-scroll"></i>
        <small>+ 脚本</small>
      </div>
      <div id="create-folder" class="menu_button menu_button_icon interactable" @click="$emit('create-folder')">
        <i class="fa-solid fa-folder-plus"></i>
        <small>+ 文件夹</small>
      </div>
      <div id="import-script" class="menu_button menu_button_icon interactable" @click="$emit('import')">
        <i class="fa-solid fa-file-import"></i>
        <small>导入</small>
      </div>
      <div id="default-script" class="menu_button menu_button_icon interactable" @click="$emit('open-builtin')">
        <i class="fa-solid fa-archive"></i>
        <small>内置库</small>
      </div>
    </div>

    <div class="script-search-container width100p flex-container alignItemsCenter">
      <SearchBar
        :model-value="search"
        placeholder="搜索（支持普通和正则）"
        :debounce-ms="300"
        clearable
        @update:modelValue="value => emit('update-search', value)"
        @clear="() => emit('update-search', '')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchBar from '../../../common/SearchBar.vue';
defineProps<{ search: string }>();
const emit = defineEmits<{
  (e: 'create-script'): void;
  (e: 'create-folder'): void;
  (e: 'import'): void;
  (e: 'open-builtin'): void;
  (e: 'update-search', value: string): void;
}>();
</script>
