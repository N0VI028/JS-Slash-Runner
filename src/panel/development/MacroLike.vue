<template>
  <Item type="box">
    <template #title>{{ t`禁用酒馆助手宏` }}</template>
    <template #description>
      {{ t`编写变量角色卡而非测试/游玩角色卡时，打开此开关，避免 \{\{get_message_variable::变量\}\} 等宏被替换` }}
    </template>
    <template #content>
      <Toggle :id="`TH-macro-disabled`" v-model="disabled" />
    </template>
  </Item>
</template>

<script setup lang="ts">
import { useGlobalSettingsStore } from '@/store/settings';

const enabled = toRef(useGlobalSettingsStore().settings.macro, 'enabled');
const disabled = useNegate(enabled);
</script>
