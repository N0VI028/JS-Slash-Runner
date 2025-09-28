<template>
  <div class="flex gap-0.25">
    <Button type="tavern" @click="openCreator('script')">
      <i class="fa-solid fa-scroll" />
      <small>{{ t`+ 脚本` }}</small>
    </Button>
    <Button type="tavern" @click="openCreator('folder')">
      <i class="fa-solid fa-folder-plus" />
      <small>{{ t`+ 文件夹` }}</small>
    </Button>
    <Button type="tavern" @click="make_TODO('导入脚本库脚本')">
      <i class="fa-solid fa-file-import" />
      <small>{{ t`导入` }}</small>
    </Button>
    <Button type="tavern" @click="make_TODO('查看脚本库内置库')">
      <i class="fa-solid fa-archive" />
      <small>{{ t`内置库` }}</small>
    </Button>
  </div>

  <Creator v-model="show_creator" :type="creation_type" />
</template>

<script setup lang="ts">
import Creator from '@/panel/script/Creator.vue';
import { make_TODO } from '@/todo';
import { ref } from 'vue';

type CreationType = 'script' | 'folder';

const show_creator = ref(false);
const creation_type = ref<CreationType>();
function openCreator(type: CreationType) {
  creation_type.value = type;
  show_creator.value = true;
}
</script>
