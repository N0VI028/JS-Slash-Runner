/**
 * 预设绑定功能入口
 * 负责初始化 store、事件、挂载 UI
 */

import { mountPresetPanels } from '@/component/preset_manager/mount/mountPresetPanels';
import { usePresetBundlesStore } from '@/component/preset_manager/store/presetBundles.store';
import { createPinia } from 'pinia';

// 全局 Pinia 实例
let globalPinia: ReturnType<typeof createPinia> | null = null;

/**
 * 初始化预设绑定功能
 */
export async function initPresetBundles(): Promise<void> {
  try {
    console.log('[PresetBundles] Initializing preset bundles system...');

    // 创建全局 Pinia 实例
    globalPinia = createPinia();

    // 在 Pinia 实例上下文中创建 store
    const store = usePresetBundlesStore(globalPinia);

    // 执行初始化健康检查和自动修复
    try {
      const healthCheck = await store.performHealthCheck();
      if (!healthCheck.isHealthy) {
        console.warn('[PresetBundles] System health issues detected, attempting auto repair...');
        const repairSuccess = await store.autoRepair();
        if (!repairSuccess) {
          console.warn('[PresetBundles] Auto repair failed, system may have reduced functionality');
          if (typeof toastr !== 'undefined') {
            toastr.warning('预设绑定系统检测到问题，部分功能可能受影响');
          }
        }
      }
    } catch (healthError) {
      console.error('[PresetBundles] Health check failed during initialization:', healthError);
    }

    // 事件迁移到 v2 脚本库处理，此处不再注册脚本相关事件

    // 挂载 UI（仅正则）
    mountPresetPanels(globalPinia);

    console.log('[PresetBundles] Initialization completed successfully');
  } catch (error) {
    console.error('[PresetBundles] Failed to initialize preset bundles system:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('预设绑定系统初始化失败');
    }
    throw error;
  }
}

/**
 * 获取全局 Pinia 实例
 */
export function getGlobalPinia() {
  return globalPinia;
}

/**
 * 清理预设绑定系统
 */
export function cleanupPresetBundles(): void {
  try {
    console.log('[PresetBundles] Cleaning up preset bundles system...');

    // 取消事件注册
    if (globalPinia) {
      // 这里可以添加 unregisterPresetBundleEvents 调用
      console.log('[PresetBundles] Events will be cleaned up automatically');
    }

    // 卸载 UI 面板
    try {
      // 动态导入以避免循环依赖
      import('./mount/mountPresetPanels').then(({ unmountPresetPanels }) => {
        unmountPresetPanels();
      });
    } catch (error) {
      console.warn('[PresetBundles] Error unmounting UI panels:', error);
    }

    // 清理全局 Pinia 实例
    globalPinia = null;

    console.log('[PresetBundles] Cleanup completed');
  } catch (error) {
    console.error('[PresetBundles] Error during cleanup:', error);
  }
}

export * from '@/component/preset_manager/store/presetBundles.store';
export * from '@/component/preset_manager/types';
