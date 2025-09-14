<template>
  <div class="extension-content-item">
    <div class="flex flexFlowColumn">
      <div class="settings-title-text">启用扩展</div>
      <div class="settings-title-description">扩展总开关</div>
    </div>
    <div class="toggle-switch">
      <input type="checkbox" id="extension-enable-toggle" class="toggle-input" v-model="settings.enabled" />
      <label for="extension-enable-toggle" class="toggle-label">
        <span class="toggle-handle"></span>
      </label>
    </div>
  </div>
  <Divider />
  <div class="extension-content-item">
    <div class="flex flexFlowColumn">
      <div class="flex-container alignItemsCenter">
        <div class="settings-title-text" id="version-update-text">版本更新</div>
      </div>
      <div class="settings-title-description">查看最新特性，检查并更新扩展</div>
    </div>
    <div id="update-extension" class="TavernHelper-button">更新</div>
  </div>
  <DividerMajor><i class="fa-solid fa-tools margin-r5"></i>开发工具</DividerMajor>
  <Reference />
  <DividerMajor><i class="fa-solid fa-shapes margin-r5"></i>扩展信息</DividerMajor>
  <Info />
</template>

<script setup lang="ts">
import { event_bus } from '@/event_bus';
import { Collapsible } from '@/panel/component/collapsible';
import Divider from '@/panel/component/Divider.vue';
import DividerMajor from '@/panel/component/DividerMajor.vue';
import Info from '@/panel/main/Info.vue';
import Reference from '@/panel/main/Reference.vue';
import { useSettingsStore } from '@/store/settings';
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
