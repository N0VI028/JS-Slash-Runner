<template>
  <div class="flex flex-col">
    <Item type="box">
      <Item type="plain">
        <template #title>{{ t`启用渲染器` }}</template>
        <template #description>{{ t`启用后，符合条件的代码块将被渲染` }}</template>
        <template #content>
          <Toggle id="TH-render-enabled" v-model="enabled" />
        </template>
      </Item>
    </Item>
    <Item type="box" class="mt-0.75">
      <template #legend><i class="fa-solid fa-bolt th-text-xs!" />{{ t`渲染优化` }}</template>
      <div class="flex flex-col gap-0.5">
        <Item type="plain">
          <template #title>{{ t`渲染深度` }}</template>
          <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为 0 时，将渲染所有楼层` }}</template>
          <template #content>
            <input v-model="depth" class="text_pole w-3.5!" type="number" :min="0" />
          </template>
        </Item>
        <Divider />
        <Item type="plain">
          <template #title>{{ t`忽略隐藏楼层` }}</template>
          <template #description>{{
            t`不渲染已经被设置为AI不可见的楼层，且不计入渲染深度设定的楼层数`
          }}</template>
          <template #content>
            <Toggle id="TH-render-depth-ignore-hidden" v-model="depth_ignore_hidden" />
          </template>
        </Item>
        <Divider />
        <Item type="plain">
          <template #title>{{ t`启用代码折叠` }}</template>
          <template #description>
            {{ t`折叠指定类型的代码块，当选择“仅前端”时，将只折叠可渲染成前端界面但没被渲染的代码块` }}
          </template>
          <template #content>
            <RadioButtonGroup v-model="collapse_code_block" :options="collapse_code_block_options" />
          </template>
        </Item>
        <Divider />
        <Item type="plain">
          <template #title>{{ t`启用 Blob URL 渲染` }}</template>
          <template #description>
            {{ t`使用 Blob URL 渲染前端界面，更方便 f12 开发者工具调试；但某些浏览器可能不支持` }}
          </template>
          <template #content>
            <Toggle id="TH-render-use-blob-url" v-model="use_blob_url" />
          </template>
        </Item>
        <Divider />
        <Item type="plain">
          <template #title>{{ t`取消前端代码高亮` }}</template>
          <template #description>
            {{ t`避免酒馆对可渲染成前端界面的代码块进行语法高亮，从而提升渲染性能` }}
          </template>
          <template #content>
            <Toggle id="TH-render-optimize-hljs" v-model="optimize_hljs" />
          </template>
        </Item>
      </div>
    </Item>
    <!-- 实验功能 -->
    <Item type="box" class="mt-0.75">
      <template #legend><i class="fa-solid fa-flask th-text-xs!" />{{ t`实验功能` }}</template>
      <div class="flex flex-col gap-0.5">
        <Item type="plain">
          <template #title>{{ t`启用兜底清理` }}</template>
          <template #description>
            {{ t`对脚本附加的界面如悬浮球等进行兜底清理, 避免脚本关闭后界面残留；但遇到这种情况更建议提醒脚本作者修复` }}
          </template>
          <template #content>
            <Toggle id="TH-render-use-cleanup-protector" v-model="use_cleanup_protector" />
          </template>
        </Item>
        <Divider />
        <Item type="plain">
          <template #title>{{ t`允许流式渲染` }}</template>
          <template #description>
            {{ t`在AI流式输出时就渲染，某些前端界面可能无法这样渲染。此外，这可能与某些脚本、插件、酒馆美化不兼容` }}
          </template>
          <template #content>
            <Toggle
              id="TH-render-allow-streaming"
              :key="streaming_toggle_key"
              :model-value="allow_streaming"
              @update:model-value="handleStreamingChange"
            />
          </template>
        </Item>
      </div>
    </Item>
  </div>

  <template v-for="{ message_id, reload_memo, elements } in runtimes" :key="message_id + reload_memo">
    <Teleport v-for="(element, index) in elements" :key="index" defer :to="element">
      <Iframe :id="`${message_id}--${index}`" :element="element" :use-blob-url="use_blob_url" />
    </Teleport>
  </template>

  <Streaming v-if="enable_allow_streaming" :enable-allow-streaming="enable_allow_streaming" />
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import Iframe from '@/panel/render/Iframe.vue';
import Streaming from '@/panel/render/Streaming.vue';
import { useMacroLike } from '@/panel/render/macro_like';
import { useOptimizeHljs } from '@/panel/render/optimize_hljs';
import { useCollapseCodeBlock } from '@/panel/render/use_collapse_code_block';
import { useMessageIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useGlobalSettingsStore } from '@/store/settings';
import { refreshManagedChatSurface, usesManagedChatSurface } from '@/tauritavern/chat_surface';
import { event_types } from '@sillytavern/script';
import { useModal } from 'vue-final-modal';

const global_settings = useGlobalSettingsStore();
const { enabled, collapse_code_block, allow_streaming, use_blob_url, use_cleanup_protector, optimize_hljs, depth, depth_ignore_hidden } =
  toRefs(global_settings.settings.render);
const { enabled: macro_enabled } = toRefs(global_settings.settings.macro);

const collapse_code_block_options = [
  {
    label: t`全部`,
    value: 'all',
  },
  {
    label: t`仅前端`,
    value: 'frontend_only',
  },
  {
    label: t`禁用`,
    value: 'none',
  },
];

const enable_optimize_hljs = computed(() => enabled.value && optimize_hljs.value);
useOptimizeHljs(enable_optimize_hljs);
const enable_collapse_code_block = computed(() => {
  if (!enabled.value) {
    return 'none';
  }
  return collapse_code_block.value;
});
const enable_allow_streaming = computed(() => {
  if (usesManagedChatSurface || !enabled.value) {
    return false;
  }
  return allow_streaming.value;
});
if (!usesManagedChatSurface) {
  useCollapseCodeBlock(enable_collapse_code_block, enable_allow_streaming);
}
useMacroLike(macro_enabled, usesManagedChatSurface);
const runtimes = usesManagedChatSurface
  ? ref<Array<{ message_id: number; reload_memo: string; elements: HTMLElement[] }>>([])
  : toRef(useMessageIframeRuntimesStore(), 'runtimes');

if (usesManagedChatSurface) {
  watch(
    () =>
      [
        enabled.value,
        collapse_code_block.value,
        allow_streaming.value,
        use_blob_url.value,
        depth.value,
        depth_ignore_hidden.value,
        macro_enabled.value,
      ] as const,
    refreshManagedChatSurface,
  );
  useEventSourceOn(
    [event_types.CHARACTER_MESSAGE_RENDERED, event_types.USER_MESSAGE_RENDERED, event_types.MESSAGE_DELETED],
    async () => {
      if (depth.value > 0) {
        await refreshManagedChatSurface();
      }
    },
  );
}

const { open: openStreamingConfirm } = useModal({
  component: Popup,
  attrs: {
    buttons: [
      {
        name: t`确定`,
        shouldEmphasize: true,
        onClick: (close: () => void) => {
          allow_streaming.value = true;
          close();
        },
      },
      { name: t`取消` },
    ],
  },
  slots: {
    default: `<h2>⚠️${t`警告`}</h2><p>${t`启用流式渲染可能与某些脚本、插件或酒馆美化不兼容，导致界面异常或功能失效。是否继续？`}</p>`,
  },
});

/**
 * 拦截流式渲染开关，开启时先弹确认框
 */
const streaming_toggle_key = ref(0);
function handleStreamingChange(val: boolean) {
  if (usesManagedChatSurface && val) {
    toastr.error(t`虚拟化聊天不支持流式渲染`);
    return;
  }
  if (val && !allow_streaming.value) {
    streaming_toggle_key.value++;
    openStreamingConfirm();
  } else {
    allow_streaming.value = val;
  }
}
</script>

<style>
.TH-render:has(.TH-collapse-code-block-button:not(.hidden\!)):has(pre.hidden\!) {
  display: inline-block;
}
</style>
