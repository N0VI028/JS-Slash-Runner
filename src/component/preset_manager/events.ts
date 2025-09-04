/**
 * 预设绑定功能事件处理
 * 负责监听和处理 tavern 事件
 */

import { eventSource } from '@sillytavern/script';
import { tavern_events, type ListenerType } from '@/function/event';
import { type PresetBundlesStore } from '@/component/preset_manager/store/presetBundles.store';

// 存储事件监听器引用，用于后续清理
const eventListeners: {
  presetChangedBefore?: ListenerType[typeof tavern_events.OAI_PRESET_CHANGED_BEFORE];
  presetExportReady?: ListenerType[typeof tavern_events.OAI_PRESET_EXPORT_READY];
  presetImportReady?: ListenerType[typeof tavern_events.OAI_PRESET_IMPORT_READY];
} = {};

/**
 * 注册预设绑定相关事件
 */
export function registerPresetBundleEvents(store: PresetBundlesStore): void {
  console.log('[PresetBundles] Registering events...');

  // 1. 监听预设切换事件 - 在预设切换前应用绑定
  eventListeners.presetChangedBefore = async (
    result: Parameters<ListenerType[typeof tavern_events.OAI_PRESET_CHANGED_BEFORE]>[0],
  ) => {
    try {
      const { presetName } = result;
      console.log(`[PresetBundles] Preset changing to: ${presetName}`);

      // 更新当前预设名
      store.setCurrentPreset(presetName);

      // 应用该预设的绑定
      await store.applyBindings(presetName);

      // Vue 组件会自动响应状态变化，无需手动更新 UI
    } catch (error) {
      console.error('[PresetBundles] Error applying bindings on preset change:', error);
      // 使用 toastr 提示用户，但不中断主流程
      if (typeof toastr !== 'undefined') {
        toastr.error(`预设绑定应用失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // 2. 监听预设导出事件 - 注入绑定数据到扩展命名空间
  eventListeners.presetExportReady = async (
    preset: Parameters<ListenerType[typeof tavern_events.OAI_PRESET_EXPORT_READY]>[0],
  ) => {
    try {
      console.log('[PresetBundles] Preset export ready, injecting bundle data...');

      // 获取当前预设的绑定数据
      const currentPresetName = store.currentPresetName;
      if (currentPresetName) {
        const exportData = await store.toExportObject(currentPresetName);

        // 确保 extensions 对象存在
        if (!(preset as any).extensions) {
          (preset as any).extensions = {};
        }

        // 写入到专用命名空间
        (preset as any).extensions['tavern_helper_preset_bundles'] = exportData;
        console.log('[PresetBundles] Bundle data injected to preset export');
      }
    } catch (error) {
      console.error('[PresetBundles] Error injecting bundle data to preset export:', error);
      if (typeof toastr !== 'undefined') {
        toastr.error(`预设绑定导出失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // 3. 监听预设导入事件 - 读取扩展数据并恢复绑定
  eventListeners.presetImportReady = async (
    result: Parameters<ListenerType[typeof tavern_events.OAI_PRESET_IMPORT_READY]>[0],
  ) => {
    try {
      console.log('[PresetBundles] Preset import ready, reading bundle data...');

      const { data, presetName } = result;

      // 读取扩展命名空间数据
      const bundleData = (data as any).extensions?.['tavern_helper_preset_bundles'];
      if (bundleData) {
        console.log(`[PresetBundles] Found bundle data for preset: ${presetName}`);

        // 导入绑定数据
        await store.imported(bundleData);
        console.log('[PresetBundles] Bundle data imported successfully');

        // 可选：提示用户导入成功
        if (typeof toastr !== 'undefined') {
          toastr.success(`预设 "${presetName}" 的绑定数据已导入`);
        }
      } else {
        console.log(`[PresetBundles] No bundle data found for preset: ${presetName}`);
      }
    } catch (error) {
      console.error('[PresetBundles] Error importing bundle data:', error);
      if (typeof toastr !== 'undefined') {
        toastr.error(`预设绑定导入失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // 注册所有事件监听器
  eventSource.on(tavern_events.OAI_PRESET_CHANGED_BEFORE, eventListeners.presetChangedBefore);
  eventSource.on(tavern_events.OAI_PRESET_EXPORT_READY, eventListeners.presetExportReady);
  eventSource.on(tavern_events.OAI_PRESET_IMPORT_READY, eventListeners.presetImportReady);

  console.log('[PresetBundles] Events registered successfully');
}

/**
 * 取消注册预设绑定相关事件
 */
export function unregisterPresetBundleEvents(): void {
  console.log('[PresetBundles] Unregistering events...');

  // 移除所有事件监听器
  if (eventListeners.presetChangedBefore) {
    eventSource.removeListener(tavern_events.OAI_PRESET_CHANGED_BEFORE, eventListeners.presetChangedBefore);
    eventListeners.presetChangedBefore = undefined;
  }

  if (eventListeners.presetExportReady) {
    eventSource.removeListener(tavern_events.OAI_PRESET_EXPORT_READY, eventListeners.presetExportReady);
    eventListeners.presetExportReady = undefined;
  }

  if (eventListeners.presetImportReady) {
    eventSource.removeListener(tavern_events.OAI_PRESET_IMPORT_READY, eventListeners.presetImportReady);
    eventListeners.presetImportReady = undefined;
  }

  console.log('[PresetBundles] Events unregistered successfully');
}
