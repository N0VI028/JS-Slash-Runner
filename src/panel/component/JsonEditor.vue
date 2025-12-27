<template>
  <div ref="editor" class="h-full w-full" />
</template>

<script setup lang="ts">
import { getCurrentLocale } from '@sillytavern/scripts/i18n';
import { detailedDiff } from 'deep-object-diff';
import { destr, safeDestr } from 'destr';
import { Content, createJSONEditor, JSONEditorPropsOptional, Mode, ValidationSeverity } from 'vanilla-jsoneditor';

const props = defineProps<{ schema?: z.ZodType<any> }>();

const content = defineModel<Record<string, any>>({ required: true });

const editor_ref = useTemplateRef('editor');

function updateModel(updated: Content) {
  prevent_updating_content = true;
  if (_.get(updated, 'text') !== undefined) {
    if (editor_instance.validate() === undefined) {
      const new_content = destr(_.get(updated, 'text'));
      if (_.isPlainObject(new_content)) {
        content.value = new_content as Record<string, any>;
      }
    }
    return;
  }
  const new_content = _.get(updated, 'json');
  if (_.isPlainObject(new_content)) {
    content.value = new_content as Record<string, any>;
  }
}
const updateModelDebounced = _.debounce(updateModel, 300);

let editor_instance: ReturnType<typeof createJSONEditor>;
let prevent_updating_content = false;
let mode: Mode = Mode.tree;

let is_unmounted = false;

const ANIMATION_TIME = 1000;
const animation_queue: Array<() => Promise<void>> = [];
let is_playing_animation = false;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const runAnimationQueue = async () => {
  if (is_playing_animation || is_unmounted) {
    return;
  }
  is_playing_animation = true;
  try {
    while (animation_queue.length > 0 && !is_unmounted) {
      const job = animation_queue.shift()!;
      await job();
    }
  } finally {
    is_playing_animation = false;
  }
};

onMounted(() => {
  document.documentElement.style.setProperty('--jse-custom-anim-duration', `${ANIMATION_TIME}ms`);

  editor_instance = createJSONEditor({
    target: editor_ref.value!,
    props: {
      content: {
        json: content.value,
      },
      mode: mode,
      parser: {
        // @ts-expect-error destr 是可以使用的
        parse: safeDestr,
        stringify: JSON.stringify,
      },
      validator: json => {
        if (!props.schema) {
          return [];
        }
        const result = props.schema.safeParse(json);
        if (result.success) {
          return [];
        }
        return result.error.issues.map(issue => ({
          path: issue.path.map(String),
          message: issue.message,
          severity: ValidationSeverity.error,
        }));
      },
      onChangeMode: new_mode => {
        mode = new_mode;
      },
      onChange: updated => {
        if (mode === Mode.text) {
          updateModelDebounced(updated);
        } else {
          updateModel(updated);
        }
      },
      language: getCurrentLocale().includes('zh') ? 'zh' : 'en',
    } satisfies JSONEditorPropsOptional,
  });

  watch(content, (new_content, old_content) => {
    if (prevent_updating_content) {
      prevent_updating_content = false;
      return;
    }

    // TODO: 性能如何?
    const diff = detailedDiff(old_content, new_content);

    const has_deletions = !_.isEmpty(diff.deleted);

    const play_deletion = () => {
      editor_instance.updateProps({
        onClassName: path => (_.has(diff.deleted, path) ? 'jse-custom-deleted' : undefined),
      });
    };

    const play_addition_and_update = () => {
      editor_instance.updateProps({
        content: {
          json: klona(new_content),
        },
        onClassName: path =>
          _.has(diff.updated, path) ? 'jse-custom-updated' : _.has(diff.added, path) ? 'jse-custom-added' : undefined,
      });
    };

    const play_done = () => {
      editor_instance.updateProps({
        onClassName: () => undefined,
      });
    };

    animation_queue.push(async () => {
      if (is_unmounted) {
        return;
      }
      if (has_deletions) {
        play_deletion();
        await wait(ANIMATION_TIME);
      }
      play_addition_and_update();
      await wait(ANIMATION_TIME);
      play_done();
    });
    runAnimationQueue();
  });
});
onBeforeUnmount(() => {
  is_unmounted = true;
  animation_queue.length = 0;
  editor_instance?.destroy();
});
</script>

<style>
:root {
  /* 整体背景 */
  --jse-background-color: var(--SmartThemeBlurTintColor);
  /* 主题色 */
  --jse-theme-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  /* 文本颜色 */
  --jse-text-color: var(--SmartThemeBodyColor);
  /* 工具栏文本颜色 */
  --jse-menu-color: var(--SmartThemeEmColor);
  /* 工具栏的按钮的主题色高亮 */
  --jse-theme-color-highlight: var(--white20a);
  /* 键名称的颜色 */
  --jse-key-color: var(--SmartThemeQuoteColor);
  /* 选中的变量的背景色 */
  --jse-selection-background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  --jse-selection-background-inactive-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  /* 下拉箭头的背景色 */
  --jse-context-menu-pointer-hover-background: #b2b2b2;
  --jse-context-menu-pointer-background: #b2b2b2;
  /* 分隔符（也就是冒号）的颜色 */
  --jse-delimiter-color: var(--SmartThemeEmColor);
  /* 路径显示面板的文本颜色 */
  --jse-panel-button-color: var(--SmartThemeEmColor);
  /* 路径显示面板的背景色 */
  --jse-panel-background: var(--SmartThemeBlurTintColor);
  /* 路径显示面板的文本颜色 */
  --jse-panel-color-readonly: var(--SmartThemeEmColor);
  /* 路径显示面板的边框颜色 */
  --jse-panel-border: var(--SmartThemeEmColor);
  /* 路径显示面板的背景高亮颜色 */
  --jse-panel-button-background-highlight: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);
  /* 缩进标记的颜色 */
  --indent-markers: var(--SmartThemeEmColor);

  /* 弹窗（不是上下文菜单）的背景 */
  --jse-modal-background: var(--SmartThemeBlurTintColor);
  /* 下拉列表字号 */
  --jse-svelte-select-font-size: var(--mainFontSize);
  /* 上下文菜单字号 */
  --jse-font-size: var(--mainFontSize);
  /* 上下文菜单内边距 */
  --jse-padding: calc(var(--mainFontSize) * 0.5);
  /* 文本模式的搜索面板字号大小 */
  --jse-font-size-text-mode-search: calc(var(--mainFontSize) * 0.9);

  /* 弹窗选择框背景 */
  --jse-svelte-select-background: var(--SmartThemeShadowColor);
  /* 下拉列表背景 */
  --list-background: var(--SmartThemeShadowColor);
  /* 下拉列表项选中背景 */
  --jse-item-is-active-bg: var(--SmartThemeQuoteColor);
  /* 下拉列表项聚焦边框 */
  --border-focused: var(--SmartThemeQuoteColor);
  /* 下拉列表项悬停背景 */
  --item-hover-bg: rgb(from var(--SmartThemeChatTintColor) r g b / 1);
  /* 按钮文本颜色 */
  --jse-button-primary-color: var(--SmartThemeBodyColor);
  /* 键值的字号大小 */
  --jse-font-size-mono: var(--mainFontSize);

  /* 变量：字符串颜色 */
  --jse-value-color-string: var(--SmartThemeBodyColor);
  /* 变量：数字颜色 */
  --jse-value-color-number: rgb(255 79 79);
  /* 变量：布尔值颜色 */
  --jse-value-color-boolean: rgb(195 118 210);
  /* 变量：null颜色 */
  --jse-value-color-null: var(--crimson70a);
  /* 变量：url颜色 */
  --jse-value-color-url: rgb(122 151 90);

  /* 编辑框的边框 */
  --jse-edit-outline: (1px solid var(--grey5050a));
  /* 选中行背景色 */
  --jse-active-line-background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent);

  /* 缩进标记背景色 */
  --jse-indent-marker-bg-color: var(--grey5050a);
  /* 缩进标记选中背景色 */
  --jse-indent-marker-active-bg-color: var(--grey5050a);
  /* 折叠项的链接颜色 */
  --jse-collapsed-items-link-color: var(--SmartThemeEmColor);
  /* 标签的背景色 */
  --jse-tag-background: var(--grey5050a);
}

@media screen and (max-width: 500px) {
  :root {
    --jse-font-size: calc(var(--mainFontSize) * 0.8);
    --jse-font-size-main-menu: calc(var(--mainFontSize) * 0.8);
    --jse-svelte-select-font-size: calc(var(--mainFontSize) * 0.8);
    --jse-font-size-mono: calc(var(--mainFontSize) * 0.8);
    --jse-font-size-text-mode-search: calc(var(--mainFontSize) * 0.7);
  }

  .jse-header button svg {
    width: calc(var(--mainFontSize) * 0.8);
    height: calc(var(--mainFontSize) * 0.8);
  }
}

.jse-modal {
  z-index: 10000;
}

.jse-selected {
  color: var(--SmartThemeBlurTintColor) !important;
}

.jse-navigation-bar {
  margin: 5px 0 !important;
  border-radius: 3px;
  border-left: 1px solid var(--SmartThemeQuoteColor) !important;
  border-right: 1px solid var(--SmartThemeQuoteColor) !important;
  border: 1px solid var(--SmartThemeQuoteColor);
}

.jse-context-menu-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.jse-contents,
.jse-status-bar {
  border: none !important;
}

.jse-context-menu-button {
  font-size: calc(var(--mainFontSize) * 0.8) !important;
}

.jse-context-menu-button svg {
  width: calc(var(--mainFontSize) * 0.8) !important;
  height: calc(var(--mainFontSize) * 0.8) !important;
}

.jse-navigation-bar-arrow svg,
.jse-navigation-bar-edit svg {
  width: 10px;
}

.jse-modal-contents .svelte-select input {
  background-color: transparent !important;
  border: none !important;
}

.cm-search label {
  display: inline-flex;
  padding-left: 0 !important;
  color: var(--jse-panel-button-color) !important;
}

.cm-search input.cm-textfield {
  width: 100px;
}

.jse-description {
  white-space: normal;
}

.jse-contextmenu .jse-row .jse-dropdown-button {
  gap: 5px;
}

.jse-contextmenu .jse-label {
  font-size: calc(var(--mainFontSize) * 0.7);
  font-weight: 700;
}

.jse-key {
  white-space: nowrap !important;
}

.jse-collapsed-items {
  margin-left: 0 !important;
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent) !important;
  background-image: none !important;
  white-space: normal;
}

.jse-message {
  white-space: normal;
}

.jse-modal-wrapper .jse-modal-contents .jse-modal-inline-editor {
  --jse-theme-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 20%, transparent) !important;
}

.jse-custom-added {
  animation: background-flash-green var(--jse-custom-anim-duration) ease-in-out;
  animation-fill-mode: forwards;
}

.jse-custom-deleted {
  animation: background-flash-red var(--jse-custom-anim-duration) ease-in-out;
  animation-fill-mode: forwards;
}

.jse-custom-updated {
  animation: background-flash-blue var(--jse-custom-anim-duration) ease-in-out;
  animation-fill-mode: forwards;
}

@keyframes background-flash-green {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(34, 197, 94, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes background-flash-red {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(239, 68, 68, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes background-flash-blue {
  0% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(16, 104, 247, 0.3);
  }
  100% {
    background-color: transparent;
  }
}
</style>
