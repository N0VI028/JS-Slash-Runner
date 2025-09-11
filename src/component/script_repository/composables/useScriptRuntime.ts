import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import log from 'loglevel';
import type { Script, ScriptType } from '../schemas/script.schema';
import { getStoreByType } from '../stores/factory';
import { buttonManager } from '../utils/buttonManager';

/**
 * 脚本运行时管理器
 */
export function useScriptRuntime() {
  const storeByType = getStoreByType();

  /**
   * 创建脚本运行的HTML内容
   */
  function createScriptHtml(script: Script): string {
    return `
      <html>
      <head>
        ${third_party}
        <script>
          (function ($) {
            var original$ = $;
            window.$ = function (selector, context) {
              if (context === undefined || context === null) {
                if (window.parent && window.parent.document) {
                  context = window.parent.document;
                } else {
                  console.warn('无法访问 window.parent.document，将使用当前 iframe 的 document 作为上下文。');
                  context = window.document;
                }
              }
              return original$(selector, context);
            };
          })(jQuery);
        </script>
        <script src="${script_url.get('iframe')}"></script>
      </head>
      <body>
        <script type="module">
          ${script.content}
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 启动单个脚本
   */
  async function startScript(scriptId: string, type: ScriptType): Promise<void> {
    const store = storeByType[type];
    const script = store.getScript(scriptId);

    if (!script || !script.enabled) {
      return;
    }

    // 检查类型总开关
    // @ts-ignore
    if (!store.enabled) {
      log.info(`[ScriptRepository] ${type}脚本类型未启用，跳过启用脚本["${script.name}"]`);
      return;
    }

    try {
      // 先清理已存在的iframe（使用jQuery）
      $(`iframe[script-id="${scriptId}"]`).remove();

      const htmlContent = createScriptHtml(script);
      const $iframe = $('<iframe>', {
        style: 'display: none;',
        id: `tavern-helper-script-${script.name}`,
        srcdoc: htmlContent,
        'script-id': scriptId,
      });

      $iframe.on('load', () => {
        log.info(`[ScriptRepository] 启用${type}脚本["${script.name}"]`);
      });

      $('body').append($iframe);

      // 同步按钮：随脚本启用一起添加
      if (script.buttons && script.buttons.length > 0) {
        try {
          buttonManager.init();
          buttonManager.addButtonsForScript(script);
        } catch (e) {
          log.warn('[ScriptRepository] 添加按钮失败:', e);
        }
      }
    } catch (error) {
      log.error(`[ScriptRepository] ${type}脚本启用失败:["${script.name}"]`, error);
      toastr.error(`${type}脚本启用失败:["${script.name}"]`);
      throw error;
    }
  }

  /**
   * 停止单个脚本
   */
  async function stopScript(scriptId: string, type: ScriptType): Promise<void> {
    const store = storeByType[type];
    const script = store.getScript(scriptId);

    if (!script) {
      return;
    }

    try {
      const $iframe = $(`iframe[script-id="${scriptId}"]`);
      if ($iframe.length > 0) {
        $iframe.remove();
        log.info(`[ScriptRepository] 禁用${type}脚本["${script.name}"]`);
      }

      // 同步按钮：随脚本禁用一起移除
      if (script.buttons && script.buttons.length > 0) {
        try {
          buttonManager.removeButtonsByScriptId(scriptId);
        } catch (e) {
          log.warn('[ScriptRepository] 移除按钮失败:', e);
        }
      }
    } catch (error) {
      log.error(`[ScriptRepository] ${type}脚本停止失败:["${script.name}"]`, error);
    }
  }

  /**
   * 批量切换某类型的所有脚本
   * @param type 脚本类型
   * @param enable 是否启动
   */
  async function toggleScriptsByType(type: ScriptType, enable: boolean): Promise<void> {
    const store = storeByType[type];
    const scripts = store.allScripts.filter((script: any) => script.enabled);

    if (!enable) {
      for (const script of scripts) {
        await stopScript(script.id, type);
      }
    } else {
      for (const script of scripts) {
        await startScript(script.id, type);
      }
    }

    log.info(`[ScriptRepository] ${enable ? '启用' : '禁用'}了${scripts.length}个${type}脚本`);
  }

  /**
   * 批量切换文件夹内脚本
   */
  async function toggleFolderScripts(folderId: string, type: ScriptType, enable: boolean): Promise<void> {
    const store = storeByType[type];
    const folderScripts = store.getFolderScripts(folderId);

    // 仅更新 enabled；运行时切换由 orchestrator 订阅处理
    for (const script of folderScripts) {
      if (script.enabled !== enable) {
        await store.updateScript(script.id, { enabled: enable });
      }
    }

    log.info(`[ScriptRepository] ${enable ? '启用' : '禁用'}了文件夹内${folderScripts.length}个脚本`);
  }

  /**
   * 清理所有脚本iframe
   */
  async function cleanup(): Promise<void> {
    const $iframes = $('iframe[id^="tavern-helper-script-"]');
    $iframes.remove();
    log.info(`[ScriptRepository] 清理了${$iframes.length}个脚本iframe`);
  }

  return {
    startScript,
    stopScript,
    toggleScriptsByType,
    toggleFolderScripts,
    cleanup,
  };
}
