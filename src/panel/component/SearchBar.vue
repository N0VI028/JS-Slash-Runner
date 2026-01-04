<template>
  <div class="flex w-full flex-wrap items-center gap-0.5">
    <div class="relative flex min-w-0 flex-1">
      <input
        ref="internal"
        :placeholder="placeholder"
        class="text_pole m-0! w-full pr-2! pl-2!"
        type="text"
        @input="onInput"
      />
      <!-- prettier-ignore-attribute -->
      <i
        class="
          fa-solid fa-search pointer-events-none absolute top-1/2 left-0.5 z-1 -translate-y-[50%]
          text-(--SmartThemeBodyColor) opacity-60
        "
      ></i>
      <!-- prettier-ignore-attribute -->
      <button
        v-if="clearable && input !== null"
        class="
          absolute top-1/2 right-0.5 z-2 flex h-1.5 w-1.5 -translate-y-[50%] cursor-pointer border-none bg-transparent
          text-(--SmartThemeBodyColor) opacity-80
        "
        title="清除"
        @click="onClear"
      >
        <i class="fa-solid fa-xmark TH-SearchBar--clear-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const input = defineModel<RegExp | null>({ required: true });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    debounce?: number;
    clearable?: boolean;
  }>(),
  {
    placeholder: '请输入文本...',
    debounce: 300,
    clearable: true,
  },
);

const internal = useTemplateRef<HTMLInputElement>('internal');
const onInput = useDebounceFn(
  () => {
    const result = internal.value!.value;
    if (result === '') {
      input.value = null;
      return;
    }
    input.value = regexFromString(result);
  },
  () => props.debounce,
);

function regexFromString(input: string): RegExp | null {
  if (!input) {
    return null;
  }
  try {
    const match = input.match(/\/(.+)\/([a-z]*)/i);
    if (!match) {
      return new RegExp(_.escapeRegExp(input), 'i');
    }
    if (match[2] && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(match[3])) {
      return new RegExp(input, 'i');
    }
    let flags = match[2] ?? '';
    _.pull(flags, 'g');
    if (flags.indexOf('i') === -1) {
      flags = flags + 'i';
    }
    return new RegExp(match[1], flags);
  } catch {
    return null;
  }
}

function onClear() {
  internal.value!.value = '';
  input.value = null;
}
</script>

<style lang="scss">
.TH-SearchBar--clear-icon:before {
  vertical-align: sub;
}
</style>
