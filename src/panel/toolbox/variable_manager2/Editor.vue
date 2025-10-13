<template>
  <div ref="editor" class="h-full w-full"></div>
</template>

<script setup lang="ts">
// TODO: async import
import { createJSONEditor, JSONEditorPropsOptional } from 'vanilla-jsoneditor';

const props = defineProps<{ content: Record<string, any> }>();

const editor_ref = useTemplateRef('editor');

let editor: ReturnType<typeof createJSONEditor>;
onMounted(() => {
  editor = createJSONEditor({
    target: editor_ref.value!,
    props: {
      content: { json: props.content },
    } satisfies JSONEditorPropsOptional,
  });
});
onBeforeUnmount(() => {
  editor.destroy();
});
</script>

<style>
:root {
  /* 整体背景 */
  --jse-background-color: var(--SmartThemeBlurTintColor);
  /* 主题色 */
  --jse-theme-color: var(--SmartThemeQuoteColor);
  /* 文本颜色 */
  --jse-text-color: var(--SmartThemeBodyColor);
  /* 工具栏文本颜色 */
  --jse-menu-color: rgb(from var(--SmartThemeChatTintColor) r g b / 1);
  /* 键名称的颜色 */
  --jse-key-color: var(--SmartThemeBodyColor);
  /* 选中的变量的背景色 */
  --jse-selection-background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  /* 分隔符（也就是冒号）的颜色 */
  --jse-delimiter-color: var(--SmartThemeEmColor);
  /* 路径显示面板的文本颜色 */
  --jse-panel-button-color: var(--SmartThemeEmColor);
  /* 路径显示面板的背景色 */
  --jse-panel-background: color-mix(in srgb, var(--SmartThemeEmColor) 20%, transparent);
  /* 路径显示面板的文本颜色 */
  --jse-panel-color-readonly: var(--SmartThemeEmColor);
  /* 路径显示面板的边框颜色 */
  --jse-panel-border: var(--SmartThemeEmColor);
  /* 路径显示面板的按钮背景高亮颜色 */
  --jse-panel-button-background-highlight: var(--SmartThemeEmColor);
  /* 缩进标记的颜色 */
  --indent-markers: var(--SmartThemeEmColor);

  /* 弹窗（不是上下文菜单）的背景 */
  --jse-modal-background: var(--SmartThemeChatTintColor);
  /* 上下文菜单字号 */
  --jse-font-size: calc(var(--mainFontSize) * 0.8);
  /* 上下文菜单内边距 */
  --jse-padding: calc(var(--mainFontSize) * 0.5);

  /* 弹窗选择框背景 */
  --jse-svelte-select-background: var(--SmartThemeShadowColor);
  /* 下拉列表背景 */
  --list-background: var(--SmartThemeShadowColor);
  /* 下拉列表项悬停背景 */
  --item-hover-bg: rgb(from var(--SmartThemeChatTintColor) r g b / 1);
  /* 按钮文本颜色 */
  --jse-button-primary-color: rgb(from var(--SmartThemeChatTintColor) r g b / 1);
}
.jse-main {
  padding-inline: calc(var(--mainFontSize) * 0.75);
}

.jse-context-menu-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.jse-navigation-bar,
.jse-contents,
.jse-status-bar {
  border: none !important;
}

button.jse-context-menu-button svg {
  width: calc(var(--mainFontSize) * 0.8);
}
</style>
