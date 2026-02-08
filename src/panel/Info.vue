<template>
  <Popup width="fit" :buttons="[{ name: t`关闭` }]">
    <div class="flex flex-col gap-0.75 p-1">
      <div class="flex flex-col items-center justify-center gap-0.25">
        <span class="inline-flex gap-0.5 th-text-lg"><span class="font-bold">Tavern</span> Helper</span>
        <span>{{ t`Ver ${current_version}` }}</span>
        <Button class="w-auto! whitespace-nowrap" @click="openUpdateModal">{{ button_text }}</Button>
      </div>
      <div class="flex flex-1 flex-col items-center gap-0.5">
        <!-- prettier-ignore-attribute -->
        <div class="flex flex-col text-center th-text-xs opacity-70">
          <div class="mb-0.25 th-text-sm">{{ t`作者：KAKAA，青空莉想做舞台少女的狗` }}</div>
          <div>{{ t`本扩展免费使用，禁止任何形式的商业用途` }}</div>
          <div>{{ t`脚本可能存在风险，请确保安全后再运行` }}</div>
        </div>
      </div>
      <div class="flex justify-center gap-0.75">
        <a
          href="https://n0vi028.github.io/JS-Slash-Runner-Doc"
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
    </div>
  </Popup>
</template>

<script setup lang="ts">
import { getTavernHelperVersion } from '@/function/version';
import Button from '@/panel/component/Button.vue';
import Popup from '@/panel/component/Popup.vue';
import { getLatestVersion, hasUpdate } from '@/panel/info/update';
import Update from '@/panel/info/Update.vue';
import { Tippy } from 'vue-tippy';

const current_version = getTavernHelperVersion();
const button_text = ref(t`查看日志`);

onMounted(async () => {
  if (await hasUpdate()) {
    button_text.value = t`最新: ${await getLatestVersion()}`;
  }
});

const { open: openUpdateModal } = useModal({
  component: Update,
});
</script>
