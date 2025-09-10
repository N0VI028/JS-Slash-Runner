<template>
  <div class="folder-create-dialog">
    <h3>创建新文件夹</h3>
    <div class="flex-container flexFlowColumn width100p padding10 justifyLeft">
      <div>
        <h4 for="folder-name-input" class="form-span">文件夹名称:</h4>
        <input type="text" class="text_pole width100p" id="folder-name-input" placeholder="请输入文件夹名称" />
      </div>

      <div>
        <h4 class="form-span">文件夹图标:</h4>
        <div class="flex width100p" style="gap: 20px; margin: 5px 0">
          <div class="flex alignItemsCenter">
            <span>选择颜色</span>
            <toolcool-color-picker id="folder-color-picker" color="#4a90e2"></toolcool-color-picker>
          </div>
          <div class="flex-container alignItemsCenter">
            <span>选择图标</span>
            <i id="folder-icon-preview" class="fa fa-folder" title="点击选择图标"></i>
            <input type="hidden" id="folder-icon-value" value="fa-folder" />
          </div>
        </div>
      </div>
      <div>
        <h4 class="form-span">目标位置:</h4>
        <div class="flex-container marginTopBot5">
          <div>
            <span for="folder-target-global">
              <input type="radio" name="folder-target" id="folder-target-global" value="global" checked />
              <span>全局脚本库</span>
            </span>
          </div>
          <div>
            <span for="folder-target-character">
              <input type="radio" name="folder-target" id="folder-target-character" value="character" />
              <span>角色脚本库</span>
            </span>
          </div>
          <div>
            <span for="folder-target-preset">
              <input type="radio" name="folder-target" id="folder-target-preset" value="preset" />
              <span>预设脚本库</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  ready: [element: HTMLElement];
}>();

/**
 * 在组件挂载后，触发ready事件，让父组件可以绑定jQuery事件
 */
onMounted(() => {
  const $element = $('.folder-create-dialog');
  if ($element.length > 0) {
    emit('ready', $element[0]);
  }
});

onUnmounted(() => {});
</script>

<style scoped>
#folder-icon-preview {
  cursor: pointer;
  padding: 4px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 4px;
  margin-right: 10px;
}
</style>
