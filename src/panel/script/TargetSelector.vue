<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: submit }, { name: t`取消` }]" width="fit" @closed="emit('closed')">
    <Selector v-model="target" :title="t`选择创建目标`" :options="options" />
  </Popup>
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';
import { useWorldbookScriptsStore } from '@/store/worldbook_scripts';

const worldbook_scripts = useWorldbookScriptsStore();

const emit = defineEmits<{
  closed: [];
  submit: [target: 'global' | 'character' | 'preset' | 'worldbook'];
}>();
function submit(close: () => void) {
  emit('submit', target.value);
  close();
}

const props = withDefaults(
  defineProps<{
    target?: 'global' | 'character' | 'preset' | 'worldbook';
  }>(),
  {
    target: 'global',
  },
);

const target = ref<'global' | 'character' | 'preset' | 'worldbook'>(props.target);

const options = computed(() => {
  let result = _<{ label: string; value: 'global' | 'character' | 'preset' | 'worldbook' }>([]);
  result = result.push({ label: t`全局脚本库`, value: 'global' });
  if (useCharacterSettingsStore().avatar !== undefined) {
    result = result.push({ label: t`角色脚本库`, value: 'character' });
  }
  result = result.push({ label: t`预设脚本库`, value: 'preset' });
  if (worldbook_scripts.selected_name) {
    result = result.push({
      label: t`世界书脚本: ${worldbook_scripts.selected_name}`,
      value: 'worldbook',
    });
  }
  return result.value();
});
</script>
