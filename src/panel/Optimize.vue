<template>
  <div class="flex flex-col gap-0.75">
    <DefineOptimize v-slot="{ title, name }">
      <Item type="plain">
        <template #title>
          {{ title }}
          <i class="fa-solid fa-circle-question note-link-span" @click.stop="showHelp(name)" />
        </template>
        <template #content>
          <Toggle
            :id="`TH-optimize--${name}`"
            v-model="store.settings.optimize[name as keyof typeof store.settings.optimize]"
          />
        </template>
      </Item>
    </DefineOptimize>

    <Item type="box">
      <template #legend><i class="fa-solid fa-gamepad th-text-xs!" />{{ t`性能` }}</template>
      <div class="flex flex-col">
        <Optimize :title="t`[要加载 # 条消息] → [要渲染 # 条消息]`" name="better_message_to_load" />
      </div>
    </Item>

    <Item type="box">
      <template #legend><i class="fa-solid fa-address-card th-text-xs!" /> {{ t`角色卡` }}</template>
      <div class="flex flex-col">
        <Optimize :title="t`使用[替换/更新角色卡]功能时更新世界书`" name="better_character_update" />
        <Divider />
        <Optimize :title="t`导出角色卡时始终携带最新世界书`" name="better_character_export" />
      </div>
    </Item>

    <Item type="box">
      <template #legend><i class="fa-solid fa-book th-text-xs!" /> {{ t`世界书` }}</template>
      <div class="flex flex-col">
        <Optimize :title="t`强制使用推荐的世界书全局设置`" name="force_recommended_worldbook_global_settings" />
      </div>
    </Item>

    <Item type="box">
      <template #legend><i class="fa-solid fa-sliders th-text-xs!" /> {{ t`预设` }}</template>
      <div class="flex flex-col">
        <Optimize :title="t`最大化预设上下文长度`" name="maximize_preset_context_length" />
      </div>
    </Item>

    <Item type="box">
      <template #legend><i class="fa-solid fa-bucket th-text-xs!" /> {{ t`杂项` }}</template>
      <div class="flex flex-col">
        <Optimize :title="t`禁用不兼容选项`" name="disable_incompatible_option" />
      </div>
    </Item>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import { useBetterCharacterDeletion } from '@/panel/optimize/better_character_deletion';
import { useBetterMessageToLoad } from '@/panel/optimize/better_message_to_load';
import { useDisableIncompatibleOption } from '@/panel/optimize/disable_incompatible_option';
import { useForceRecommendedWorldbookGlobalSettings } from '@/panel/optimize/force_recommended_worldbook_global_settings';
import { useMaximizePresetContextLength } from '@/panel/optimize/maximize_preset_context_length';
import { useSavePresetWhenSavingPresetEntries } from '@/panel/optimize/save_preset_when_saving_preset_entries';
import { useGlobalSettingsStore } from '@/store/settings';
import { renderMarkdown } from '@/util/tavern';
import { getCurrentLocale } from '@sillytavern/scripts/i18n';
import { createReusableTemplate } from '@vueuse/core';

const [DefineOptimize, Optimize] = createReusableTemplate<{
  title: string;
  name: keyof typeof store.settings.optimize;
}>();

const store = useGlobalSettingsStore();
useBetterMessageToLoad(toRef(() => store.settings.optimize.better_message_to_load));
useBetterCharacterDeletion(toRef(() => store.settings.optimize.better_character_deletion));
useForceRecommendedWorldbookGlobalSettings(
  toRef(() => store.settings.optimize.force_recommended_worldbook_global_settings),
);
useSavePresetWhenSavingPresetEntries(toRef(() => store.settings.optimize.save_preset_when_saving_preset_entries));
useMaximizePresetContextLength(toRef(() => store.settings.optimize.maximize_preset_context_length));
useDisableIncompatibleOption(toRef(() => store.settings.optimize.disable_incompatible_option));

async function getHelp(name: keyof typeof store.settings.optimize): Promise<string> {
  const response = await fetch(
    `https://testingcf.jsdelivr.net/gh/N0VI028/JS-Slash-Runner/src/panel/optimize/${name}/${getCurrentLocale().includes('zh') ? 'zh' : 'en'}.md`,
  );
  if (!response.ok) {
    return `获取帮助信息失败: (${response.status}) ${await response.text()}`;
  }
  return response.text();
}

async function showHelp(name: keyof typeof store.settings.optimize) {
  toastr.info(t`正在加载说明...`);
  useModal({
    component: Popup,
    attrs: {
      width: 'wide',
      buttons: [{ name: t`关闭` }],
      onOpened: () => {
        toastr.clear();
      },
    },
    slots: {
      default: `<div class="p-1.5 text-left">${renderMarkdown(await getHelp(name))}</div>`,
    },
  }).open();
}
</script>
