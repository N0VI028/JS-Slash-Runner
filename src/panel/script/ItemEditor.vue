<template>
  <Popup v-model="visible" @confirm="submit">
    <div class="flex h-full flex-col flex-wrap items-center gap-0.25 overflow-y-auto">
      <div class="my-0.5 text-md font-bold">脚本编辑</div>
      <div id="script-name" class="TH-script-editor-container">
        <div>脚本名称</div>
        <input v-model="script.name" type="text" class="text_pole" />
      </div>
      <div id="script-content" class="TH-script-editor-container">
        <div>脚本内容</div>
        <textarea
          v-model="script.content"
          placeholder="脚本的JavaScript代码"
          rows="6"
          class="text_pole font-[family-name:var(--monoFontFamily)]!"
        />
      </div>
      <div id="script-info" class="TH-script-editor-container">
        <div>作者备注</div>
        <textarea
          id="script-info-textarea"
          v-model="script.info"
          placeholder="此处填写作者想要在脚本信息中展示的内容，例如作者名、版本和注意事项等，支持简单的markdown和html"
          rows="3"
          class="text_pole font-[family-name:var(--monoFontFamily)]!"
        />
      </div>
      <div id="variable-editor" class="TH-script-editor-container">
        <div class="flex flex-wrap items-center justify-center gap-[5px]">
          <div>变量列表</div>
          <div class="menu_button interactable" @click="addVariable">
            <i class="fa-solid fa-plus"></i>
          </div>
        </div>
        <small>绑定到脚本的变量，会随脚本一同导出</small>
        <div id="variable-list" class="flex w-full flex-col flex-wrap gap-1"></div>
      </div>
      <div id="script-button-content" class="TH-script-editor-container">
        <div class="flex w-full items-center justify-between">
          <div class="flex flex-col">
            <div class="flex flex-wrap items-center gap-[5px]">
              <div>按钮触发</div>
              <div id="add-button-trigger" class="menu_button interactable" @click="addButton">
                <i class="fa-solid fa-plus"></i>
              </div>
            </div>
            <small>需配合getButtonEvent使用</small>
          </div>
          <Toggle id="button-trigger-toggle" v-model="script.button.enabled" />
        </div>
        <div class="button-list">
          <div
            v-for="(button, index) in script.button.buttons"
            :key="`button-${index}`"
            class="flex items-center justify-between gap-1"
          >
            <!-- TODO: 拖拽功能 -->
            <span class="">☰</span>
            <input v-model="button.visible" type="checkbox" />
            <input v-model="button.name" class="text_pole" type="text" placeholder="按钮名称" />
            <div class="menu_button interactable" :data-index="index" @click="deleteButton(index)">
              <i class="fa-solid fa-trash"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Popup>
</template>
<script setup lang="ts">
import { ScriptForm } from '@/panel/script/type';

const visible = defineModel<boolean>({ required: true });

const props = withDefaults(defineProps<{ script?: ScriptForm }>(), {
  script: (): ScriptForm => ({
    name: '',
    content: '',
    info: '',
    button: {
      enabled: true,
      buttons: [],
    },
    data: {},
  }),
});

const emit = defineEmits<{
  submit: [script: ScriptForm];
}>();

// TODO: 由于 ItemEditor 本身不会 v-if 卸载, 如果不通过编辑器修改了数据 (如 `replaceScriptButtons`), script 依旧记录的是之前 _.cloneDeep 缓存的数据
// 应该怎样 v-if 和 v-model 一起用? 还是说只能到处传递 v-if 和 v-model
const script = ref<ScriptForm>(_.cloneDeep(props.script));

const submit = () => {
  const result = ScriptForm.safeParse(script.value);
  if (!result.success) {
    _(result.error.issues)
      .groupBy('path')
      .entries()
      .forEach(([path, issues]) => {
        toastr.error(issues.map(issue => issue.message).join('\n'), path);
      });
    return false;
  }
  emit('submit', result.data);
  return true;
};

const addVariable = () => {
  // TODO: 直接使用变量编辑器？
};

const addButton = () => {
  script.value.button.buttons.push({
    name: '',
    visible: true,
  });
};

const deleteButton = (index: number) => {
  script.value.button.buttons.splice(index, 1);
};
</script>

<style scoped>
@reference 'tailwindcss';

.TH-script-editor-container {
  @apply flex flex-col items-start mb-1 w-full;
}
</style>
