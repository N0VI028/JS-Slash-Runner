<template>
  <div class="preset-scripts-panel">
    <div class="divider marginTop10 marginBot10"></div>
    <div class="extension-content-item">
      <div class="flex flexFlowColumn">
        <div class="flex alignItemsCenter">
          <div class="settings-title-text">预设脚本库</div>
        </div>
        <div class="settings-title-description">绑定到当前预设的脚本</div>
      </div>
    </div>
    <div class="flex-container flexFlowColumn alignItemsCenter">
      <div v-if="!currentPresetName" class="settings-title-description">请先切换到一个预设</div>
      <div
        v-else-if="!presetBundles || !presetBundles.scripts || presetBundles.scripts.length === 0"
        class="settings-title-description"
      >
        预设 "{{ currentPresetName }}" 暂无绑定脚本
      </div>
      <div v-else>
        <div class="settings-title-description">
          预设 "{{ currentPresetName }}" 绑定了 {{ boundScripts.length }} 个脚本
        </div>
        <div class="flex-container flexFlowColumn alignItemsCenter" style="gap: 5px; margin-top: 10px">
          <ScriptItem
            v-for="scriptData in boundScripts"
            :key="scriptData.script.id"
            :script="scriptData.script"
            style="width: 100%"
            @delete-script="handleRemoveFromPreset"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePresetBundlesStore } from '@/component/preset_manager/store/presetBundles.store';
import type { Script, ScriptType } from '@/component/script_repository/types';
import { ScriptType as ScriptTypeEnum } from '@/component/script_repository/types';
import ScriptItem from '@/component/script_repository/v2/components/ScriptItem.vue';

import { getPresetManager } from '@sillytavern/scripts/preset-manager';

import { computed } from 'vue';

// 使用 Pinia store
const store = usePresetBundlesStore();
const preset_manager = getPresetManager();

// 计算属性
const currentPresetName = computed(() => store.currentPresetName);

// 从预设扩展字段读取绑定脚本信息
const presetBundles = computed(() => {
  if (!currentPresetName.value) return null;

  try {
    const value = preset_manager.readPresetExtensionField({
      path: 'tavern_helper_preset_bundles',
    });

    return value || { scripts: [], regexes: [] };
  } catch (error) {
    console.error('[PresetScriptsPanel] Error reading preset extension field:', error);
    return { scripts: [], regexes: [] };
  }
});

// 获取绑定脚本的详细信息
const boundScripts = computed(() => {
  if (!presetBundles.value || !presetBundles.value.scripts || presetBundles.value.scripts.length === 0) {
    return [];
  }

  try {
    // 同步获取 ScriptManager 实例（假设它已经初始化）
    const { ScriptManager } = require('@/component/script_repository/script_controller');
    const scriptManager = ScriptManager.getInstance();
    const allGlobalScripts = scriptManager.getGlobalScripts();
    const allCharacterScripts = scriptManager.getCharacterScripts();

    const scripts: Array<{ script: Script; type: ScriptType }> = [];

    presetBundles.value.scripts.forEach((scriptId: string) => {
      const globalScript = allGlobalScripts.find((s: Script) => s.id === scriptId);
      const characterScript = allCharacterScripts.find((s: Script) => s.id === scriptId);

      if (globalScript) {
        scripts.push({ script: globalScript, type: ScriptTypeEnum.PRESET });
      } else if (characterScript) {
        scripts.push({ script: characterScript, type: ScriptTypeEnum.PRESET });
      }
    });

    return scripts;
  } catch (error) {
    console.error('[PresetScriptsPanel] Error loading scripts:', error);
    return [];
  }
});

// 处理从预设中删除脚本（v2版本的事件处理）
const handleRemoveFromPreset = async (scriptId: string) => {
  try {
    if (!currentPresetName.value) {
      console.error('[PresetScriptsPanel] No current preset name');
      return;
    }

    // 获取当前预设的扩展字段数据
    const currentBundles = presetBundles.value || { scripts: [], regexes: [] };

    // 从绑定列表中移除脚本
    const updatedScripts = currentBundles.scripts.filter((id: string) => id !== scriptId);
    const updatedBundles = {
      ...currentBundles,
      scripts: updatedScripts,
    };

    // 更新预设扩展字段
    await preset_manager.writePresetExtensionField({
      path: 'tavern_helper_preset_bundles',
      value: updatedBundles,
    });

    console.log(`[PresetScriptsPanel] Removed script ${scriptId} from preset ${currentPresetName.value}`);

    // 显示成功消息（如果toastr可用）
    if (typeof (window as any).toastr !== 'undefined') {
      (window as any).toastr.success(`已从预设 "${currentPresetName.value}" 中移除脚本`);
    }
  } catch (error) {
    console.error('[PresetScriptsPanel] Error removing script from preset:', error);

    // 显示错误消息（如果toastr可用）
    if (typeof (window as any).toastr !== 'undefined') {
      (window as any).toastr.error('从预设中移除脚本失败');
    }
  }
};
</script>

<style scoped>
.preset-scripts-panel {
  width: 100%;
}
</style>
