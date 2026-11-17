<template>
  <Item type="box" gap="0.25">
    <div class="flex flex-col gap-0.5">
      <Toolbar class="flex flex-wrap gap-0.5" />
      <SearchBar
        v-model="search_input"
        class="flex flex-wrap items-center gap-0.5"
        :placeholder="t`搜索（支持普通和/正则/）`"
        clearable
      />
    </div>
    <Divider />
    <Container v-model="global_scripts" :title="t`全局脚本`" :description="t`酒馆全局可用`" target="global" />

    <template v-if="character_avatar !== undefined">
      <Divider />
      <Container
        v-model="character_scripts"
        :title="t`角色脚本`"
        :description="t`绑定到当前角色卡`"
        target="character"
      />
    </template>

    <Divider />
    <Container v-model="preset_scripts" :title="t`预设脚本`" :description="t`绑定到当前预设`" target="preset" />

    <Divider />
    <div class="flex flex-col gap-0.5">
      <label class="font-bold" for="TH-worldbook-script-select">{{ t`世界书脚本` }}</label>
      <select
        id="TH-worldbook-script-select"
        v-model="worldbook_scripts.selected_name"
        class="text_pole"
        :disabled="worldbook_selection_locks > 0"
      >
        <option value="">{{ t`选择世界书` }}</option>
        <optgroup v-for="group in worldbook_scripts.groups" :key="group.label" :label="group.label">
          <option v-for="name in group.names" :key="name" :value="name">
            {{ name }} ({{ worldbook_scripts.script_counts[name] ?? 0 }})
          </option>
        </optgroup>
      </select>
    </div>
    <Container
      v-if="worldbook_scripts.selected_name"
      v-model="worldbook_scripts"
      :title="worldbook_scripts.selected_name"
      :description="worldbook_scripts.enabled ? t`随世界书绑定状态自动启用` : t`当前未启用；随世界书绑定状态变化`"
      target="worldbook"
    />
    <div v-else class="py-1 text-center opacity-60">{{ t`请选择一个世界书以查看和管理脚本` }}</div>

    <Teleport to="body">
      <Iframe
        v-for="script in runtimes"
        :id="script.id"
        :key="script.source + script.id + script.reload_memo"
        :name="script.name"
        :content="script.content"
        :use-blob-url="use_blob_url"
        :use-cleanup-protector="use_cleanup_protector"
      />
    </Teleport>

    <Teleport v-if="!!button_element" defer :to="button_element">
      <div
        v-for="(buttons, script_id) in button_map"
        :id="`script_container_${script_id}`"
        :key="script_id"
        class="qr--buttons flex gap-[5px]"
      >
        <div
          v-for="button in buttons"
          :key="button.button_id"
          class="qr--button menu_button interactable"
          @click.stop.prevent="eventSource.emit(button.button_id)"
          @pointerdown.prevent
        >
          {{ button.button_name }}
        </div>
      </div>
    </Teleport>
  </Item>
</template>

<script setup lang="ts">
import Container from '@/panel/script/Container.vue';
import Iframe from '@/panel/script/Iframe.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { useWorldbookScriptsStore } from '@/store/worldbook_scripts';
import { useButtonDestinationElement } from '@/panel/script/use_button_destination_element';
import { useCheckEnablementPopup } from '@/panel/script/use_check_enablement_popup';
import { useResolveIdConflict } from '@/panel/script/use_resolve_id_conflict';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { eventSource } from '@sillytavern/script';

const search_input = ref<RegExp | null>(null);
provide('search_input', search_input);
provide('during_sorting_item', ref(false));

const { name: preset_name } = storeToRefs(usePresetSettingsStore());
const { avatar: character_avatar } = storeToRefs(useCharacterSettingsStore());

const global_settings = useGlobalSettingsStore();
const global_scripts = useGlobalScriptsStore();
const preset_scripts = usePresetScriptsStore();
const character_scripts = useCharacterScriptsStore();
const worldbook_scripts = useWorldbookScriptsStore();
const worldbook_selection_locks = ref(0);
provide('worldbook_selection_locks', worldbook_selection_locks);

onMounted(() => {
  void worldbook_scripts.refresh().catch(error => {
    console.error(error);
    toastr.error((error as Error).message, t`读取世界书脚本失败`);
  });
});

useResolveIdConflict(preset_name, character_avatar, global_scripts, preset_scripts, character_scripts, worldbook_scripts);
useCheckEnablementPopup(preset_name, character_avatar, global_settings, preset_scripts, character_scripts);

const { runtimes, button_map } = toRefs(useScriptIframeRuntimesStore());
const { use_blob_url, use_cleanup_protector } = toRefs(useGlobalSettingsStore().settings.render);

const button_element = useButtonDestinationElement();
</script>
