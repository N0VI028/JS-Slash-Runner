<template>
  <div class="flex flex-col gap-0.5" :class="{ 'opacity-50': !model.enabled }">
    <div class="flex flex-row items-center justify-between">
      <div class="flex items-center gap-0.5">
        <label>{{ props.title }}</label>
        <div class="cursor-pointer" @click="model.enabled = !model.enabled">
          <i class="fa-solid" :class="model.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
        </div>
      </div>
      <!-- 音量 -->
      <div class="flex items-center gap-0.25">
        <div class="cursor-pointer" @click="model.muted = !model.muted">
          <i class="fa-solid" :class="[model.muted ? 'fa-volume-xmark' : 'fa-volume-low']"></i>
        </div>
        <!-- prettier-ignore-attribute -->
        <div
          class="
            relative h-[5px] w-4 cursor-pointer rounded-full border border-(--SmartThemeBorderColor) bg-(--black30a)
          "
        >
          <!-- prettier-ignore-attribute -->
          <div
            class="
              pointer-events-none absolute top-0 left-0 h-full rounded-full bg-(--SmartThemeBodyColor) transition-all
            "
            :style="{ width: `${model.volume}%` }"
          />
          <input
            v-model.number="model.volume"
            type="range"
            min="0"
            max="100"
            class="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0"
            :disabled="!props.enabled || !model.enabled"
          />
        </div>
      </div>
    </div>
    <!-- prettier-ignore-attribute -->
    <div
      class="
        flex items-center gap-[10px] rounded-sm border border-(--SmartThemeBorderColor)/50 bg-neutral-900/15 px-0.75
        py-0.25
      "
      :disabled="!props.enabled || !model.enabled"
    >
      <div>
        <button class="menu_button min-h-2 min-w-2" @click="model.playing = !model.playing">
          <i class="fa-solid" :class="[model_playing ? 'fa-pause' : 'fa-play']"></i>
        </button>
      </div>
      <div class="flex grow items-center">
        <input
          v-model="model.progress"
          type="range"
          value="0"
          min="0"
          max="100"
          :disabled="!props.enabled || !model.enabled"
        />
      </div>
    </div>
    <div class="flex grow items-center gap-0.25">
      <div class="grow">
        <select v-model="model.src" class="m-0! h-full" :disabled="!props.enabled || !model.enabled">
          <option v-for="item in model.playlist" :key="item.url" :value="item.url">
            {{ item.title }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-0.25">
        <div class="menu_button interactable" :title="t`播放列表`" @click="openPlayList">
          <i class="fa-solid fa-list-ol" />
        </div>
        <div
          class="menu_button interactable"
          :title="modeTitle"
          @click="model.mode = audio_mode_enum[(audio_mode_enum.indexOf(model.mode) + 1) % audio_mode_enum.length]"
        >
          <i class="fa-solid" :class="[modeIconClass]" />
        </div>
      </div>
    </div>
  </div>
  <audio v-show="false" ref="audio" controls @ended="onEnded"></audio>
</template>

<script setup lang="ts">
import PlayListEditor from '@/panel/toolbox/audio_player/PlayListEditor.vue';
import { audio_mode_enum, AudioMode } from '@/type/settings';
import { useTemplateRef } from 'vue';
import { useModal } from 'vue-final-modal';

const model = defineModel<{
  src: string;
  playing: boolean;
  progress: number;
  enabled: boolean;
  mode: AudioMode;
  muted: boolean;
  volume: number;
  playlist: { title: string; url: string }[];
}>({ required: true });

const props = defineProps<{
  title: string;
  enabled: boolean;
  audioType: 'bgm' | 'ambient';
}>();

const audio_ref = useTemplateRef('audio');
const controls = useMediaControls(audio_ref, { src: () => model.value.src });

const model_playing = computed({
  get: () => props.enabled && model.value.enabled && model.value.playing,
  set: value => {
    model.value.playing = value;
  },
});

const modeTitle = computed(() => {
  return (
    {
      repeat_all: t`重复播放所有曲目`,
      repeat_one: t`重复播放当前曲目`,
      shuffle: t`随机播放`,
      play_one_and_stop: t`播放当前曲目并停止`,
    }[model.value.mode] ?? ''
  );
});

const modeIconClass = computed(() => {
  return (
    {
      repeat_all: 'fa-repeat',
      repeat_one: 'fa-redo-alt',
      shuffle: 'fa-random',
      play_one_and_stop: 'fa-cancel',
    }[model.value.mode] ?? ''
  );
});

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

  syncRef(model_playing, controls.playing);
  syncRef(progress, controls_progress);
  syncRef(muted, controls.muted);
  syncRef(volume, controls.volume, { transform: { ltr: value => value / 100, rtl: value => value * 100 } });
}

// 监听 playlist 变化，自动选择第一个曲目
watchEffect(() => {
  if (!model.value.src && model.value.playlist.length > 0) {
    model.value.src = model.value.playlist[0].url;
  }
});

/**
 * 当前音频播放结束时的处理
 */
const onEnded = () => {
  controls.ended.value = false;
  model.value.progress = 0;

  switch (model.value.mode) {
    case 'repeat_one':
      model.value.playing = true;
      break;
    case 'repeat_all': {
      const current_index = model.value.playlist.findIndex(item => item.url === model.value.src);
      const next_index = (current_index + 1) % model.value.playlist.length;
      model.value.src = model.value.playlist[next_index].url;
      model.value.playing = true;
      break;
    }
    case 'shuffle': {
      model.value.src = _.sample(model.value.playlist)!.url;
      model.value.playing = true;
      break;
    }
    case 'play_one_and_stop':
      model.value.playing = false;
      break;
  }
};

function openPlayList() {
  useModal({
    component: PlayListEditor,
    attrs: {
      playlist: model.value.playlist,
      onSubmit: (value: { title: string; url: string }[]) => {
        model.value.playlist = value;
      },
    },
  }).open();
}
</script>
