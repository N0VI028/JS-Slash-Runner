import { purgeEmbeddedScripts } from '@/component/script_repository/data';
import { VueAppManager } from '@/component/script_repository/v2/mount';
import { tavern_events } from '@/function/event';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, event_types, eventSource, this_chid } from '@sillytavern/script';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { setActivePinia } from 'pinia';
import { loadTemplate } from './utils/templateLoader';

/**
 * 初始化脚本库
 */
export async function initializeVueScriptRepository(): Promise<void> {
  try {
    const vueAppManager = VueAppManager.getInstance();
    await vueAppManager.mount($('#script-settings-content'));

    console.log('[ScriptRepository] Vue应用挂载完成:', vueAppManager.isMounted());

    // 挂载全局事件监听（一次性）
    registerGlobalEventListeners();

    // 初始化后首轮自动启动：受总开关与各类型开关约束
    try {
      // 总开关优先：若未启用扩展，则直接跳过
      // @ts-ignore
      const extensionEnabled = getSettingValue('enabled_extension');
      if (!extensionEnabled) {
        return;
      }

      // 准备 Pinia 与 stores
      const pinia = vueAppManager.getPinia();
      if (!pinia) return;
      setActivePinia(pinia);

      const { useGlobalScriptStore, useCharacterScriptStore, usePresetScriptStore } = await import('./stores/factory');
      const { registerScriptWatchers } = await import('./utils/watchers');
      const globalStore = useGlobalScriptStore(pinia);
      const characterStore = useCharacterScriptStore(pinia);
      const presetStore = usePresetScriptStore(pinia);

      // 先加载各仓库数据
      await Promise.all([globalStore.init(), characterStore.init(), presetStore.init()]);

      // 注册一次性 Pinia watch（处理 enabled 切换副作用）
      await registerScriptWatchers(pinia);

      // 应用三类“类型开关”的依据：
      // - 全局：来自 script. 数据中的 global_script_enabled
      // - 角色：白名单/一次性弹窗逻辑（已有函数）
      // - 预设：来自自身扩展字段（init 已读出 enabled）

      const globalEnabledFlag = Boolean(getSettingValue('script.global_script_enabled'));
      await globalStore.setEnabled(globalEnabledFlag);

      // 角色：根据白名单/一次性弹窗逻辑设置 enabled
      await checkEmbeddedScriptsOnce(pinia);

      // 启动已启用脚本（受类型开关与脚本自身 enabled 共同约束）
      const { useScriptRuntime } = await import('./composables/useScriptRuntime');
      const runtime = useScriptRuntime();

      if (globalStore.enabled) {
        await runtime.toggleScriptsByType('global', true);
      }

      if (characterStore.enabled) {
        await runtime.toggleScriptsByType('character', true);
      }

      if (presetStore.enabled) {
        await runtime.toggleScriptsByType('preset', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository][V2] 初始化后首轮自动启动失败:', err);
    }
  } catch (error) {
    console.error('[ScriptRepository] 初始化Vue脚本库失败:', error);
  }
}

let v2EventsRegistered = false;

function registerGlobalEventListeners(): void {
  if (v2EventsRegistered) return;
  v2EventsRegistered = true;

  // 切换会话/角色时刷新，并严格执行：先停旧，后启新
  eventSource.makeFirst(event_types.CHAT_CHANGED, async () => {
    try {
      const vueAppManager = VueAppManager.getInstance();
      const pinia = vueAppManager.getPinia();
      if (!pinia) return;

      // 确保在非组件环境下可使用 stores
      setActivePinia(pinia);

      const { useScriptRuntime } = await import('./composables/useScriptRuntime');
      const runtime = useScriptRuntime();

      // 1) 先停止之前的角色脚本
      await runtime.toggleScriptsByType('character', false);

      // 2) 刷新仓库数据
      const { useGlobalScriptStore, useCharacterScriptStore } = await import('./stores/factory');
      const globalStore = useGlobalScriptStore(pinia);
      const characterStore = useCharacterScriptStore(pinia);
      await Promise.all([globalStore.init(), characterStore.init()]);

      // 3) 一次性弹窗与白名单校验，并设置开关状态
      await checkEmbeddedScriptsOnce(pinia);

      // 4) 再启用新角色脚本（不影响全局）
      if (characterStore.enabled) {
        await runtime.toggleScriptsByType('character', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository][V2] 处理角色切换失败:', err);
    }
  });

  // 角色删除时清理白名单/一次性提醒
  eventSource.makeFirst(event_types.CHARACTER_DELETED, (character: any) => purgeEmbeddedScripts({ character }));

  // 预设切换：先停旧，再读新，然后启用预设脚本
  eventSource.makeFirst(tavern_events.OAI_PRESET_CHANGED_BEFORE, async () => {
    try {
      const vueAppManager = VueAppManager.getInstance();
      const pinia = vueAppManager.getPinia();
      if (!pinia) return;
      setActivePinia(pinia);

      const { useScriptRuntime } = await import('./composables/useScriptRuntime');
      const runtime = useScriptRuntime();
      // 停止旧预设脚本
      await runtime.toggleScriptsByType('preset', false);

      // 刷新预设仓库并按持久化的 enabled 决定是否启用
      const { usePresetScriptStore } = await import('./stores/factory');
      const presetStore = usePresetScriptStore(pinia);
      await presetStore.init();
      if (presetStore.enabled) {
        await runtime.toggleScriptsByType('preset', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository][V2] 处理预设切换失败:', err);
    }
  });

  // 预设导入：如果包含脚本仓库则询问是否启用，并覆盖导入数据中的 enabled 值
  eventSource.makeFirst(tavern_events.OAI_PRESET_IMPORT_READY, async (result: { data: any; presetName: string }) => {
    try {
      const data = result?.data as any;
      if (!data || typeof data !== 'object') return;
      const ext = data.extensions || (data.extensions = {});
      const ths = ext['tavern_helper_scripts'];

      // 兼容两种格式：数组（旧）或对象 { repository, enabled }
      const repository: any[] = Array.isArray(ths)
        ? ths
        : ths && typeof ths === 'object' && Array.isArray(ths.repository)
        ? ths.repository
        : [];

      if (!Array.isArray(repository) || repository.length === 0) return;

      // 弹窗询问是否启用（复用角色弹窗模板）
      const html = await loadTemplate('script_allow_popup');
      const $template = $(html);
      const confirmed = await callGenericPopup($template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      const enabled = confirmed ? true : false;

      // 将导入数据规范化为对象并覆盖 enabled
      ext['tavern_helper_scripts'] = { repository, enabled };

      // 若导入后将默认使用该预设，则根据选择启动/不启动
      const vueAppManager = VueAppManager.getInstance();
      const pinia = vueAppManager.getPinia();
      if (pinia) {
        setActivePinia(pinia);
        const { useScriptRuntime } = await import('./composables/useScriptRuntime');
        const runtime = useScriptRuntime();
        // 先停再按选择启用（与切换流程一致，避免重复启用引发问题）
        await runtime.toggleScriptsByType('preset', false);
        if (enabled) {
          await runtime.toggleScriptsByType('preset', true);
        }
      }
    } catch (err) {
      console.warn('[ScriptRepository][V2] 处理预设导入失败:', err);
    }
  });

  // 预设导出：如检测到包含脚本仓库数据，则阻断流程并弹窗选择导出内容
  eventSource.makeFirst(tavern_events.OAI_PRESET_EXPORT_READY, async (preset: any) => {
    try {
      if (!preset || typeof preset !== 'object') return;

      const ext = (preset as any).extensions || ((preset as any).extensions = {});
      const ths = ext['tavern_helper_scripts'];
      const hasRepository =
        Array.isArray(ths) || (ths && typeof ths === 'object' && Array.isArray((ths as any).repository));

      if (!hasRepository) return;

      const message = '检测到预设包含脚本仓库数据。\n请选择导出内容：';
      const input = await callGenericPopup(message, POPUP_TYPE.TEXT, '', {
        okButton: '导出所有',
        cancelButton: '取消',
        customButtons: ['导出脚本', '导出正则', '不导出绑定数据'],
      });

      const choice = Number(input || 0);

      if (!choice) {
        toastr.info('已取消导出');
        throw new Error('[ScriptRepository][V2] Export cancelled by user');
      }

      (preset as any).__th_export_filter = (preset as any).__th_export_filter || {};

      if (choice === 1) {
        // 导出所有：不做处理
        (preset as any).__th_export_filter.skipBundles = false;
      } else if (choice === 2) {
        // 导出脚本：不导出绑定数据
        (preset as any).__th_export_filter.skipBundles = true;
        if (ext && ext['tavern_helper_preset_bundles']) {
          delete ext['tavern_helper_preset_bundles'];
        }
      } else if (choice === 3) {
        // 导出正则：暂未实现
        toastr.warning('“导出正则”暂未实现，已取消导出');
        throw new Error('[ScriptRepository][V2] Export regex-only not implemented');
      } else if (choice === 4) {
        // 不导出绑定数据
        (preset as any).__th_export_filter.skipBundles = true;
        if (ext && ext['tavern_helper_preset_bundles']) {
          delete ext['tavern_helper_preset_bundles'];
        }
      }
    } catch (err) {
      console.warn('[ScriptRepository][V2] 预设导出拦截处理失败:', err);
      throw err;
    }
  });
}

async function checkEmbeddedScriptsOnce(pinia: any): Promise<void> {
  try {
    // 基于头像的白名单与一次性提醒
    const avatar = (this_chid && (characters as any)?.[this_chid]?.avatar) || '';
    if (!avatar) return;

    const { useCharacterScriptStore } = await import('./stores/factory');
    const characterStore = useCharacterScriptStore(pinia);

    // 若无角色脚本则无需检查
    if (characterStore.allScripts.length === 0) {
      characterStore.setEnabled(false);
      return;
    }

    const allowList: string[] = getSettingValue('script.characters_with_scripts') || [];
    const isWhitelisted = allowList.includes(avatar);

    if (isWhitelisted) {
      characterStore.setEnabled(true);
      return;
    }

    const gateKey = `AlertScript_${avatar}`;
    if (!localStorage.getItem(gateKey)) {
      localStorage.setItem(gateKey, 'true');

      // 显示一次性弹窗
      const html = await loadTemplate('script_allow_popup');
      const $template = $(html);
      const result = await callGenericPopup($template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        if (!allowList.includes(avatar)) {
          allowList.push(avatar);
          saveSettingValue('script.characters_with_scripts', allowList);
        }
        characterStore.setEnabled(true);
      } else {
        characterStore.setEnabled(false);
      }
    } else {
      // 已出现过弹窗且未进入白名单，保持禁用
      characterStore.setEnabled(false);
    }
  } catch (err) {
    console.warn('[ScriptRepository][V2] 嵌入式脚本一次性检查失败:', err);
  }
}
