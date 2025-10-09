<template>
  <Item type="box">
    <template #title>{{ t`播放器` }}</template>
    <template #description>{{ t`全局音频播放器` }}</template>
    <template #content>
      <Toggle id="TH-toolbox-audio-player-enabled" v-model="enabled" @click.stop />
    </template>
    <template #detail>
      <Controller v-model="bgm" :title="t`音乐`" :enabled="enabled" />
      <Controller v-model="ambient" :title="t`音效`" :enabled="enabled" />
    </template>
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
