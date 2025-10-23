<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: submit }, { name: t`取消` }]">
    <div class="my-0.5 th-text-md font-bold">
      {{ props.scriptFolder !== undefined ? t`编辑文件夹` : t`创建新文件夹` }}
    </div>
    <div class="flex w-full flex-col justify-center gap-0.5 p-1">
      <div class="flex flex-col items-start">
        <div class="font-bold">{{ t`文件夹名称:` }}</div>
        <input v-model="script_folder.name" type="text" class="text_pole w-full" :placeholder="t`请输入文件夹名称`" />
      </div>

      <div class="flex flex-col items-start">
        <div class="font-bold">{{ t`文件夹图标:` }}</div>
        <div class="my-0.5 flex w-full gap-2">
          <div class="flex flex-wrap items-center">
            <span>{{ t`选择颜色` }}</span>
            <pick-colors v-model:value="script_folder.color" :z-index="10000" />
          </div>
          <div class="flex flex-wrap items-center">
            <span>{{ t`选择图标` }}</span>
            <i
              class="fa-solid ml-[5px] cursor-pointer rounded-sm border border-(--SmartThemeBorderColor) p-[5px]"
              :class="script_folder.icon ? script_folder.icon : 'fa-folder'"
              @click="selectIcon"
            ></i>
            <input v-model="script_folder.icon" type="hidden" value="fa-folder" />
          </div>
        </div>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import { ScriptFolderForm } from '@/panel/script/type';
import { getSmartThemeQuoteColor } from '@/util/color';
import { showFontAwesomePicker } from '@sillytavern/scripts/utils';
import PickColors from 'vue-pick-colors';

const props = defineProps<{ scriptFolder?: ScriptFolderForm }>();

const emit = defineEmits<{
  submit: [script: ScriptFolderForm];
}>();

const script_folder = ref<ScriptFolderForm>(
  klona(
    props.scriptFolder ?? {
      name: '',
      icon: '',
      color: getSmartThemeQuoteColor(),
    },
  ),
);

const selectIcon = async () => {
  const selected_icon = await showFontAwesomePicker();
  if (selected_icon) {
    script_folder.value.icon = selected_icon;
  }
};

const submit = (close: () => void) => {
  const result = ScriptFolderForm.safeParse(script_folder.value);
  if (!result.success) {
    _(result.error.issues)
      .groupBy('path')
      .entries()
      .forEach(([path, issues]) => {
        toastr.error(issues.map(issue => issue.message).join('\n'), path);
      });
    return;
  }
  emit('submit', result.data);
  close();
};
</script>
