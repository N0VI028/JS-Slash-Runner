<template>
  <!-- prettier-ignore -->
  <div class="flex flex-col gap-0.5">
    <div class="flex flex-row items-center justify-between">
      <div class="flex items-center gap-0.5">
      <label>{{ props.title }}</label>
      <div class="cursor-pointer" @click="model.enabled = !model.enabled">
        <i class="fa-solid" :class="model.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
      </div>
      </div>
      <!-- 音量 -->
      <div class="flex items-center gap-0.25">
        <div class="cursor-pointer" @click="toggleMute">
          <i class="fa-solid" :class="[model.muted || model.volume === 0 ? 'fa-volume-xmark' : 'fa-volume-low']"></i>
        </div>
        <div
          class="
            relative h-[5px] w-4 cursor-pointer rounded-full border border-[var(--SmartThemeBorderColor)]
            bg-[var(--black30a)]
          "
        >
          <div
            class="
              pointer-events-none absolute top-0 left-0 h-full rounded-full bg-[var(--SmartThemeBodyColor)]
              transition-all
            "
            :style="{ width: `${model.volume * 100}%` }"
          ></div>
          <input
            v-model.number="volumeModel"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
    <div
class='
  flex items-center rounded-sm border border-[var(--SmartThemeBorderColor)] bg-(--SmartThemeQuoteColor)/10 px-0.75
  py-0.25
'>      <!-- 播放 -->
      <div>
        <button class="menu_button min-h-2 min-w-2" :disabled="!props.enabled || !model.enabled"  @click="togglePlay()">
          <i class="fa-solid" :class="[model.playing && props.enabled && model.enabled ? 'fa-pause' : 'fa-play']"></i>
        </button>
      </div>
      <!-- 进度 -->
      <div class="flex grow items-center">
        <input v-model="model.progress" type="range" value="0" min="0" max="100" :disabled="!props.enabled || !model.enabled" />
      </div>
    </div>
    <div class="flex grow items-center gap-0.25">
      <!-- 播放列表 -->
      <div class="grow">
        <select v-model="model.src" class="m-0! h-full">
          <option v-for="item in model.playlist" :key="item.title?item.title:item.url" :value="item.url">{{ item.title?item.title:item.url }}</option>
        </select>
      </div>
      <div class="flex items-center gap-0.25">
        <div class="menu_button interactable" title="{{ t`播放列表` }}" @click="openPlaylist()">
          <i class="fa-solid fa-list-ol"></i>
        </div>
        <div
          class="menu_button interactable"
          @click="model.mode = audio_mode_enum[(audio_mode_enum.indexOf(model.mode) + 1) % audio_mode_enum.length]"
        >
          <i
            class="fa-solid"
            :class="[
              {
                repeat: 'fa-repeat',
                single: 'fa-redo-alt',
                random: 'fa-random',
                stop: 'fa-cancel',
              }[model.mode],
            ]"
            :title="{
              repeat: t`循环播放`,
              single: t`单曲循环`,
              random: t`随机播放`,
              stop: t`播完停止`,
            }[model.mode]"
          />
        </div>
      </div>
    </div>
  </div>
  <audio v-show="false" ref="audio" controls :src="model.src" @ended="onEnded"></audio>
</template>

<script setup lang="ts">
import PlayListEditor from '@/panel/toolbox/audio_player/PlayListEditor.vue';
import { audio_mode_enum, AudioMode } from '@/type/settings';
import { nextTick, useTemplateRef } from 'vue';
import { useModal } from 'vue-final-modal';

const model = defineModel<{
  src: string;
  playing: boolean;
  progress: number;
  enabled: boolean;
  mode: AudioMode;
  muted: boolean;
  volume: number;
  playlist: { url: string; title?: string }[];
}>({ required: true });

// 监听 playlist 变化，自动选择第一个曲目
watchEffect(() => {
  // 如果没有选择任何曲目，且播放列表不为空，默认选中第一个
  if (!model.value.src && model.value.playlist.length > 0) {
    model.value.src = model.value.playlist[0].url;
  }
});

const props = defineProps<{
  title: string;
  enabled: boolean;
  audioType: 'bgm' | 'ambient';
}>();

const audioRef = useTemplateRef('audio');
const controls = useMediaControls(audioRef, { src: () => model.value.src });

const volumeModel = computed({
  get: () => model.value.volume,
  set: value => {
    model.value.volume = value;
    if (value > 0 && model.value.muted) {
      model.value.muted = false;
    }
  },
});

const toggleMute = () => {
  model.value.muted = !model.value.muted;
};

const togglePlay = () => {
  if (model.value.playing) {
    model.value.playing = false;
  } else {
    play();
  }
};

/**
 * 开始播放
 * @param opts 播放选项
 * @param opts.currentTime 播放时间
 */
const play = (opts: { currentTime?: number } = {}) => {
  if (!props.enabled || !model.value.enabled) {
    return;
  }

  return new Promise((resolve, reject) => {
    const audioEl = audioRef.value;
    if (!audioEl) {
      reject(new Error('Audio element not found'));
      return;
    }
    if (!model.value.src) {
      model.value.src = model.value.playlist[0].url;
    }
    console.log('model.value.src', model.value.src);

    const handlePlay = () => {
      nextTick(() => {
        audioEl
          .play()
          .then(() => {
            nextTick(() => {
              if (opts?.currentTime) {
                audioEl.currentTime = opts.currentTime;
              }

              model.value.playing = true;

              resolve(audioEl);
            });
          })
          .catch(reject);
      });
    };

    handlePlay();
  });
};

/**
 * 播放结束时的处理
 */
const onEnded = () => {
  controls.ended.value = false;
  model.value.progress = 0;

  const currentIndex = model.value.playlist.findIndex(item => item.url === model.value.src);
  const nextIndex = (currentIndex + 1) % model.value.playlist.length;

  switch (model.value.mode) {
    case 'single':
      play({ currentTime: 0 });
      break;
    case 'repeat':
      model.value.src = model.value.playlist[nextIndex].url;
      play();
      break;
    case 'random':
      model.value.src = (_.sample(model.value.playlist) as { url: string; title?: string }).url;
      play();
      break;
    case 'stop':
      model.value.playing = false;
      break;
  }
};

{
  const controls_progress = computed({
    get: () => {
      const duration = controls.duration.value;
      if (!duration || isNaN(duration) || duration === 0) {
        return 0;
      }
      return (controls.currentTime.value / duration) * 100;
    },
    set: value => {
      controls.currentTime.value = (value / 100) * controls.duration.value;
    },
  });

  const { progress, muted, volume } = toRefs(model.value);
  const model_playing = computed({
    get: () => props.enabled && model.value.enabled && model.value.playing,
    set: value => {
      model.value.playing = value;
    },
  });

  syncRef(model_playing, controls.playing);
  syncRef(progress, controls_progress);
  syncRef(muted, controls.muted);
  syncRef(volume, controls.volume);
}

/**
 * 打开播放列表
 */
const openPlaylist = () => {
  const { open: openCreatorModal } = useModal({
    component: PlayListEditor,
    attrs: {
      playlist: model.value.playlist,
      onSubmit: (value: { url: string; title?: string }[]) => {
        model.value.playlist = value;
      },
    },
  });

  openCreatorModal();
};
</script>
