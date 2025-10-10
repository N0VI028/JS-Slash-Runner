<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="flex h-full w-full flex-col gap-0.5">
      <template v-if="writable_variables.length > 0 || props.currentView === 'text'">
        <TreeMode
          v-if="props.currentView === 'tree'"
          v-model:data="variables"
          :filters="props.filters"
          :search-input="props.searchInput"
        />
        <template v-else-if="props.currentView === 'card'">
          <template v-for="data in writable_variables" :key="data[0]">
            <CardMode
              v-model:name="data[0]"
              v-model:content="data[1]"
              :filters="props.filters"
              :search-input="props.searchInput"
              @delete="removeVariable($event.name)"
            />
          </template>
        </template>
        <TextMode
          v-else-if="props.currentView === 'text'"
          v-model:data="variables"
          :search-input="props.searchInput"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRefHistory } from '@vueuse/core';
import { computed } from 'vue';

import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import TextMode from '@/panel/toolbox/variable_manager/TextMode.vue';
import TreeMode from '@/panel/toolbox/variable_manager/TreeMode.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager/types';
import { rootVariableKeySchema } from '@/panel/toolbox/variable_manager/types';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput?: string | RegExp;
}>();

const variables = defineModel<Record<string, any>>({ required: true });

/**
 * 为变量创建历史记录管理器
 * 配置深度监听、容量限制和快照选项
 */
const { history, commit, undo, redo, canUndo, canRedo } = useRefHistory(variables, {
  deep: true,
  clone: true,
  capacity: 20,
  flush: 'post',
});

watchDebounced(variables, () => commit(), { debounce: 300, deep: true });

const createRootVariable = (payload: RootVariablePayload): boolean => {
  const keyResult = rootVariableKeySchema.safeParse(payload.key);
  if (!keyResult.success) {
    keyResult.error.issues.forEach(issue => {
      toastr.error(issue.message, '键名校验失败');
    });
    return false;
  }

  const key = keyResult.data;
  if (Object.prototype.hasOwnProperty.call(variables.value, key)) {
    toastr.error(`键名 "${key}" 已存在`, '新增变量失败');
    return false;
  }

  variables.value = {
    [key]: payload.value,
    ...variables.value,
  };

  toastr.success(`已创建根变量 "${key}"`, '新增变量成功');
  return true;
};

defineExpose({
  undo,
  redo,
  canUndo,
  canRedo,
  history,
  createRootVariable,
});

const writable_variables = computed({
  get: () => Object.entries(variables.value),
  set: entries => {
    variables.value = Object.fromEntries(entries);
  },
});

const removeVariable = (nameToRemove: string | number) => {
  const target = String(nameToRemove);
  writable_variables.value = writable_variables.value.filter(([key]) => String(key) !== target);
};
</script>
