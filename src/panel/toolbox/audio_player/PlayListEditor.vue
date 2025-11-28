<template>
  <Popup
    :buttons="[
      {
        name: t`确认`,
        shouldEmphasize: true,
        onClick: submit,
      },
      { name: t`取消` },
    ]"
  >
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-center gap-0.5">
        <h3>{{ t`列表编辑` }}</h3>
        <div :title="t`导入音频链接`" class="menu_button menu_button_icon" @click="openImporter">
          <i class="fa-solid fa-file-import" />
        </div>
      </div>
      <div v-if="model.length === 0" class="text-center opacity-50">{{ t`暂无音频` }}</div>
      <VueDraggable
        v-model="model"
        handle=".TH-handle"
        class="flex flex-col"
        :animation="150"
        direction="vertical"
        item-key="id"
      >
        <div v-for="(item, index) in model" :key="item.url" class="flex items-center gap-0.5">
          <span class="TH-handle shrink-0 cursor-grab select-none active:cursor-grabbing">☰</span>
          <!-- prettier-ignore-attribute -->
          <div
            class="flex min-w-0 grow items-center gap-0.5 rounded border border-(--SmartThemeBorderColor) px-0.5 py-px"
          >
            <span class="overflow-hidden break-all text-ellipsis whitespace-nowrap hover:whitespace-normal">
              {{ item.title }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <button class="menu_button interactable" @click="editItem(index)">
              <i class="fa-solid fa-pencil" />
            </button>
            <button class="menu_button interactable bg-(--crimson70a)!" @click="openDeleteConfirm(index)">
              <i class="fa-solid fa-trash" />
            </button>
          </div>
        </div>
      </VueDraggable>
    </div>
  </Popup>
</template>
<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import PlayListImporter from '@/panel/toolbox/audio_player/PlayListImporter.vue';
import PlayListItemEditor from '@/panel/toolbox/audio_player/PlayListItemEditor.vue';

const props = defineProps<{
  playlist: { title: string; url: string }[];
  onSubmit: (playlist: { title: string; url: string }[]) => void;
}>();

const model = ref(klona(props.playlist));

function submit(close: () => void) {
  props.onSubmit(model.value);
  close();
}

function openImporter() {
  useModal({
    component: PlayListImporter,
    attrs: {
      onSubmit: (items: { title: string; url: string }[]) => {
        // 将导入的项目添加到播放列表末尾
        model.value.push(...items);
      },
    },
  }).open();
}

function openDeleteConfirm(index: number) {
  useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`确认`,
          shouldEmphasize: true,
          onClick: (close: () => void) => {
            model.value.splice(index, 1);
            close();
          },
        },
        { name: t`取消` },
      ],
    },
    slots: {
      default: t`<div>确定要删除音频吗? 此操作无法撤销</div>`,
    },
  }).open();
}

function editItem(index: number) {
  useModal({
    component: PlayListItemEditor,
    attrs: {
      item: model.value[index],
      onSubmit: (value: { title: string; url: string }) => {
        model.value[index] = value;
      },
    },
  }).open();
}
</script>
