<template>
  <Item type="box">
    <template #title>{{ t`播放器` }}</template>
    <template #description>{{ t`全局音频播放器` }}</template>
    <template #content>
      <Toggle id="TH-toolbox-audio-player-enabled" v-model="enabled" />
    </template>
    <template #detail>
      <Controller v-model:settings="bgm_settings" v-model:play_status="bgm_play_status" />
      <Controller v-model:settings="ambient_settings" v-model:play_status="ambient_play_status" />
    </template>
  </Item>
</template>

<script setup lang="ts">
import Controller from '@/panel/toolbox/audio_player/Controller.vue';
import { useGlobalSettingsStore } from '@/store/settings';

const { enabled, bgm: bgm_settings, ambient: ambient_settings } = toRefs(useGlobalSettingsStore().settings.audio);
const bgm_play_status = ref({
  playing: false,
  src: 'http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
  playlist: [] as string[],
});
const ambient_play_status = ref({
  playing: false,
  src: 'http://commondatastorage.googleapis.com/codeskulptor-assets/Collision8-Bit.ogg',
  playlist: [] as string[],
});
</script>
