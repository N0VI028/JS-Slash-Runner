<template>
  <div class="extension-content flex flexFlowColumn gap10px">
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
    <div class="divider"></div>
    <div class="extension-content-item">
      <div class="flex flexFlowColumn">
        <div class="flex-container alignItemsCenter">
          <div class="settings-title-text" id="version-update-text">版本更新</div>
        </div>
        <div class="settings-title-description">查看最新特性，检查并更新扩展</div>
      </div>
      <div id="update-extension" class="TavernHelper-button">更新</div>
    </div>
    <div class="major-divider-container">
      <div class="major-divider-text"><i class="fa-solid fa-tools margin-r5"></i>开发工具</div>
      <div class="major-divider-line"></div>
    </div>
    <Reference />
    <div class="major-divider-container">
      <div class="major-divider-text"><i class="fa-solid fa-shapes margin-r5"></i>扩展信息</div>
      <div class="major-divider-line"></div>
    </div>
    <div id="extension-info">
      <div class="info-text flex flex1 flexFlowColumn">
        <div style="font-size: calc(var(--mainFontSize) * 0.8); margin-bottom: 5px; font-weight: 500">
          作者：KAKAA，青空莉想做舞台少女的狗
        </div>
        <div>本扩展免费使用，禁止任何形式的商业用途</div>
        <div>脚本可能存在风险，请确保安全后再运行</div>
      </div>
      <div class="flex-container alignItemsCenter" style="gap: 12px">
        <a
          href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/关于酒馆助手/常见问题/安装与更新问题.html"
          target="_blank"
        >
          <i class="fa-solid fa-book"></i>
        </a>
        <a href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank">
          <i class="fa-brands fa-github"></i>
        </a>
        <a
          href="https://discord.com/channels/1291925535324110879/1363482767421341868/1363482767421341868"
          target="_blank"
        >
          <i class="fa-brands fa-discord"></i>
        </a>
      </div>
      <div class="text-decoration">About Us</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { event_bus } from '@/event_bus';
import { Collapsible } from '@/panel/component/collapsible';
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
