<template>
  <!-- prettier-ignore -->
  <Popup v-model="isVisible" :buttons="popupButtons">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-center gap-0.5">
        <strong>列表编辑</strong>
        <div title="导入音频链接" class="menu_button menu_button_icon">
          <i class="fa-solid fa-file-import"></i>
        </div>
      </div>
        <VueDraggable
          v-model="playlist"
          handle=".TH-handle"
          class="flex flex-col"
          direction="vertical"
          item-key="id"
        >
          <div v-for="(item, index) in playlist" :key="item.url" class="flex items-center justify-between gap-0.5">
            <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>
            <div
              class="
                flex grow items-center gap-0.5 rounded border border-[var(--SmartThemeBorderColor)] px-0.5 py-[1px]
              "
            >
              <span>{{ index + 1 }}. {{ item.title ? item.title : item.url }}</span>
            </div>
            <button class="menu_button interactable self-end" @click="editItem(index)"><i class="fa-solid fa-pencil"></i></button>
            <button class="menu_button interactable self-end bg-(--crimson70a)!" @click="openDeleteConfirm(index)"><i
class="fa-solid fa-trash"></i></button>
          </div>
        </VueDraggable>
      </div>
  </Popup>
</template>
<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import PlayListItemEditor from '@/panel/toolbox/audio_player/PlayListItemEditor.vue';
const props = defineProps<{
  playlist: { url: string; title?: string }[];
  onSubmit?: (playlist: { url: string; title?: string }[]) => void;
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
      onSubmit: (value: { url: string; title?: string }) => {
        playlist.value[index] = value;
      },
    },
  });
  openEditor();
};
</script>
