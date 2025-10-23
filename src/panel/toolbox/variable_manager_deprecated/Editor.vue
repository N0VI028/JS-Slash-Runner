<template>
  <!-- prettier-ignore -->
  <div class="flex-1 overflow-y-auto p-1">
    <div class="flex h-full w-full flex-col gap-0.5">
      <template v-if="writable_variables.length > 0 || props.currentView === 'text' || props.currentView === 'card'">
        <TreeMode
          v-if="props.currentView === 'tree'"
          v-model:data="variables"
          :filters="props.filters"
          :search-input="props.searchInput"
        />
        <template v-else-if="props.currentView === 'card'">
          <div
            class="
              flex items-center justify-center gap-0.5 rounded border border-(--SmartThemeQuoteColor)/40
              bg-(--SmartThemeBGColor)/60 px-0.5 py-0.25 th-text-sm
            "
          >
            <div
              class="
                inline-flex cursor-pointer items-center gap-0.25 rounded px-0.5 py-0.25 text-(--SmartThemeQuoteColor)
                transition-colors
                hover:bg-(--SmartThemeQuoteColor)/15
              "
              @click="openRootCreatorModal"
            >
              <i class="fa-solid fa-plus"></i>
              <span>{{ t`新增变量` }}</span>
            </div>
            <div
              :class="[
                'inline-flex items-center gap-0.25 rounded px-0.5 py-0.25 transition-colors',
                hasVariables
                  ? 'cursor-pointer text-(--warning) hover:bg-(--warning)/15'
                  : 'cursor-not-allowed text-(--warning)/60 opacity-60',
              ]"
              :title="hasVariables ? t`删除全部` : t`暂无可删除的变量`"
              @click="clearAllVariables"
            >
              <i class="fa-solid fa-trash"></i>
              <span>{{ t`删除全部` }}</span>
            </div>
          </div>
          <template v-if="writable_variables.length > 0">
            <template v-for="data in writable_variables" :key="data[0]">
              <CardMode
                :name="data[0]"
                :content="data[1]"
                :filters="props.filters"
                :search-input="props.searchInput"
                @update:name="renameVariable(data[0], $event)"
                @update:content="updateVariable(data[0], $event)"
                @delete="removeVariable(data[0])"
              />
            </template>
          </template>
          <div
            v-else
            class="
              flex items-center justify-center rounded border border-dashed border-(--SmartThemeQuoteColor)/40 py-1
              th-text-sm text-(--SmartThemeBodyColor)/70
            "
          >
            {{ t`暂无变量，点击上方“新增变量”创建` }}
          </div>
        </template>
        <TextMode v-else-if="props.currentView === 'text'" v-model:data="variables" :search-input="props.searchInput" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRefHistory } from '@vueuse/core';
import { computed } from 'vue';

import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import RootVariableCreator from '@/panel/toolbox/variable_manager/RootVariableCreator.vue';
import TextMode from '@/panel/toolbox/variable_manager/TextMode.vue';
import TreeMode from '@/panel/toolbox/variable_manager/TreeMode.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager/types';
import { rootVariableKeySchema } from '@/panel/toolbox/variable_manager/types';
import { useModal } from 'vue-final-modal';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput: RegExp | null;
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

const hasVariables = computed(() => Object.keys(variables.value).length > 0);

const openRootCreatorModal = () => {
  const { open: openCreatorModal } = useModal({
    component: RootVariableCreator,
    attrs: {
      onSubmit: async (payload: RootVariablePayload) => createRootVariable(payload),
    },
  });

  openCreatorModal();
};

const clearAllVariables = () => {
  if (!hasVariables.value) {
    toastr.info(t`当前没有可删除的变量`, t`删除全部`);
    return;
  }

  variables.value = {};
  toastr.success(t`已删除全部变量`, t`删除成功`);
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

const updateVariable = (key: string | number, newValue: unknown) => {
  const k = String(key);
  variables.value = { ...variables.value, [k]: newValue };
};

const renameVariable = (oldKey: string | number, newKey: string | number) => {
  const source = String(oldKey);
  const target = String(newKey || '').trim();
  if (!target) {
    toastr.error('键名不能为空', '重命名失败');
    return;
  }
  if (source === target) return;
  if (Object.prototype.hasOwnProperty.call(variables.value, target)) {
    toastr.error(`键名 "${target}" 已存在`, '重命名失败');
    return;
  }
  const entries = Object.entries(variables.value).map(([k, v]) => (k === source ? [target, v] : [k, v]));
  variables.value = Object.fromEntries(entries);
};
</script>
