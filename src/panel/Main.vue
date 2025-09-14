<template>
  <Item>
    <template #title>启用扩展</template>
    <template #description>扩展总开关</template>
    <template #content>
      <Toggle id="tavern_helper_settings_enabled" v-model="settings.enabled" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>版本更新</template>
    <template #description>查看最新特性，检查并更新扩展</template>
    <template #content>
      <Button :on_click="TODO">更新</Button>
    </template>
  </Item>
  <Divider type="major"><i class="fa-solid fa-tools margin-r5"></i>开发工具</Divider>
  <Reference />
  <Divider type="major"><i class="fa-solid fa-shapes margin-r5"></i>扩展信息</Divider>
  <Info />
</template>

<script setup lang="ts">
import { event_bus } from '@/event_bus';
import Button from '@/panel/component/Button.vue';
import { Collapsible } from '@/panel/component/collapsible';
import Divider from '@/panel/component/Divider.vue';
import Item from '@/panel/component/Item.vue';
import Toggle from '@/panel/component/Toggle.vue';
import Info from '@/panel/main/Info.vue';
import Reference from '@/panel/main/Reference.vue';
import { useSettingsStore } from '@/store/settings';
import { TODO } from '@/todo';
import { events } from '@/type/events';
import { storeToRefs } from 'pinia';
import { onMounted, watchEffect } from 'vue';

const { settings } = storeToRefs(useSettingsStore());
watchEffect(() => {
  event_bus.emit(settings.value.enabled ? events.extension_enabled : events.extension_disabled);
});

onMounted(() => {
  Collapsible.initAll('.collapsible', {
    headerSelector: 'div:first-child',
    contentSelector: '.collapsible-content',
    initiallyExpanded: false,
    animationDuration: {
      expand: 280,
      collapse: 250,
    },
  });
});
</script>
