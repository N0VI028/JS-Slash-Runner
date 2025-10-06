<template>
  <div class="flex flex-row items-center justify-between">
    <label>音乐</label>
    <label class="flex-container cursor-pointer" @click="settings.enabled = !settings.enabled">
      <span
        class="fa-solid"
        :class="{
          'fa-toggle-on': settings.enabled,
          'fa-toggle-off opacity-50 grayscale-50 transition-opacity duration-200 ease-in-out hover:opacity-100 hover:filter-none':
            !settings.enabled,
        }"
      />
    </label>
    <div class="menu_button menu_button_icon">
      <i class="fa-solid fa-list-ol"></i>
    </div>
  </div>
  <div class="audio-container">
    <div class="mute-vol-wrapper">
      <div class="mute-div">
        <div class="menu_button relative h-[2rem] w-[2rem]">
          <i class="fa-solid fa-volume-high"></i>
        </div>
      </div>
      <div class="vol">
        <!-- prettier-ignore-attribute -->
        <input
          v-model="settings.volume"
          type="range"
          class="
            absolute bottom-[calc(200%)] left-[50%] h-[5px]! w-[100px]! -translate-x-[50%] -rotate-[90deg]
            appearance-none
          "
          maxlength="100"
        />
      </div>
    </div>
    <div>
      <div class="menu_button relative h-[2rem] w-[2rem]" @click="play_status.playing = !play_status.playing">
        <i class="fa-solid" :class="{ 'fa-play': !play_status.playing, 'fa-pause': play_status.playing }"></i>
      </div>
    </div>
    <div class="flex grow items-center">
      <input v-model="percent" type="range" value="0" maxlength="1" />
    </div>
  </div>
  <div class="flex grow items-center gap-[10px] py-[10px]">
    <div class="grow">
      <select class="m-0! h-full"></select>
    </div>
    <div>
      <div class="menu_button relative h-[1.8rem] w-[1.8rem]">
        <i class="fa-solid fa-repeat"></i>
      </div>
    </div>
  </div>
  <audio v-show="false" ref="audio"></audio>
</template>

<script setup lang="ts">
import { useChatSettingsStore } from '@/store/settings';

const settings = defineModel<{
  enabled: boolean;
  mode: string; // TODO: 播放模式: 单曲循环、列表循环、随机播放、播完停止
  muted: boolean;
  volume: number;
}>('settings', { required: true });
const play_status = defineModel<{
  playing: boolean;
  src: string;
  playlist: string[]; // TODO: 播放列表
}>('play_status', { required: true });

const controls = useMediaControls(useTemplateRef('audio'), { src: () => play_status.value.src });

const percent = computed({
  get: () => (controls.currentTime.value / controls.duration.value) * 100,
  set: value => {
    controls.currentTime.value = (value / 100) * controls.duration.value;
  },
});
{
  const { playing } = toRefs(play_status.value);
  const { muted, volume } = toRefs(settings.value);
  syncRef(controls.playing, playing);
  syncRef(controls.muted, muted);
  syncRef(controls.volume, volume);
}

const chat_id = toRef(useChatSettingsStore(), 'id');
watch(chat_id, () => {
  play_status.value.playing = false;
  play_status.value.src = '';
  play_status.value.playlist = [];
  percent.value = 0;
});
</script>

<style lang="scss" scoped>
.audio-container {
  padding: 3px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  background-color: var(--black30a);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 5px;
}

.mute-vol-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.vertical-slider {
  width: 100px !important;
  height: 5px !important;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  appearance: none;
  position: absolute;
  bottom: calc(200%);
  left: 50%;
  transform: translateX(-50%) rotate(-90deg);
}

.vol {
  width: 100px;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.mute-div:hover + .vol,
.vol:hover {
  display: flex;
}
</style>
