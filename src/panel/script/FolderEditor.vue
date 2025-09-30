<template>
  <!--prettier-ignore-attribute-->
  <Popup :buttons="[{ name: '创建', shouldEmphasize: true, onClick: submit }, { name: '取消' }]">
    <div class="my-0.5 text-md font-bold">创建新文件夹</div>
    <div class="flex w-full flex-col justify-center gap-0.5 p-1">
      <div class="flex flex-col items-start">
        <div class="font-bold">文件夹名称:</div>
        <input v-model="script_folder.name" type="text" class="text_pole w-full" placeholder="请输入文件夹名称" />
      </div>

      <div class="flex flex-col items-start">
        <div class="font-bold">文件夹图标:</div>
        <div class="my-0.5 flex w-full gap-2">
          <div class="flex flex-wrap items-center">
            <span>选择颜色</span>
            <toolcool-color-picker
              ref="colorPickerRef"
              :color="script_folder.color || 'var(--SmartThemeQuoteColor)'"
              @change="onColorChange"
              @input="onColorChange"
            >
            </toolcool-color-picker>
          </div>
          <div class="flex flex-wrap items-center">
            <span>选择图标</span>
            <i
              class="fa-solid fa-folder ml-[5px] rounded-sm border border-(--SmartThemeBorderColor) p-[5px]"
              title="点击选择图标"
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

const props = withDefaults(defineProps<{ scriptFolder?: ScriptFolderForm }>(), {
  scriptFolder: (): ScriptFolderForm => ({
    name: '',
    icon: '',
    color: '',
  }),
});

const emit = defineEmits<{
  submit: [script: ScriptFolderForm];
}>();

const script_folder = ref<ScriptFolderForm>(_.cloneDeep(props.scriptFolder));
const colorPickerRef = useTemplateRef<HTMLElement>('colorPickerRef');

const onColorChange = (evt: any) => {
  if (evt.detail?.rgba) {
    script_folder.value.color = evt.detail.rgba;
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
