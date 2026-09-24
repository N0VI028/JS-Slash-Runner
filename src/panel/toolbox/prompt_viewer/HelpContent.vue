<template>
  <div class="p-1.5 text-left">
    <div v-html="help_html"></div>
    <!-- 溯源实验性开关：状态存浏览器本地，不写入酒馆设置 -->
    <div class="mt-1.5 flex items-center gap-1 rounded-sm border border-(--SmartThemeBorderColor) p-1">
      <Toggle id="TH-wi-tracer-enabled" v-model="wi_tracer_enabled" />
      <label for="TH-wi-tracer-enabled">{{ t`启用内容溯源（实验性功能）` }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import help_en from '@/panel/toolbox/prompt_viewer/help_en.md?raw';
import help_zh from '@/panel/toolbox/prompt_viewer/help_zh.md?raw';
import { wi_tracer_enabled } from '@/panel/toolbox/prompt_viewer/wi_tracer/trace';
import { renderMarkdown } from '@/util/tavern';
import { getCurrentLocale } from '@sillytavern/scripts/i18n';
import { computed } from 'vue';

const help_html = computed(() => renderMarkdown(getCurrentLocale().includes('zh') ? help_zh : help_en));
</script>
