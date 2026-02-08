<template>
  <Item type="box">
    <div class="flex flex-col gap-0.5">
      <!-- 标题行 -->
      <div class="flex items-center justify-between gap-0.75">
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="th-text-base font-bold">{{ t`播放器` }}</div>
          <div class="mt-0.25 th-text-xs opacity-70">{{ t`全局音频播放器` }}</div>
        </div>
        <Toggle id="TH-audio-player-enabled" v-model="enabled" />
      </div>
      <!-- 分割线 -->
      <Divider type="major" margin-y="my-0.25" weight="h-[0.75px]" />
      <!-- 播放器内容 -->
      <div class="flex flex-col gap-1" :class="{ 'opacity-50': !enabled }">
        <Controller v-model="bgm" :title="t`音乐`" :enabled="enabled" :audio-type="'bgm'" />
        <Controller v-model="ambient" :title="t`音效`" :enabled="enabled" :audio-type="'ambient'" />
      </div>
    </div>
  </Item>
</template>

<script setup lang="ts">
import Controller from '@/panel/toolbox/audio_player/Controller.vue';
import { useAmbientAudioStore, useBgmAudioStore } from '@/store/audio';
import { useGlobalSettingsStore } from '@/store/settings';

const { enabled } = toRefs(useGlobalSettingsStore().settings.audio);
const bgm = useBgmAudioStore();
const ambient = useAmbientAudioStore();
</script>
