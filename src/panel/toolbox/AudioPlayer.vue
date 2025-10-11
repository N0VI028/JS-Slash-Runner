<template>
  <Item type="box">
    <template #title>{{ t`播放器` }}</template>
    <template #description>{{ t`全局音频播放器` }}</template>
    <template #content>
      <Toggle id="TH-toolbox-audio-player-enabled" v-model="enabled" @click.stop />
    </template>
    <template #detail>
      <div class="flex max-w-full flex-col gap-1" :class="{ 'opacity-50': !enabled }">
        <Controller v-model="bgm" :title="t`音乐`" :enabled="enabled" :audio-type="'bgm'" />
        <Controller v-model="ambient" :title="t`音效`" :enabled="enabled" :audio-type="'ambient'" />
      </div>
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

const tempBgmPlaylist = ref([
  { url: 'https://ontama-m.com/midi/data/mp3_file/original/ontama_kawaii_youseisankonnichiha.mp3', title: 'title1' },
  { url: 'https://ontama-m.com/midi/data/mp3_file/original/raina_p.mp3' },
  { url: 'https://ontama-m.com/midi/data/mp3_file/original/kuturogi.mp3' },
]);
const tempAmbientPlaylist = ref([
  { url: 'https://www.soundjay.com/Human/human-laugh-2.wav' },
  { url: 'https://www.soundjay.com/Human/human-laugh-3.wav' },
]);

bgm.playlist = tempBgmPlaylist.value;
ambient.playlist = tempAmbientPlaylist.value;
</script>
