<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: submit }, { name: t`取消` }]" width="fit">
    <div class="flex min-w-[320px] flex-col gap-1 p-1.5 text-left">
      <div>'{{ props.scriptName }}' {{ t`脚本导出将包含以下内容, 请确认是否保留:` }}</div>
      <div class="flex flex-row flex-wrap gap-4">
        <label v-if="props.hasData" class="flex cursor-pointer items-center gap-0.5">
          <input v-model="option.include_data" type="checkbox" />
          <span>{{ t`变量` }}</span>
        </label>
        <label v-if="props.hasButton" class="flex cursor-pointer items-center gap-0.5">
          <input v-model="option.include_button" type="checkbox" />
          <span>{{ t`按钮` }}</span>
        </label>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import { ScriptExportOptions } from '@/panel/script/type';

const props = defineProps<{
  scriptName: string;
  hasData: boolean;
  hasButton: boolean;
  includeData: boolean;
  includeButton: boolean;
}>();

const emit = defineEmits<{
  submit: [option: ScriptExportOptions];
}>();

const option = ref<ScriptExportOptions>({
  include_data: props.includeData,
  include_button: props.includeButton,
});

const submit = (close: () => void) => {
  emit('submit', ScriptExportOptions.decode(option.value));
  close();
};
</script>
