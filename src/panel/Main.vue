<template>
  <Item type="plain">
    <template #title>
      <div class="flex items-center gap-0.5">
        <span>{{ t`版本更新` }}</span>
        <div
          v-if="has_update"
          class="rounded-full bg-(--SmartThemeQuoteColor) px-0.5 th-text-xs font-medium"
          :style="{ color: getSmartThemeQuoteTextColor() }"
        >
          {{ t`最新：Ver ${latest_version}` }}
        </div>
      </div>
    </template>
    <template #description>{{ t`当前版本: ${current_version}` }}</template>
    <template #content>
      <Button @click="openUpdateModal">{{ t`更新` }}</Button>
    </template>
  </Item>
  <Divider type="major">
    <i class="fa-solid fa-tools mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`开发工具` }}</div>
  </Divider>
  <div class="flex flex-col gap-0.75">
    <Listener />
    <Reference />
    <MacroLike />
  </div>
  <Divider type="major">
    <i class="fa-solid fa-shapes mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`扩展信息` }}</div>
  </Divider>
  <Info />
</template>

<script setup lang="ts">
import { getTavernHelperVersion } from '@/function/version';
import Info from '@/panel/main/Info.vue';
import Listener from '@/panel/main/Listener.vue';
import MacroLike from '@/panel/main/MacroLike.vue';
import Reference from '@/panel/main/Reference.vue';
import { getLatestVersion, hasUpdate } from '@/panel/main/update';
import Update from '@/panel/main/Update.vue';
import { getSmartThemeQuoteTextColor } from '@/util/color';

const current_version = getTavernHelperVersion();
const has_update = ref(false);
const latest_version = ref('');
onMounted(async () => {
  has_update.value = await hasUpdate();
  if (has_update.value) {
    latest_version.value = await getLatestVersion();
  }
});

const { open: openUpdateModal } = useModal({
  component: Update,
});
</script>
