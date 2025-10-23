<template>
  <div class="relative flex w-full justify-between gap-1 rounded-md bg-(--grey5020a) p-1.5">
    <!-- prettier-ignore-attribute -->
    <div class="flex flex-1 flex-col th-text-sm opacity-70">
      <div class="mb-1.5">
        {{ t`作者：KAKAA，青空莉想做舞台少女的狗` }}
      </div>
      <div>{{ t`本扩展免费使用，禁止任何形式的商业用途` }}</div>
      <div>{{ t`脚本可能存在风险，请确保安全后再运行` }}</div>
    </div>
    <div class="flex items-center gap-0.75">
      <a
        href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/关于酒馆助手/常见问题/安装与更新问题.html"
        target="_blank"
      >
        <i class="fa-solid fa-book"></i>
      </a>
      <a href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank">
        <i class="fa-brands fa-github"></i>
      </a>
      <Tippy trigger="click" placement="top" :interactive="true">
        <i class="fa-brands fa-discord cursor-pointer text-(--SmartThemeQuoteColor)"></i>
        <template #content>
          <!-- prettier-ignore-attribute -->
          <div class="flex cursor-pointer flex-col gap-0.25 rounded-sm bg-(--SmartThemeBlurTintColor) p-0.5">
            <a href="https://discord.com/channels/1134557553011998840/1296494001406345318" target="_blank"
              ><span class="text-(--SmartThemeBodyColor)">{{ t`类脑` }}</span></a
            >
            <div class="h-[0.5px] w-full bg-(--SmartThemeEmColor)" />
            <a href="https://discord.com/channels/1291925535324110879/1374297592854216774" target="_blank"
              ><span class="text-(--SmartThemeBodyColor)">{{ t`旅程` }}</span></a
            >
          </div>
        </template>
      </Tippy>
    </div>
    <!-- prettier-ignore-attribute -->
    <div
      class="pointer-events-none absolute top-[50%] right-0.75 z-[-1] translate-y-[-50%] th-text-xl font-bold opacity-10"
    >
      About Us
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tippy } from 'vue-tippy';
</script>
