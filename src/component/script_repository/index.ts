import {
  bindQrEnabledChangeListener,
  checkQrEnabledStatusAndAddButton,
  unbindQrEnabledChangeListener,
} from '@/component/script_repository/button';
import { purgeEmbeddedScripts, ScriptData } from '@/component/script_repository/data';
import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import { ScriptManager } from '@/component/script_repository/script_controller';
import { Script, ScriptType } from '@/component/script_repository/types';
import { UIController } from '@/component/script_repository/ui_controller';
import { extensionFolderPath } from '@/util/extension_variables';

import { event_types, eventSource, this_chid } from '@sillytavern/script';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { loadFileToDocument, uuidv4 } from '@sillytavern/scripts/utils';

import log from 'loglevel';

const load_events = [event_types.CHAT_CHANGED] as const;
const delete_events = [event_types.CHARACTER_DELETED] as const;

/**
 * 脚本仓库应用 - 使用事件驱动架构
 * 负责整合ScriptManager和UIManager，提供统一的接口
 */
export class ScriptRepositoryApp {
  private static instance: ScriptRepositoryApp;
  private scriptManager: ScriptManager;
  private uiManager: UIController;
  private initialized: boolean = false;

  private constructor() {
    this.scriptManager = ScriptManager.getInstance();
    this.uiManager = UIController.getInstance();

    this.registerEvents();
  }

  /**
   * 获取应用实例
   */
  public static getInstance(): ScriptRepositoryApp {
    if (!ScriptRepositoryApp.instance) {
      ScriptRepositoryApp.instance = new ScriptRepositoryApp();
    }
    return ScriptRepositoryApp.instance;
  }

  /**
   * 销毁应用实例
   */
  public static destroyInstance(): void {
    if (ScriptRepositoryApp.instance) {
      ScriptRepositoryApp.instance.cleanup();
      ScriptRepositoryApp.instance = undefined as unknown as ScriptRepositoryApp;
      ScriptManager.destroyInstance();
      UIController.destroyInstance();
      ScriptData.destroyInstance();
      unbindQrEnabledChangeListener();
    }
  }

  /**
   * 初始化应用
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await loadFileToDocument(
        `/scripts/extensions/${extensionFolderPath}/src/component/script_repository/public/style.css`,
        'css',
      );
      await this.uiManager.initialize();
      this.initialized = true;
    } catch (error) {
      log.error('[ScriptManager] 初始化失败:', error);
      this.initialized = false;
    }
  }

  /**
   * 注册事件监听
   */
  private registerEvents(): void {
    load_events.forEach(eventType => {
      eventSource.on(eventType, this.refreshCharacterRepository.bind(this));
    });

    delete_events.forEach(eventType => {
      eventSource.on(eventType, (character: any) => purgeEmbeddedScripts({ character }));
    });
  }

  /**
   * 刷新角色脚本库
   */
  private async refreshCharacterRepository(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    const previousCharacterScripts: Script[] = [];
    $(`#character-script-list`)
      .find('.script-item')
      .each((_index, element) => {
        const $element = $(element);
        const scriptId = $element.attr('id');
        if (scriptId) {
          const script = this.scriptManager.getScriptById(scriptId);
          if (script) {
            previousCharacterScripts.push(script);
          }
        }
      });
    this.scriptManager.stopScriptsByType(previousCharacterScripts, ScriptType.CHARACTER);

    const scriptData = ScriptData.getInstance();
    const globalScripts = this.scriptManager.getGlobalScripts();
    const characterScripts = this.scriptManager.getCharacterScripts();

    this.scriptManager.refreshCharacterScriptEnabledState();

    log.info('[ScriptManager] 刷新角色脚本库');

    if (this_chid && characterScripts.length > 0) {
      await this.uiManager.checkEmbeddedScripts(this_chid);
    }

    const conflictScripts = characterScripts.filter(charScript =>
      globalScripts.some(globalScript => globalScript.id === charScript.id),
    );

    if (conflictScripts.length > 0) {
      log.info(`[ScriptManager] 发现${conflictScripts.length}个脚本ID冲突`);

      for (const charScript of conflictScripts) {
        const globalScript = globalScripts.find(gs => gs.id === charScript.id)!;

        const result = await callGenericPopup(
          `全局脚本中已存在 "${globalScript.name}" 脚本，是否关闭冲突脚本？`,
          POPUP_TYPE.TEXT,
          '',
          {
            okButton: '关闭全局',
            cancelButton: '关闭局部',
          },
        );

        charScript.id = uuidv4();

        if (result) {
          if (globalScript.enabled) {
            await this.scriptManager.stopScript(globalScript, ScriptType.GLOBAL);
            globalScript.enabled = false;
            log.info(`[ScriptManager] 关闭全局脚本: ${globalScript.name}`);
            scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
              action: 'script_toggle',
              script: globalScript,
              type: ScriptType.GLOBAL,
              enable: false,
            });
            scriptData.saveGlobalScripts(globalScripts);
          }
        } else if (charScript.enabled) {
          charScript.enabled = false;
          await scriptData.saveCharacterScripts(characterScripts);
          log.info(`[ScriptManager] 关闭局部脚本: ${charScript.name}`);
        }
      }
    }

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, { action: 'refresh_charact_scripts' });
    checkQrEnabledStatusAndAddButton();
    bindQrEnabledChangeListener();

    await this.scriptManager.runScriptsByType(characterScripts, ScriptType.CHARACTER);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      load_events.forEach(eventType => {
        eventSource.removeListener(eventType, this.refreshCharacterRepository.bind(this));
      });

      await this.scriptManager.cleanup();
      this.uiManager.cleanup();

      this.initialized = false;
      log.info('[ScriptManager] 清理完成');
    } catch (error) {
      log.error('[ScriptManager] 清理失败:', error);
    }
  }
}

/**
 * 构建脚本库应用
 */
export async function buildScriptRepository(): Promise<void> {
  const app = ScriptRepositoryApp.getInstance();
  await app.initialize();
}

/**
 * 移除脚本库应用
 */
export async function removeScriptRepository(): Promise<void> {
  ScriptRepositoryApp.destroyInstance();
}

/**
 * 扩展开启时构建脚本库
 */
export async function buildScriptRepositoryOnExtension(): Promise<void> {
  await buildScriptRepository();
}

/**
 * 扩展关闭时销毁脚本库
 */
export function destroyScriptRepositoryOnExtension(): void {
  removeScriptRepository();
}

export { ScriptType };
