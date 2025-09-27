<template>
  <component :is="component" v-model:name="name" v-model:content="content" />
</template>

<script setup lang="ts">
import CardArray from '@/panel/toolbox/variable_manager/CardArray.vue';
import CardBoolean from '@/panel/toolbox/variable_manager/CardBoolean.vue';
import CardNil from '@/panel/toolbox/variable_manager/CardNil.vue';
import CardNumber from '@/panel/toolbox/variable_manager/CardNumber.vue';
import CardObject from '@/panel/toolbox/variable_manager/CardObject.vue';
import CardString from '@/panel/toolbox/variable_manager/CardString.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any>('content', { required: true });

const component = computed(() => {
  if (_.isArray(content.value)) {
    return CardArray;
  }
  if (_.isBoolean(content.value)) {
    return CardBoolean;
  }
  if (_.isNil(content.value)) {
    return CardNil;
  }
  if (_.isNumber(content.value)) {
    return CardNumber;
  }
  if (_.isPlainObject(content.value)) {
    return CardObject;
  }
  return CardString;
});
</script>
