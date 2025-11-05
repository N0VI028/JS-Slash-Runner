<template>
  <Popup :buttons="[{ name: t`确认`, shouldEmphasize: true, onClick: submit }, { name: t`取消` }]" width="fit">
    <Selector v-model="target" :title="t`选择创建目标`" :options="options" />
  </Popup>
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';

const emit = defineEmits<{
  submit: [target: 'global' | 'character' | 'preset'];
}>();
function submit(close: () => void) {
  emit('submit', target.value);
  close();
}

const props = withDefaults(
  defineProps<{
    target?: 'global' | 'character' | 'preset';
  }>(),
  {
    target: 'global',
  },
);

const target = ref<'global' | 'character' | 'preset'>(props.target);

const character_name = toRef(useCharacterSettingsStore(), 'name');
const options = computed(() => {
  let result = _<{ label: string; value: 'global' | 'character' | 'preset' }>([]);
  result = result.push({ label: t`全局脚本库`, value: 'global' });
  if (character_name.value !== undefined) {
    result = result.push({ label: t`角色脚本库`, value: 'character' });
  }
  result = result.push({ label: t`预设脚本库`, value: 'preset' });
  return result.value();
});
</script>
