import { useScriptRuntime } from '@/component/script_repository/composables/useScriptRuntime';
import { ScriptRepositoryManager } from '@/component/script_repository/mount';
import type { ScriptRepository } from '@/component/script_repository/schemas/script.schema';
import { purgeEmbeddedScripts } from '@/component/script_repository/services/repository.service';
import {
  loadAllRepositories,
  useCharacterScriptStore,
  useGlobalScriptStore,
  usePresetScriptStore,
} from '@/component/script_repository/stores/factory';
import { registerScriptWatchers } from '@/component/script_repository/utils/watchers';
import { tavern_events } from '@/function/event';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, event_types, eventSource, setCharacterId, this_chid } from '@sillytavern/script';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { setActivePinia } from 'pinia';
/**
 * 初始化脚本库
 */
export async function initializeScriptRepository(): Promise<void> {
  try {
    const scriptRepositoryManager = ScriptRepositoryManager.getInstance();
    await scriptRepositoryManager.mount($('#script-settings-content'));

    registerGlobalEventListeners();

    try {
      // @ts-ignore
      const extensionEnabled = getSettingValue('enabled_extension');
      if (!extensionEnabled) {
        return;
      }

      const pinia = scriptRepositoryManager.getPinia();
      if (!pinia) return;
      setActivePinia(pinia);

      const globalStore = useGlobalScriptStore(pinia);
      const presetStore = usePresetScriptStore(pinia);

      await loadAllRepositories();

      const globalEnabledFlag = Boolean(getSettingValue('script.global_script_enabled'));
      globalStore.initEnabled(globalEnabledFlag);

      const presetManager = getPresetManager();
      // @ts-ignore
      const presetExtension = presetManager.readPresetExtensionField({ path: 'tavern_helper_scripts' });
      const presetEnabledFlag = Boolean(presetExtension?.enabled);
      presetStore.initEnabled(presetEnabledFlag);

      // 角色脚本的初始状态在 checkEmbeddedScriptsOnce 中处理

      await registerScriptWatchers(pinia);

      // 启动已启用脚本（受类型开关与脚本自身 enabled 共同约束）
      const runtime = useScriptRuntime();

      if (globalStore.enabled) {
        await runtime.toggleScriptsByType('global', true);
      }

      // 角色脚本的启动逻辑移动到 CHAT_CHANGED 事件中处理

      if (presetStore.enabled) {
        await runtime.toggleScriptsByType('preset', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository] 初始化后首轮自动启动失败:', err);
    }
  } catch (error) {
    console.error('[ScriptRepository] 初始化脚本库失败:', error);
  }
}

let EventsRegistered = false;

function registerGlobalEventListeners(): void {
  if (EventsRegistered) return;
  EventsRegistered = true;

  // 切换会话/角色时刷新
  eventSource.makeFirst(event_types.CHAT_CHANGED, async () => {
    try {
      const vueAppManager = ScriptRepositoryManager.getInstance();
      const pinia = vueAppManager.getPinia();
      if (!pinia) return;

      setActivePinia(pinia);

      const runtime = useScriptRuntime();

      const chid = this_chid;
      setCharacterId(undefined); // 想找切换前的 chid 太难了, 临时改为空试试
      await runtime.toggleScriptsByType('character', false);
      setCharacterId(chid);

      const characterStore = useCharacterScriptStore(pinia);
      await characterStore.loadRepository();

      const shouldEnableCharacterScripts = await checkEmbeddedScriptsOnce(pinia);

      if (shouldEnableCharacterScripts) {
        await runtime.toggleScriptsByType('character', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository] 处理角色切换失败:', err);
    }
  });

  /**
   * 角色删除时清理白名单/一次性提醒
   */
  eventSource.makeFirst(event_types.CHARACTER_DELETED, (character: any) => purgeEmbeddedScripts({ character }));

  /**
   * 预设切换
   */
  eventSource.makeLast(tavern_events.OAI_PRESET_CHANGED_AFTER, async () => {
    try {
      const vueAppManager = ScriptRepositoryManager.getInstance();
      const pinia = vueAppManager.getPinia();
      if (!pinia) return;
      setActivePinia(pinia);

      const runtime = useScriptRuntime();
      await runtime.toggleScriptsByType('preset', false);

      const presetStore = usePresetScriptStore(pinia);
      await presetStore.loadRepository();

      const presetManager = getPresetManager();
      // @ts-ignore
      const presetExtension = presetManager.readPresetExtensionField({ path: 'tavern_helper_scripts' });
      const presetEnabledFlag = Boolean(presetExtension?.enabled);
      presetStore.initEnabled(presetEnabledFlag);

      if (presetStore.enabled) {
        await runtime.toggleScriptsByType('preset', true);
      }
    } catch (err) {
      console.warn('[ScriptRepository] 处理预设切换失败:', err);
    }
  });

  /**
   * 预设导入：如果包含脚本仓库则询问是否启用，并覆盖导入数据中的 enabled 值
   */
  eventSource.makeFirst(tavern_events.OAI_PRESET_IMPORT_READY, async (result: { data: any; presetName: string }) => {
    try {
      const data = result?.data as any;
      if (!data || typeof data !== 'object') return;
      const ext = data.extensions || (data.extensions = {});
      const ths = ext['tavern_helper_scripts'];

      if (!ths || typeof ths !== 'object' || !Array.isArray(ths.repository)) return;

      const repository: ScriptRepository = ths.repository;
      if (repository.length === 0) return;

      // 弹窗询问是否启用
      const html = ScriptRepositoryManager.renderComponentToString(
        (await import('@/component/script_repository/components/ScriptAllowPopup.vue')).default,
        { type: 'preset' },
      );
      const $template = $(html);
      const confirmed = await callGenericPopup($template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      const enabled = confirmed ? true : false;

      ext['tavern_helper_scripts'] = { repository, enabled };

      const scriptRepositoryManager = ScriptRepositoryManager.getInstance();
      const pinia = scriptRepositoryManager.getPinia();
      if (pinia) {
        setActivePinia(pinia);
        const runtime = useScriptRuntime();
        await runtime.toggleScriptsByType('preset', false);
        if (enabled) {
          await runtime.toggleScriptsByType('preset', true);
        }
      }
    } catch (err) {
      console.warn('[ScriptRepository] 处理预设导入失败:', err);
    }
  });

  /**
   * 预设导出：如检测到包含脚本仓库数据，则阻断流程并弹窗选择导出内容
   */
  eventSource.makeLast(tavern_events.OAI_PRESET_EXPORT_READY, async (preset: any) => {
    try {
      if (!preset || typeof preset !== 'object') return;

      const ext = (preset as any).extensions || ((preset as any).extensions = {});
      const ths = ext['tavern_helper_scripts'];
      const hasRepository = ths && typeof ths === 'object';

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
        throw new Error('[ScriptRepository] Export cancelled by user');
      }

      if (choice === 1) {
        // 导出所有：不做处理
      } else if (choice === 2) {
        // 导出脚本：不导出脚本
        if (ext && ext['tavern_helper_regex']) {
          delete ext['tavern_helper_regex'];
        }
      } else if (choice === 3) {
        // 导出正则：不导出脚本
        if (ext && ext['tavern_helper_scripts']) {
          delete ext['tavern_helper_scripts'];
        }
      } else if (choice === 4) {
        // 不导出绑定数据
        if ((ext && ext['tavern_helper_regex']) || ext['tavern_helper_scripts']) {
          delete ext['tavern_helper_regex'];
          delete ext['tavern_helper_scripts'];
        }
      }
    } catch (err) {
      console.warn('[ScriptRepository] 预设导出处理失败:', err);
      throw err;
    }
  });
}
/**
 * 嵌入式脚本一次性检查
 * @param pinia Pinia实例
 * @returns 是否启用
 */
async function checkEmbeddedScriptsOnce(pinia: any): Promise<boolean> {
  try {
    const avatar = (this_chid && (characters as any)?.[this_chid]?.avatar) || '';
    if (!avatar) return false;

    const characterStore = useCharacterScriptStore(pinia);

    if (characterStore.allScripts.length === 0) {
      characterStore.initEnabled(false);
      return false;
    }

    const allowList: string[] = getSettingValue('script.characters_with_scripts') || [];
    const isWhitelisted = allowList.includes(avatar);

    if (isWhitelisted) {
      characterStore.initEnabled(true);
      return true;
    }

    const gateKey = `AlertScript_${avatar}`;
    if (!localStorage.getItem(gateKey)) {
      localStorage.setItem(gateKey, 'true');

      const html = ScriptRepositoryManager.renderComponentToString(
        (await import('@/component/script_repository/components/ScriptAllowPopup.vue')).default,
        { type: 'character' },
      );
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
        characterStore.initEnabled(true);
        return true;
      } else {
        characterStore.initEnabled(false);
        return false;
      }
    } else {
      characterStore.initEnabled(false);
      return false;
    }
  } catch (err) {
    console.warn('[ScriptRepository] 嵌入式脚本一次性检查失败:', err);
    return false;
  }
}
