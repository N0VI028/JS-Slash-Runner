/**
 * 预设绑定面板挂载
 * 负责将 Vue 组件挂载到现有 DOM 节点
 */

import PresetRegexPanel from '@/component/preset_manager/components/PresetRegexPanel.vue';
import PresetScriptsPanel from '@/component/preset_manager/components/PresetScriptsPanel.vue';
import log from 'loglevel';
import { Pinia } from 'pinia';
import { createApp } from 'vue';

// 存储 Vue 应用实例，用于后续清理
let scriptPanelApp: any = null;
let regexPanelApp: any = null;

/**
 * 挂载预设绑定面板到指定 DOM 位置
 */
export function mountPresetPanels(pinia: Pinia): void {
  try {
    // 等待 DOM 准备就绪后挂载
    setTimeout(() => {
      mountScriptPanel(pinia);
      mountRegexPanel(pinia);
    }, 1000);

    log.info('[PresetBundles] 脚本和正则预设面板挂载成功');
  } catch (error) {
    log.error('[PresetBundles] 脚本和正则预设面板挂载失败:', error);
    toastr.error('[PresetBundles] 脚本和正则预设面板挂载失败:');
  }
}

/**
 * 卸载预设绑定面板
 */
export function unmountPresetPanels(): void {
  console.log('[PresetBundles] Unmounting Vue panels...');

  try {
    if (scriptPanelApp) {
      scriptPanelApp.unmount();
      scriptPanelApp = null;
    }

    if (regexPanelApp) {
      regexPanelApp.unmount();
      regexPanelApp = null;
    }

    // 清理 DOM 节点
    const scriptPanel = document.getElementById('preset-script-panel');
    if (scriptPanel) {
      scriptPanel.remove();
    }

    const regexPanel = document.getElementById('preset-regex-panel');
    if (regexPanel) {
      regexPanel.remove();
    }

    console.log('[PresetBundles] Vue panels unmounted successfully');
  } catch (error) {
    console.error('[PresetBundles] Error unmounting Vue panels:', error);
  }
}

/**
 * 挂载脚本预设面板
 */
function mountScriptPanel(pinia: Pinia): void {
  // 查找脚本库容器
  const scriptContainer = $('#script-settings-content');
  if (!scriptContainer) {
    console.warn('[PresetBundles] Script repository container not found');
    return;
  }

  // 清理已存在的面板
  const existingPanel = $('#preset-script-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // 创建预设脚本面板挂载点
  const presetScriptPanel = $('<div>').attr('id', 'preset-script-panel');

  // 插入到角色脚本库后面
  scriptContainer.append(presetScriptPanel);

  // 创建并挂载 Vue 应用
  try {
    scriptPanelApp = createApp(PresetScriptsPanel);
    scriptPanelApp.use(pinia);

    scriptPanelApp.mount(presetScriptPanel[0]);
  } catch (error) {
    log.error('[PresetBundles] 脚本预设面板挂载失败:', error);
    toastr.error('[PresetBundles] 脚本预设面板挂载失败:');
  }
}

/**
 * 挂载正则预设面板
 */
function mountRegexPanel(pinia: Pinia): void {
  // 查找脚本库容器 - 暂时在脚本库后面添加正则面板
  const regexContainer = $('#regex_container .inline-drawer-content');
  if (!regexContainer) {
    log.warn('[PresetBundles] 正则库容器未找到');
    return;
  }

  // 清理已存在的面板
  const existingPanel = $('#preset-regex-block');
  if (existingPanel) {
    existingPanel.remove();
  }
  const presetRegexPanel = $('<div>').attr('id', 'preset-regex-block');
  // 插入到正则库后面
  regexContainer.append(presetRegexPanel);

  // 创建并挂载 Vue 应用
  try {
    regexPanelApp = createApp(PresetRegexPanel);
    regexPanelApp.use(pinia);

    regexPanelApp.mount(presetRegexPanel[0]); // Vue 的 mount() 方法需要的是原生DOM元素或CSS选择符字符串
  } catch (error) {
    log.error('[PresetBundles] 正则预设面板挂载失败:', error);
    toastr.error('[PresetBundles] 正则预设面板挂载失败:');
  }
}
