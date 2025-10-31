<template>
  <Popup v-model="isVisible" :buttons="popupButtons">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-center gap-0.5">
        <h3>列表编辑</h3>
        <div title="导入音频链接" class="menu_button menu_button_icon" @click="openImporter">
          <i class="fa-solid fa-file-import" />
        </div>
      </div>
      <div v-if="playlist.length === 0" class="text-center opacity-50">暂无音频</div>
      <VueDraggable
        v-model="playlist"
        handle=".TH-handle"
        class="flex flex-col"
        :animation="150"
        direction="vertical"
        item-key="id"
      >
        <div v-for="(item, index) in playlist" :key="item.url" class="flex items-center gap-0.5">
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
  onSubmit?: (playlist: { title: string; url: string }[]) => void;
}>();

const playlist = ref([...props.playlist]);

const popupButtons = computed(() => [
  {
    name: '确认',
    shouldEmphasize: true,
    onClick: submit,
  },
  { name: '取消' },
]);

const isVisible = ref(true);
const submit = (close: () => void) => {
  props.onSubmit?.(playlist.value);
  close();
};

const openImporter = () => {
  const { open: openImporterModal } = useModal({
    component: PlayListImporter,
    attrs: {
      onSubmit: (items: { title: string; url: string }[]) => {
        // 将导入的项目添加到播放列表末尾
        playlist.value.push(...items);
      },
    },
  });
  openImporterModal();
};

const openDeleteConfirm = (index: number) => {
  const { open: openDeleteConfirmModal } = useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`确定`,
          shouldEmphasize: true,
          onClick: (close: () => void) => {
            playlist.value.splice(index, 1);
            close();
          },
        },
        { name: t`取消` },
      ],
    },
    slots: {
      default: t`<div>确定要删除音频吗? 此操作无法撤销</div>`,
    },
  });
  openDeleteConfirmModal();
};

const editItem = (index: number) => {
  const { open: openEditor } = useModal({
    component: PlayListItemEditor,
    attrs: {
      item: playlist.value[index],
      onSubmit: (value: { title: string; url: string }) => {
        playlist.value[index] = value;
      },
    },
  });
  openEditor();
};
</script>
