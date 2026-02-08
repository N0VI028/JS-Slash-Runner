<template>
  <div class="TH-message-item">
    <div class="TH-sticky-header">
      <!-- prettier-ignore-attribute -->
      <button class="
          flex w-full cursor-pointer items-center justify-between rounded-t-sm border-none bg-(--SmartThemeQuoteColor)/20
          px-0.5 py-0.25 th-text-sm
        " @click="toggleCollapse">
        <span> {{ t`第 ${normalized_message_id} 楼` }} </span>
        <div class="flex items-center justify-center">
          <i class="fa-solid" :class="is_collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
        </div>
      </button>
      <div v-show="!is_collapsed" ref="toolbarMountRef"></div>
    </div>

    <div v-show="!is_collapsed" ref="editorContainerRef">
      <JsonEditor v-model="variables" :schema="schemas_store.message" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { get_variables_without_clone, getVariables, replaceVariables } from '@/function/variables';
import { useVariableSchemasStore } from '@/store/variable_schemas';
import { event_types } from '@sillytavern/script';

const props = withDefaults(
  defineProps<{
    chatLength: number;
    messageId: number;
    refreshKey: symbol;
    collapsedSet?: Set<number>;
  }>(),
  { collapsedSet: () => new Set() },
);

const schemas_store = useVariableSchemasStore();

const normalized_message_id = computed(() =>
  props.messageId < 0 ? props.chatLength + props.messageId : props.messageId,
);

const internal_refresh_key = ref<symbol>(Symbol());
useEventSourceOn(
  [
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
  ],
  message_id => {
    if (Number(message_id) === normalized_message_id.value) {
      internal_refresh_key.value = Symbol();
    }
  },
);

const is_collapsed = computed(() => props.collapsedSet!.has(normalized_message_id.value));
function toggleCollapse() {
  const id = normalized_message_id.value;
  if (is_collapsed.value) {
    props.collapsedSet!.delete(id);
  } else {
    props.collapsedSet!.add(id);
  }
}

const variables = shallowRef<Record<string, any>>(getVariables({ type: 'message', message_id: props.messageId }));

const editorContainerRef = useTemplateRef<HTMLElement>('editorContainerRef');
const toolbarMountRef = useTemplateRef<HTMLElement>('toolbarMountRef');

const TOOLBAR_SELECTORS = ['.jse-menu', '.jse-navigation-bar'] as const;

/**
 * 将编辑器容器内的工具栏和导航栏移动到 sticky header 挂载点
 * 使用 MutationObserver 持续监听，处理 vanilla-jsoneditor 模式切换时的 DOM 重建
 */
onMounted(() => {
  nextTick(() => {
    const container = editorContainerRef.value;
    const mount = toolbarMountRef.value;
    if (!container || !mount) return;

    const moveToolbars = () => {
      for (const selector of TOOLBAR_SELECTORS) {
        const el = container.querySelector(selector) as HTMLElement;
        if (el && el.parentElement !== mount) {
          mount.querySelector(selector)?.remove();
          mount.appendChild(el);
        }
      }
      // 库可能异步分批创建 DOM，确保顺序始终为 menu → navigation-bar
      for (const selector of TOOLBAR_SELECTORS) {
        const el = mount.querySelector(selector);
        if (el) mount.appendChild(el);
      }
    };

    moveToolbars();

    const observer = new MutationObserver(() => moveToolbars());
    observer.observe(container, { childList: true, subtree: true });

    onUnmounted(() => observer.disconnect());
  });
});

watch(
  () => [props.refreshKey, internal_refresh_key.value],
  () => {
    const new_variables = get_variables_without_clone({ type: 'message', message_id: props.messageId });
    if (!_.isEqual(variables.value, new_variables)) {
      ignoreUpdates(() => {
        // 用户可能用 delete 等直接修改对象内部, 因此要拷贝一份从而能被 _.isEqual 判定
        variables.value = klona(new_variables);
      });
    }
  },
);

const { ignoreUpdates } = watchIgnorable(variables, new_variables => {
  replaceVariables(klona(new_variables), { type: 'message', message_id: props.messageId });
});
</script>

<style scoped>
.TH-sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--SmartThemeBlurTintColor);
}
</style>
