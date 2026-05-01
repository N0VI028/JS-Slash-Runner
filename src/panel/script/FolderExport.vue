<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: submit }, { name: t`取消` }]" width="normal">
    <div class="flex w-full max-w-[92vw] flex-col gap-1 p-1.5 text-left">
      <div>'{{ props.folderName }}' {{ t`文件夹导出的脚本将包含以下内容, 请确认是否保留:` }}</div>
      <div class="max-h-[45vh] overflow-x-hidden overflow-y-auto pr-1">
        <div v-for="script in props.scripts" :key="script.id" class="mb-1 border border-(--SmartThemeBorderColor) p-1">
          <div class="mb-0.5 font-bold break-all">{{ script.name }}</div>
          <div class="flex flex-row flex-wrap gap-4">
            <label v-if="script.has_data" class="flex cursor-pointer items-center gap-0.5">
              <input v-model="option.scripts[script.id]" type="checkbox" />
              <span>{{ t`变量` }}</span>
            </label>
            <label v-if="script.has_button" class="flex cursor-pointer items-center gap-0.5">
              <input v-model="option.scripts[script.id]" type="checkbox" />
              <span>{{ t`按钮` }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import { ScriptFolderExportOptions } from '@/panel/script/type';

// TODO: 移动到 type.ts
type FolderExportScript = {
  id: string;
  name: string;
  has_data: boolean;
  has_button: boolean;
  include_data: boolean;
  include_button: boolean;
};

const props = defineProps<{
  folderName: string;
  scripts: FolderExportScript[];
}>();

const emit = defineEmits<{
  submit: [option: ScriptFolderExportOptions];
}>();

const option = ref<ScriptFolderExportOptions>({
  scripts: _.fromPairs(
    props.scripts.map(script => [
      script.id,
      { include_data: script.include_data, include_button: script.include_button },
    ]),
  ),
});

const submit = (close: () => void) => {
  emit('submit', ScriptFolderExportOptions.decode(option.value));
  close();
};
</script>
