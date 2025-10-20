<template>
  <CardBase
    v-model:name="name"
    v-model:content="content"
    v-model:collapsed="isCollapsed"
    :depth="props.depth"
    :type-label="t`Object`"
    icon="fa-regular fa-folder-open"
    :search-input="props.searchInput"
    :allow-add-child="true"
    @delete="emitDelete"
    @add-child="openAddChild"
  >
    <div class="mt-0.5 flex min-w-0 flex-col gap-0.5 p-0">
      <template v-for="data in writable_content" :key="data[0]">
        <CardMode
          :name="data[0]"
          :content="data[1]"
          :depth="nextDepth"
          :filters="props.filters"
          :search-input="props.searchInput"
          :as-child="true"
          @update:name="renameField(data[0], $event as string)"
          @update:content="updateField(data[0], $event)"
          @delete="removeField(data[0])"
        />
      </template>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import RootVariableCreator from '@/panel/toolbox/variable_manager/RootVariableCreator.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { isSearching, nodeMatchesSearch } from '@/panel/toolbox/variable_manager/search';
import { useModal } from 'vue-final-modal';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<Record<string, any>>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: Record<string, any> }): void;
}>();

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    depth?: number;
    filters: FiltersState;
    searchInput: RegExp | null;
  }>(),
  {
    collapsed: true,
    depth: 0,
  },
);

const writable_content = computed({
  get: () => Object.entries(content.value),
  set: entries => {
    content.value = Object.fromEntries(entries);
  },
});

const isCollapsed = ref(props.collapsed ?? true);

watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

const emitDelete = () => {
  emit('delete', {
    name: name.value,
    content: content.value,
  });
};

const nextDepth = computed(() => (props.depth ?? 0) + 1);

const removeField = (fieldKey: string) => {
  const entries = Object.entries(content.value).filter(([key]) => key !== fieldKey);
  content.value = Object.fromEntries(entries);
};

const updateField = (fieldKey: string, newValue: unknown) => {
  // 直接回写对象，触发父级 v-model 更新
  content.value = { ...content.value, [fieldKey]: newValue } as Record<string, any>;
};

const renameField = (oldKey: string, newKey: string) => {
  const key = String(newKey || '').trim();
  if (!key) {
    toastr.error(t`键名不能为空`, t`重命名失败`);
    return;
  }
  if (oldKey === key) return;
  if (Object.prototype.hasOwnProperty.call(content.value, key)) {
    toastr.error(t`键名已存在`, t`重命名失败`);
    return;
  }
  const entries = Object.entries(content.value ?? {}).map(([k, v]) => (k === oldKey ? [key, v] : [k, v]));
  content.value = Object.fromEntries(entries);
};

const openAddChild = () => {
  const { open: openCreatorModal } = useModal({
    component: RootVariableCreator,
    attrs: {
      onSubmit: async (payload: { key: string; value: unknown }) => {
        const key = String(payload.key || '').trim();
        if (!key) {
          toastr.error(t`键名不能为空`, t`新增变量失败`);
          return false;
        }

        const entries = Object.entries(content.value ?? {});
        if (entries.some(([existingKey]) => existingKey === key)) {
          toastr.error(t`键名已存在`, t`新增变量失败`);
          return false;
        }
        content.value = { ...content.value, [key]: payload.value };
        isCollapsed.value = false;
        toastr.success(t`已添加到对象`);
        return true;
      },
    },
  });

  openCreatorModal();
};

// 搜索命中时自动展开
const searchMatched = computed(() => {
  if (!isSearching(props.searchInput)) return false;
  const q = props.searchInput as string | RegExp;
  return nodeMatchesSearch(name.value as any, content.value, q);
});

watch(
  () => searchMatched.value,
  matched => {
    if (matched && isCollapsed.value) {
      isCollapsed.value = false;
    }
  },
  { immediate: true },
);
</script>
