<template>
  <div ref="editor"></div>
</template>

<script setup lang="ts">
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
