<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: close => submit(close) }, { name: t`取消` }]">
    <DefineMaximizeButton v-slot="{ activate }">
      <i class="fa-solid fa-maximize interactable cursor-pointer" @click="activate"></i>
    </DefineMaximizeButton>
    <div class="flex h-full flex-col flex-wrap items-center gap-0.25 overflow-y-auto text-left">
      <div class="my-0.5 th-text-md font-bold">{{ props.script !== undefined ? t`编辑脚本` : t`创建新脚本` }}</div>
      <div class="TH-script-editor-container">
        <strong>{{ t`脚本名称` }}</strong>
        <input v-model="script.name" type="text" class="text_pole" />
      </div>
      <div class="TH-script-editor-container">
        <div class="flex min-h-[21.6px] w-full items-center gap-[5px]">
          <strong>{{ t`脚本内容` }}</strong>
          <MaximizeButton @click="() => openMaximize('content')"></MaximizeButton>
        </div>
        <!-- 收起时：只读预览 + 展开按钮 -->
        <div
          v-if="!isContentExpanded && isContentTruncated"
          class="text_pole relative w-full overflow-hidden font-(family-name:--monoFontFamily)!"
          style="height: 67.6px"
        >
          <pre class="m-0 p-0 leading-normal break-words whitespace-pre-wrap" style="font-family: inherit">{{
            truncatedPreview
          }}</pre>
          <!-- prettier-ignore-attribute -->
          <div
            class="
              pointer-events-none absolute right-0 bottom-0 left-0 flex h-[40px] items-center justify-center
              bg-gradient-to-t from-(--black70a) to-transparent
            "
          >
            <button class="menu_button interactable pointer-events-auto text-xs!" @click="toggleContent">
              <i class="fa-solid fa-angles-down"></i>
              <span class="ml-0.25">{{ t`展开编辑` }}</span>
            </button>
          </div>
        </div>
        <!-- 展开或内容未超阈值：可编辑 textarea -->
        <textarea
          v-else
          v-model="script.content"
          :placeholder="t`脚本的 JavaScript 代码`"
          rows="3"
          class="text_pole font-(family-name:--monoFontFamily)!"
        />
      </div>
      <div class="TH-script-editor-container">
        <div class="flex items-center gap-[5px]">
          <strong>{{ t`作者备注` }}</strong>
          <MaximizeButton @click="() => openMaximize('info')"></MaximizeButton>
        </div>
        <textarea
          v-model="script.info"
          :placeholder="t`脚本备注, 例如作者名、版本和注意事项等, 支持简单的 markdown 和 html`"
          rows="3"
          class="text_pole font-(family-name:--monoFontFamily)!"
        />
      </div>
      <div v-if="props.target !== 'global'" class="TH-script-editor-container">
        <strong>{{ t`导出选项` }}</strong>
        <small>{{ t`控制此脚本随角色卡/预设导出时是否包含以下内容` }}</small>
        <div class="mt-0.5 flex w-full flex-wrap items-center gap-2">
          <label class="flex cursor-pointer items-center gap-0.25">
            <input v-model="script.export_with.data" type="checkbox" />
            <span>{{ t`变量` }}</span>
          </label>
          <label class="flex cursor-pointer items-center gap-0.25">
            <input v-model="script.export_with.button" type="checkbox" />
            <span>{{ t`按钮` }}</span>
          </label>
        </div>
      </div>
      <div class="TH-script-editor-container">
        <div class="flex flex-wrap items-center justify-center gap-[5px]">
          <strong>{{ t`变量列表` }}</strong>
          <MaximizeButton @click="() => openMaximize('data')"></MaximizeButton>
        </div>
        <small>{{ t`绑定到脚本的变量, 会随脚本一同导出` }}</small>
        <div
          :class="[
            `
              my-[5px] h-[150px] w-full overflow-hidden rounded-[5px] border border-(--SmartThemeBorderColor)
              bg-(--black30a)
            `,
            { 'pointer-events-none': hideInlineDataEditor },
          ]"
          :aria-hidden="hideInlineDataEditor"
        >
          <JsonEditor v-model="script.data" />
        </div>
      </div>
      <div class="TH-script-editor-container">
        <div class="flex w-full items-center justify-between">
          <div class="flex flex-col">
            <div class="flex flex-wrap items-center gap-[5px]">
              <strong>{{ t`按钮` }}</strong>
              <div class="menu_button interactable" @click="addButton">
                <i class="fa-solid fa-plus"></i>
              </div>
            </div>
            <small>{{ t`需配合代码里的 getButtonEvent 使用` }}</small>
          </div>
          <Toggle id="TH-script-editor-button-enabled-toggle" v-model="script.button.enabled" class="mr-[5px]" />
        </div>
        <div class="button-list">
          <VueDraggable
            v-model="script.button.buttons"
            handle=".TH-handle"
            class="flex flex-col"
            :animation="150"
            direction="vertical"
            :force-fallback="true"
            item-key="id"
          >
            <div
              v-for="(button, index) in script.button.buttons"
              :key="`button-${index}`"
              class="flex items-center justify-between gap-0.25"
            >
              <span class="TH-handle cursor-grab select-none">☰</span>
              <input v-model="button.visible" type="checkbox" />
              <input v-model="button.name" class="text_pole" type="text" :placeholder="t`按钮名称`" />
              <div class="menu_button interactable" :data-index="index" @click="deleteButton(index)">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>
          </VueDraggable>
        </div>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import MaximizeEditor from '@/panel/script/MaximizeEditor.vue';
import { ScriptForm } from '@/panel/script/type';
import { createReusableTemplate } from '@vueuse/core';
import { VueDraggable } from 'vue-draggable-plus';

const [DefineMaximizeButton, MaximizeButton] = createReusableTemplate();

const props = defineProps<{
  script?: ScriptForm;
  target: 'global' | 'character' | 'preset';
}>();

const emit = defineEmits<{
  submit: [script: ScriptForm];
}>();

const script = ref<ScriptForm>(
  klona(
    props.script ?? {
      name: '',
      content: '',
      info: '',
      button: {
        enabled: true,
        buttons: [],
      },
      data: {},
      export_with: {
        data: true,
        button: true,
      },
    },
  ),
);

// 脚本内容编辑状态管理
const CHAR_THRESHOLD = 300; // 字符数阈值
const isContentExpanded = ref(false);

/**
 * 判断内容是否需要截断（基于字符数）
 */
const isContentTruncated = computed(() => {
  return script.value.content.length > CHAR_THRESHOLD;
});

/**
 * 收起时显示的截断预览内容
 */
const truncatedPreview = computed(() => {
  return script.value.content.slice(0, CHAR_THRESHOLD) + '\n...';
});

/**
 * 切换展开/收起状态
 */
function toggleContent() {
  isContentExpanded.value = !isContentExpanded.value;
}

const submit = (close: () => void) => {
  const result = ScriptForm.safeParse(script.value);
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

// 外部“放大编辑器”弹窗：按需创建并在确认时回写，避免单文件多 Popup 冲突
type MaximizeTarget = 'content' | 'info' | 'data';
const hideInlineDataEditor = ref(false);

function openMaximize(target: MaximizeTarget) {
  console.log('openMaximize', target);
  if (target === 'data') hideInlineDataEditor.value = true;

  const modal = useModal({
    component: MaximizeEditor,
    attrs: {
      target,
      initialText: target === 'content' ? script.value.content : target === 'info' ? script.value.info : undefined,
      initialData: target === 'data' ? script.value.data : undefined,
      onConfirm: (payload: { target: MaximizeTarget; text?: string; data?: Record<string, any> }) => {
        if (payload.target === 'content' && typeof payload.text === 'string') {
          script.value.content = payload.text;
        } else if (payload.target === 'info' && typeof payload.text === 'string') {
          script.value.info = payload.text;
        } else if (payload.target === 'data' && payload.data) {
          // 一次性替换，减少深度 diff 带来的渲染/计算成本
          script.value.data = klona(payload.data);
        }
        if (target === 'data') hideInlineDataEditor.value = false;
      },
      onClosed: () => {
        if (target === 'data') hideInlineDataEditor.value = false;
      },
    },
  });
  modal.open();
}

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

.button-list {
  @apply mt-0.5;
}

.button-list input.text_pole {
  @apply m-0;
}
</style>
