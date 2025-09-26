<template>
  <div class="flex gap-0.25">
    <Button type="tavern" @click="handleCreateScript">
      <i class="fa-solid fa-scroll" />
      <small>{{ t`+ 脚本` }}</small>
    </Button>
    <Button type="tavern" @click="make_TODO('创建脚本库脚本文件夹')">
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
  <!-- 添加脚本的目标 -->
  <Popup v-model="showTargetSelector" :on-confirm="openEditor">
    <TargetSelector
      v-model="selectedTarget"
      title="选择脚本目标"
      global-label="全局脚本库"
      character-label="角色脚本库"
      preset-label="预设脚本库"
    />
  </Popup>
  <!-- 显示脚本编辑器 -->
  <Popup v-model="showEditor" :on-confirm="handleEditorConfirm">
    <Editor ref="editorRef" :target-selection="selectedTarget" />
  </Popup>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import Editor from '@/panel/script/Editor.vue';
import TargetSelector, { type TargetSelection } from '@/panel/script/TargetSelector.vue';
import { make_TODO } from '@/todo';
import { ref } from 'vue';

const showTargetSelector = ref(false);
const showEditor = ref(false);
const selectedTarget = ref<TargetSelection>('global');
const editorRef = ref<InstanceType<typeof Editor>>();

const handleCreateScript = () => {
  showTargetSelector.value = true;
};

const openEditor = () => {
  showTargetSelector.value = false;
  showEditor.value = true;
};

const handleEditorConfirm = () => {
  if (!editorRef.value) return false;

  if (!editorRef.value.validateScript()) {
    return false;
  }

  // TODO: 保存脚本
};
</script>
