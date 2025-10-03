<template>
  <!--prettier-ignore-->
  <Popup :buttons="[{ name: '确认', shouldEmphasize: true, onClick: submit }, { name: '取消' }]">
    <div class="my-0.5 text-md font-bold">{{ isEdit ? '编辑文件夹' : '创建新文件夹' }}</div>
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
              ref="color_picker_ref"
              :color.attr="color_attribute"
              @change="onColorChange"
            >
            </toolcool-color-picker>
          </div>
          <div class="flex flex-wrap items-center">
            <span>选择图标</span>
            <i
              class="fa-solid ml-[5px] cursor-pointer rounded-sm border border-(--SmartThemeBorderColor) p-[5px]"
              :class="display_icon"
              title="点击选择图标"
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
import { showFontAwesomePicker } from '@sillytavern/scripts/utils';

const props = withDefaults(defineProps<{ scriptFolder?: ScriptFolderForm; isEdit?: boolean }>(), {
  scriptFolder: (): ScriptFolderForm => ({
    name: '',
    icon: '',
    color: '',
  }),
  isEdit: false,
});

const emit = defineEmits<{
  submit: [script: ScriptFolderForm];
}>();

const script_folder = ref<ScriptFolderForm>(_.cloneDeep(props.scriptFolder));

const color_picker_ref = useTemplateRef<HTMLElement>('color_picker_ref');
const DEFAULT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeQuoteColor').trim();
const color_attribute = computed(() => script_folder.value.color || DEFAULT_COLOR);

const display_icon = computed(() => script_folder.value.icon || 'fa-folder');

const onColorChange = (evt: any) => {
  if (evt.detail?.rgba) {
    script_folder.value.color = evt.detail.rgba;
  }
};

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
