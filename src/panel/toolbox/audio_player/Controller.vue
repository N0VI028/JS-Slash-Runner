<template>
  <div class="flex flex-row items-center justify-between">
    <label>音乐</label>
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
          v-model="model.volume"
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
      <div class="menu_button relative h-[2rem] w-[2rem]" @click="model.playing = !model.playing">
        <i class="fa-solid" :class="[model.playing && props.enabled ? 'fa-pause' : 'fa-play']"></i>
      </div>
    </div>
    <div class="flex grow items-center">
      <input v-model="model.progress" type="range" value="0" min="0" max="100" />
    </div>
  </div>
  <div class="flex grow items-center gap-[10px] py-[10px]">
    <div class="grow">
      <select class="m-0! h-full"></select>
    </div>
    <div>
      <div
        class="menu_button relative h-[1.8rem] w-[1.8rem]"
        @click="model.mode = audio_mode_enum[(audio_mode_enum.indexOf(model.mode) + 1) % audio_mode_enum.length]"
      >
        <i
          class="fa-solid"
          :class="[
            {
              repeat_one: 'fa-redo-alt',
              repeat_all: 'fa-repeat',
              shuffle: 'fa-random',
              play_one_and_stop: 'fa-cancel',
            }[model.mode],
          ]"
        />
      </div>
    </div>
  </div>
  <audio v-show="false" ref="audio"></audio>
</template>

<script setup lang="ts">
import { audio_mode_enum, AudioMode } from '@/type/settings';

const model = defineModel<{
  src: string;
  playing: boolean;
  progress: number;
  mode: AudioMode;
  muted: boolean;
  volume: number;
  playlist: string[];
}>({ required: true });

const props = defineProps<{
  enabled: boolean;
}>();

const controls = useMediaControls(useTemplateRef('audio'), { src: () => model.value.src });

{
  const controls_progress = computed({
    get: () => (controls.currentTime.value / controls.duration.value) * 100,
    set: value => {
      controls.currentTime.value = (value / 100) * controls.duration.value;
    },
  });

  const { progress, muted, volume } = toRefs(model.value);
  const model_playing = computed({
    get: () => props.enabled && model.value.playing,
    set: value => {
      model.value.playing = value;
    },
  });

  syncRef(model_playing, controls.playing);
  syncRef(progress, controls_progress);
  syncRef(muted, controls.muted);
  syncRef(volume, controls.volume);
}

watch(controls.ended, value => {
  if (!value) {
    return;
  }
  controls.ended.value = false;
  model.value.progress = 0;

  switch (model.value.mode) {
    case 'repeat_one':
      model.value.playing = true;
      break;
    case 'repeat_all':
      model.value.src =
        model.value.playlist[(model.value.playlist.indexOf(model.value.src) + 1) % model.value.playlist.length];
      model.value.playing = true;
      break;
    case 'shuffle':
      model.value.src = _.sample(model.value.playlist) as string;
      model.value.playing = true;
      break;
    case 'play_one_and_stop':
      model.value.playing = false;
      break;
  }
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
