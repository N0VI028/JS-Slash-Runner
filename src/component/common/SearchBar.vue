<template>
  <div class="width100p flex-container alignItemsCenter">
    <div style="position: relative; flex: 1 1 auto; min-width: 0">
      <input
        :value="inputValue"
        @input="onInput"
        :placeholder="placeholderText"
        class="text_pole width100p"
        style="padding-right: 28px"
        type="text"
        ref="inputRef"
      />
      <button
        v-if="clearable && inputValue"
        @click="onClear"
        class="clear-search flex alignItemsCenter justifyContentCenter"
        title="清除"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <i class="fa-solid fa-search"></i>
  </div>
</template>

<script lang="ts">
/**
 * 判断名称是否匹配查询
 * @param name 名称
 * @param rawQuery 查询
 */
export function matchesNameByQuery(name: string, rawQuery: string): boolean {
  const target = String(name ?? '');
  const query = String(rawQuery ?? '').trim();
  if (!query) return true;

  // 正则语法：/pattern/flags
  if (query.startsWith('/') && query.length >= 2) {
    const lastSlash = query.lastIndexOf('/');
    if (lastSlash > 0) {
      const pattern = query.slice(1, lastSlash);
      let flags = query.slice(lastSlash + 1);
      try {
        // 仅保留有效标志，且默认包含 g
        const validFlags = new Set(['g', 'i', 'm', 's', 'u', 'y']);
        flags = (flags || 'g')
          .split('')
          .filter((ch, idx, arr) => validFlags.has(ch) && arr.indexOf(ch) === idx)
          .join('');
        if (!flags.includes('g')) flags += 'g';
        const re = new RegExp(pattern, flags);
        return re.test(target);
      } catch {
        // fallthrough to substring match
      }
    }
  }

  // 普通搜索：大小写不敏感子串匹配
  return target.toLowerCase().includes(query.toLowerCase());
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  debounceMs?: number;
  clearable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索（支持普通和正则）',
  debounceMs: 300,
  clearable: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'clear'): void;
}>();

const inputValue = ref<string>(props.modelValue);
const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.modelValue,
  value => {
    if (value !== inputValue.value) {
      inputValue.value = value;
    }
  },
);

const placeholderText = computed(() => props.placeholder || '搜索（支持普通和正则）');

let timer: number | null = null;

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement)?.value ?? '';
  inputValue.value = value;
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
  timer = window.setTimeout(() => {
    emit('update:modelValue', inputValue.value);
  }, props.debounceMs);
}

function onClear(): void {
  inputValue.value = '';
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}
</script>

<style scoped>
.clear-search {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--mainFontSize) * 1.5);
  width: calc(var(--mainFontSize) * 1.5);
  opacity: 0.8;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 2;
  color: var(--SmartThemeBodyColor);
}

.fa-search {
  margin-left: 6px;
  color: var(--SmartThemeBodyColor);
  opacity: 0.6;
  cursor: pointer;
}
</style>
