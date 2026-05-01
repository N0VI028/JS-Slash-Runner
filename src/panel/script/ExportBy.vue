<template>
  <Popup :buttons="[{ name: t`关闭` }]">
    <div class="flex w-full max-w-[92vw] flex-col gap-1 p-1.5 text-left">
      <div>{{ t`本次${targetName}导出中，以下绑定脚本会连同这些内容一起导出：` }}</div>
      <div class="max-h-[45vh] overflow-x-hidden overflow-y-auto pr-1">
        <div v-for="item in items" :key="item.script_name" class="mb-1 border border-(--SmartThemeBorderColor) p-1">
          <div class="mb-0.5 font-bold break-all">{{ item.script_name }}</div>
          <div class="flex flex-row flex-wrap gap-4">
            <span v-if="item.has_data" class="flex items-center gap-0.5 opacity-90">
              <span
                :class="item.exported_data ? 'fa-solid fa-check text-green-500' : 'fa-solid fa-xmark text-red-500'"
              ></span>
              <span class="leading-none">{{ t`变量` }}</span>
            </span>
            <span v-if="item.has_button" class="flex items-center gap-0.5 opacity-90">
              <span
                :class="item.exported_button ? 'fa-solid fa-check text-green-500' : 'fa-solid fa-xmark text-red-500'"
              ></span>
              <span class="leading-none">{{ t`按钮` }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="th-text-sm opacity-80">{{ t`如需调整这些内容的导出行为, 可在对应脚本编辑器的“导出选项”中修改` }}</div>
    </div>
  </Popup>
</template>
<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import type { ScriptExportSummaryItem } from '@/panel/script/export_by';

defineProps<{
  targetName: string;
  items: ScriptExportSummaryItem[];
}>();
</script>
