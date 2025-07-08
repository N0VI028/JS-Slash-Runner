import { destroyIframe } from '@/component/message_iframe';
import { ScriptData } from '@/component/script_repository/data';
import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import {
  getOppositeScriptType,
  IFrameElement,
  Script,
  ScriptRepositoryItem,
  ScriptType,
} from '@/component/script_repository/types';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import { getSettingValue } from '@/util/extension_variables';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { uuidv4 } from '@sillytavern/scripts/utils';

class ScriptExecutor {
  /**
   * 创建并运行单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  async runScript(script: Script, type: ScriptType): Promise<void> {
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';

    try {
      const iframeElement = $('iframe').filter(
        (_index, element) => $(element).attr('script-id') === script.id,
      )[0] as IFrameElement;

      if (iframeElement) {
        await destroyIframe(iframeElement);
      }

      const htmlContent = this.createScriptHtml(script);

      const $iframe = $('<iframe>', {
        style: 'display: none;',
        id: `tavern-helper-script-${script.name}`,
        srcdoc: htmlContent,
        'script-id': script.id,
      });

      $iframe.on('load', () => {
        console.info(`[ScriptManager] 启用${typeName}脚本["${script.name}"]`);
      });

      $('body').append($iframe);
    } catch (error) {
      console.error(`[ScriptManager] ${typeName}脚本启用失败:["${script.name}"]`, error);
      toastr.error(`${typeName}脚本启用失败:["${script.name}"]`);
      throw error;
    }
  }

  /**
   * 停止单个脚本，并销毁iframe
   * @param script 脚本
   * @param type 脚本类型
   */
  async stopScript(script: Script, type: ScriptType): Promise<void> {
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';

    const iframeElement = $('iframe').filter(
      (_index, element) => $(element).attr('script-id') === script.id,
    )[0] as IFrameElement;

    if (iframeElement) {
      await destroyIframe(iframeElement);
      console.info(`[ScriptManager] 禁用${typeName}脚本["${script.name}"]`);
    }
  }

  /**
   * 创建运行脚本的HTML内容
   * @param script 脚本对象
   * @returns HTML内容
   */
  private createScriptHtml(script: Script): string {
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

          SillyTavern = window.parent.SillyTavern.getContext();
          TavernHelper = window.parent.TavernHelper;
          for (const key in TavernHelper) {
            window[key] = TavernHelper[key];
          }
        </script>
        <script src="${script_url.get('iframe_client')}"></script>
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
   * 清理所有脚本iframe
   */
  async clearAllScriptsIframe(): Promise<void> {
    const $iframes = $('iframe[id^="tavern-helper-script-"]');
    for (const iframe of $iframes) {
      await destroyIframe(iframe as IFrameElement);
    }
  }
}

export class ScriptManager {
  private static instance: ScriptManager;
  private scriptData: ScriptData;
  private executor: ScriptExecutor;

  private constructor() {
    this.scriptData = ScriptData.getInstance();
    this.executor = new ScriptExecutor();
    this.registerEventListeners();
  }

  /**
   * 获取脚本管理器实例
   */
  public static getInstance(): ScriptManager {
    if (!ScriptManager.instance) {
      ScriptManager.instance = new ScriptManager();
    }
    return ScriptManager.instance;
  }

  /**
   * 销毁脚本管理器实例
   */
  public static destroyInstance(): void {
    if (ScriptManager.instance) {
      ScriptManager.instance = undefined as unknown as ScriptManager;
    }
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_TOGGLE, async data => {
      const { script, type, enable, userInput = true } = data;
      await this.toggleScript(script, type, enable, userInput);
    });

    scriptEvents.on(ScriptRepositoryEventType.TYPE_TOGGLE, async data => {
      const { type, enable, userInput = true } = data;
      await this.toggleScriptType(type, enable, userInput);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_IMPORT, async data => {
      const { file, type } = data;
      await this.importScript(file, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_DELETE, async data => {
      const { scriptId, type } = data;
      await this.deleteScript(scriptId, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_CREATE, async data => {
      const { script, type } = data;
      await this.createScript(script, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_UPDATE, async data => {
      const { script, type } = data;
      await this.updateScript(script, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_MOVE, async data => {
      const { script, fromType } = data;
      await this.moveScript(script, fromType);
    });

    scriptEvents.on(ScriptRepositoryEventType.FOLDER_MOVE, async data => {
      const { folderId, fromType } = data;
      await this.moveFolder(folderId, fromType);
    });

    scriptEvents.on(ScriptRepositoryEventType.ORDER_CHANGED, async data => {
      const { data: orderData, type } = data;
      await this.saveOrder(orderData, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.UI_LOADED, async () => {
      if (!getSettingValue('enabled_extension')) {
        return;
      }

      const globalScripts = this.scriptData.getGlobalScripts();
      const characterScripts = this.scriptData.getCharacterScripts();

      if (this.scriptData.isGlobalScriptEnabled) {
        await this.runScriptsByType(globalScripts, ScriptType.GLOBAL);
      } else {
        console.info('[ScriptManager] 全局脚本类型未启用，跳过运行全局脚本');
      }

      if (this.scriptData.isCharacterScriptEnabled) {
        await this.runScriptsByType(characterScripts, ScriptType.CHARACTER);
      } else {
        console.info('[ScriptManager] 角色脚本类型未启用，跳过运行角色脚本');
      }
    });
  }

  /**
   * 切换脚本启用状态
   * @param script 脚本
   * @param type 脚本类型
   * @param enable 是否启用
   * @param userInput 是否由用户输入
   */
  public async toggleScript(
    script: Script,
    type: ScriptType,
    enable: boolean,
    userInput: boolean = true,
  ): Promise<void> {
    if (userInput) {
      script.enabled = enable;
      await this.scriptData.saveScript(script, type);
    }

    try {
      if (enable) {
        if (type === ScriptType.GLOBAL && !this.scriptData.isGlobalScriptEnabled) {
          console.info(`[script_manager] 全局脚本类型未启用，跳过启用脚本["${script.name}"]`);
          return;
        }
        if (type === ScriptType.CHARACTER && !this.scriptData.isCharacterScriptEnabled) {
          console.info(`[script_manager] 角色脚本类型未启用，跳过启用脚本["${script.name}"]`);
          return;
        }

        await this.runScript(script, type);
      } else {
        await this.stopScript(script, type);
      }

      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
        action: 'script_toggle',
        script,
        type,
        enable,
      });
    } catch (error) {
      console.error(`[ScriptManager] 切换脚本状态失败: ${script.name}`, error);
      toastr.error(`切换脚本状态失败: ${script.name}`);
    }
  }

  /**
   * 切换脚本类型启用状态
   * @param type 脚本类型
   * @param enable 是否启用
   * @param userInput 是否由用户输入
   */
  public async toggleScriptType(type: ScriptType, enable: boolean, userInput: boolean = true): Promise<void> {
    if (userInput) {
      await this.scriptData.updateScriptTypeEnableState(type, enable);
    }

    try {
      const scripts =
        type === ScriptType.GLOBAL ? this.scriptData.getGlobalScripts() : this.scriptData.getCharacterScripts();

      if (enable) {
        await this.runScriptsByType(scripts, type);
      } else {
        await this.stopScriptsByType(scripts, type);
      }

      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
        action: 'type_toggle',
        type,
        enable,
      });
    } catch (error) {
      console.error(`[ScriptManager] 切换脚本类型状态失败: ${type}`, error);
      toastr.error(`切换脚本类型状态失败: ${type}`);
    }
  }

  /**
   * 运行单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async runScript(script: Script, type: ScriptType): Promise<void> {
    if (!getSettingValue('enabled_extension')) {
      toastr.error('[ScriptManager] 扩展未启用');
      return;
    }

    if (type === ScriptType.GLOBAL && !this.scriptData.isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !this.scriptData.isCharacterScriptEnabled) {
      return;
    }

    await this.executor.runScript(script, type);

    if (script.buttons && script.buttons.length > 0) {
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_ADD, { script });
    }
  }

  /**
   * 停止单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async stopScript(script: Script, type: ScriptType): Promise<void> {
    await this.executor.stopScript(script, type);

    if (script.buttons && script.buttons.length > 0) {
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });
    }
  }

  /**
   * 运行指定类型的所有脚本
   * @param scripts 脚本列表
   * @param type 脚本类型
   */
  public async runScriptsByType(scripts: Script[], type: ScriptType): Promise<void> {
    if (!getSettingValue('enabled_extension')) {
      toastr.error('[ScriptManager] 酒馆助手未启用，无法运行脚本');
      return;
    }

    if (type === ScriptType.GLOBAL && !this.scriptData.isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !this.scriptData.isCharacterScriptEnabled) {
      return;
    }

    const enabledScripts = scripts.filter(script => script.enabled);

    for (const script of enabledScripts) {
      await this.executor.runScript(script, type);

      if (script.buttons && script.buttons.length > 0) {
        scriptEvents.emit(ScriptRepositoryEventType.BUTTON_ADD, { script });
      }
    }
  }

  /**
   * 停止指定类型的所有脚本
   * @param scripts 脚本列表
   * @param type 脚本类型
   */
  public async stopScriptsByType(scripts: Script[], type: ScriptType): Promise<void> {
    const enabledScripts = scripts.filter(script => script.enabled);

    for (const script of enabledScripts) {
      await this.executor.stopScript(script, type);

      if (script.buttons && script.buttons.length > 0) {
        scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });
      }
    }
  }

  /**
   * 导入脚本或文件夹
   * @param file 脚本文件或文件夹导出文件
   * @param type 导入目标类型
   */
  public async importScript(file: File, type: ScriptType): Promise<void> {
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        await this.importFromZip(file, type);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const content = await this.readFileAsText(file);
        const importData = JSON.parse(content);

        if (Array.isArray(importData)) {
          await this.importMultipleItems(importData, type);
        } else {
          await this.importSingleScript(importData, type);
        }
      } else {
        throw new Error('不支持的文件格式，请选择 .json 或 .zip 文件');
      }
    } catch (error) {
      console.error('[ScriptManager] 导入失败:', error);
      toastr.error(`导入失败: ${error instanceof Error ? error.message : '无效的文件格式'}`);
    }
  }

  /**
   * 从ZIP文件导入
   * @param file ZIP文件
   * @param type 脚本类型
   */
  private async importFromZip(file: File, type: ScriptType): Promise<void> {
    //@ts-ignore
    if (!window.JSZip) {
      console.log('import jszip');
      await import('@sillytavern/lib/jszip.min.js');
    }
    //@ts-ignore
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    let importedScripts = 0;
    let importedFolders = 0;

    const folders = new Set<string>();
    const rootScripts: string[] = [];

    for (const fileName in zipContent.files) {
      const file = zipContent.files[fileName];

      if (!file.dir && fileName.endsWith('.json')) {
        const pathParts = fileName.split('/');

        if (pathParts.length === 1) {
          rootScripts.push(fileName);
        } else if (pathParts.length === 2) {
          folders.add(pathParts[0]);
        }
      }
    }

    for (const fileName of rootScripts) {
      const file = zipContent.files[fileName];
      const scriptContent = await file.async('string');
      const scriptData = JSON.parse(scriptContent);

      if (scriptData.name && 'content' in scriptData) {
        const script = new Script({
          ...scriptData,
          enabled: false,
        });
        await this.handleScriptImport(script, type);
        importedScripts++;
      }
    }

    for (const folderName of folders) {
      const folderScriptCount = await this.importFolderFromZipNew(zipContent, folderName, type);
      importedScripts += folderScriptCount;
      importedFolders++;
    }

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: type === ScriptType.GLOBAL ? 'refresh_global_scripts' : 'refresh_charact_scripts',
    });

    toastr.success(`成功导入 ${importedScripts} 个脚本和 ${importedFolders} 个文件夹`);
  }

  /**
   * 从ZIP中导入文件夹
   * @param zipContent ZIP内容
   * @param folderName 文件夹名称
   * @param type 脚本类型
   * @returns 导入的脚本数量
   */
  private async importFolderFromZipNew(zipContent: any, folderName: string, type: ScriptType): Promise<number> {
    const repository =
      type === ScriptType.GLOBAL
        ? this.scriptData.getGlobalRepositoryItems()
        : this.scriptData.getCharacterRepositoryItems();

    let finalFolderName = folderName;
    let counter = 1;
    while (repository.some(item => item.type === 'folder' && item.name === finalFolderName)) {
      finalFolderName = `${folderName}_${counter}`;
      counter++;
    }

    const folderId = await this.scriptData.createFolder(finalFolderName, type);
    let folderScriptCount = 0;

    for (const fileName in zipContent.files) {
      const file = zipContent.files[fileName];

      if (!file.dir && fileName.startsWith(`${folderName}/`) && fileName.endsWith('.json')) {
        const scriptContent = await file.async('string');
        const scriptData = JSON.parse(scriptContent);

        if (scriptData.name && 'content' in scriptData) {
          const script = new Script({
            ...scriptData,
            enabled: false,
          });
          await this.handleScriptImport(script, type);
          await this.scriptData.moveScriptToFolder(script.id, folderId, type);
          folderScriptCount++;
        }
      }
    }

    return folderScriptCount;
  }

  /**
   * 导入单个脚本
   * @param scriptData 脚本数据
   * @param type 脚本类型
   */
  private async importSingleScript(scriptData: any, type: ScriptType): Promise<void> {
    if (!scriptData.name || !('content' in scriptData)) {
      throw new Error('无效的脚本数据');
    }

    const scriptToImport = new Script({
      ...scriptData,
      enabled: false,
    });

    await this.handleScriptImport(scriptToImport, type);

    toastr.success(`脚本 '${scriptToImport.name}' 导入成功。`);
  }

  /**
   * 导入多个项目（脚本或文件夹）
   * @param items 项目数组
   * @param type 脚本类型
   */
  private async importMultipleItems(items: any[], type: ScriptType): Promise<void> {
    let importedCount = 0;
    let folderCount = 0;
    let scriptCount = 0;

    for (const item of items) {
      if (item.type === 'folder') {
        await this.importFolder(item, type);
        folderCount++;
        importedCount++;
      } else if (item.type === 'script') {
        const script = new Script({
          ...item.value,
          enabled: false,
        });
        await this.handleScriptImport(script, type);
        scriptCount++;
        importedCount++;
      } else if (item.name && 'content' in item) {
        const script = new Script({
          ...item,
          enabled: false,
        });
        await this.handleScriptImport(script, type);
        scriptCount++;
        importedCount++;
      }
    }

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: type === ScriptType.GLOBAL ? 'refresh_global_scripts' : 'refresh_charact_scripts',
    });

    toastr.success(`导入成功`);
  }

  /**
   * 导入文件夹
   * @param folderData 文件夹数据
   * @param type 脚本类型
   */
  private async importFolder(folderData: any, type: ScriptType): Promise<void> {
    if (!folderData.name || !Array.isArray(folderData.value)) {
      throw new Error('无效的文件夹数据');
    }

    const repository =
      type === ScriptType.GLOBAL
        ? this.scriptData.getGlobalRepositoryItems()
        : this.scriptData.getCharacterRepositoryItems();

    let folderName = folderData.name;
    let counter = 1;
    while (repository.some(item => item.type === 'folder' && item.name === folderName)) {
      folderName = `${folderData.name}_${counter}`;
      counter++;
    }

    const folderId = await this.scriptData.createFolder(folderName, type);

    for (const scriptData of folderData.value) {
      const script = new Script({
        ...scriptData,
        enabled: false,
      });
      await this.handleScriptImport(script, type);
      await this.scriptData.moveScriptToFolder(script.id, folderId, type);
    }
  }

  /**
   * 处理脚本导入冲突
   * @param script 要导入的脚本
   * @param type 目标类型
   */
  private async handleScriptImport(script: Script, type: ScriptType): Promise<void> {
    const globalScripts = this.scriptData.getGlobalScripts();
    const characterScripts = this.scriptData.getCharacterScripts();

    const conflictInGlobal = globalScripts.find(s => s.id === script.id);
    const conflictInCharacter = characterScripts.find(s => s.id === script.id);

    let existingScript: Script | undefined;
    let conflictType: ScriptType | undefined;

    if (conflictInGlobal) {
      existingScript = conflictInGlobal;
      conflictType = ScriptType.GLOBAL;
    } else if (conflictInCharacter) {
      existingScript = conflictInCharacter;
      conflictType = ScriptType.CHARACTER;
    }

    if (existingScript && conflictType) {
      const action = await this.handleScriptIdConflict(script, existingScript, type, 'import');

      switch (action) {
        case 'new':
          script.id = uuidv4();
          await this.createScript(script, type);
          break;
        case 'override':
          await this.deleteScript(existingScript.id, conflictType);
          await this.createScript(script, type);
          break;
        case 'cancel':
          return;
      }
    } else {
      await this.createScript(script, type);
    }
  }

  /**
   * 读取文件内容为文本
   * @param file 文件对象
   * @returns 文件内容
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * 创建新脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async createScript(script: Script, type: ScriptType): Promise<void> {
    await this.scriptData.saveScript(script, type);
    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_create',
      script,
      type,
    });
  }

  /**
   * 更新现有脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async updateScript(script: Script, type: ScriptType): Promise<void> {
    await this.scriptData.saveScript(script, type);
    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_update',
      script,
      type,
    });
  }

  /**
   * 统一保存排序方法 - 保存仓库项排序
   * @param repositoryItems 仓库项数组（包含文件夹和脚本的混合结构）
   * @param type 脚本类型
   */
  public async saveOrder(repositoryItems: ScriptRepositoryItem[], type: ScriptType): Promise<void> {
    if (type === ScriptType.GLOBAL) {
      await this.scriptData.saveGlobalRepositoryItems(repositoryItems);
    } else {
      await this.scriptData.saveCharacterRepositoryItems(repositoryItems);
    }

    this.scriptData.loadScripts();
  }

  /**
   * 删除脚本
   * @param scriptId 脚本ID
   * @param type 脚本类型
   */
  public async deleteScript(scriptId: string, type: ScriptType): Promise<void> {
    const script = this.scriptData.getScriptById(scriptId);
    if (!script) {
      throw new Error('[ScriptManager] 脚本不存在');
    }

    await this.stopScript(script, type);

    await this.scriptData.deleteScript(scriptId, type);

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_delete',
      scriptId,
      type,
    });
  }

  /**
   * 移动脚本到另一个类型
   * @param script 脚本
   * @param fromType 源类型
   */
  public async moveScript(script: Script, fromType: ScriptType): Promise<void> {
    await this.stopScript(script, fromType);

    const targetType = getOppositeScriptType(fromType);

    const existingScriptInTarget = this.scriptData.getScriptById(script.id);
    const existingScriptType = existingScriptInTarget ? this.scriptData.getScriptType(existingScriptInTarget) : null;

    if (existingScriptInTarget && existingScriptType === targetType) {
      const action = await this.handleScriptIdConflict(script, existingScriptInTarget, targetType, 'move');

      switch (action) {
        case 'new':
          script.id = uuidv4();
          break;
        case 'override':
          await this.deleteScript(existingScriptInTarget.id, targetType);
          break;
        case 'cancel':
          return;
      }
    }

    await this.scriptData.moveItemToOtherType({ type: 'script', id: script.id, value: script }, fromType);

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_move',
      script,
      fromType,
      targetType,
    });

    if (
      script.enabled &&
      ((targetType === ScriptType.GLOBAL && this.scriptData.isGlobalScriptEnabled) ||
        (targetType === ScriptType.CHARACTER && this.scriptData.isCharacterScriptEnabled))
    ) {
      await this.runScript(script, targetType);
    }
  }

  /**
   * 刷新角色脚本数据
   */
  public refreshCharacterScriptData(): void {
    this.scriptData.getCharacterScripts();
  }

  /**
   * 获取全局脚本
   */
  public getGlobalScripts(): Script[] {
    return this.scriptData.getGlobalScripts();
  }

  /**
   * 获取角色脚本
   */
  public getCharacterScripts(): Script[] {
    return this.scriptData.getCharacterScripts();
  }

  /**
   * 刷新角色脚本启用状态
   */
  public refreshCharacterScriptEnabledState(): void {
    this.scriptData.refreshCharacterScriptEnabledState();
  }

  /**
   * 获取全局脚本启用状态
   */
  public get isGlobalScriptEnabled(): boolean {
    return this.scriptData.isGlobalScriptEnabled;
  }

  /**
   * 获取角色脚本启用状态
   */
  public get isCharacterScriptEnabled(): boolean {
    return this.scriptData.isCharacterScriptEnabled;
  }

  /**
   * 根据ID获取脚本
   * @param id 脚本ID
   */
  public getScriptById(id: string): Script | undefined {
    return this.scriptData.getScriptById(id);
  }

  /**
   * 获取全局脚本仓库项（包含文件夹结构）
   */
  public getGlobalRepositoryItems(): ScriptRepositoryItem[] {
    return this.scriptData.getGlobalRepositoryItems();
  }

  /**
   * 获取角色脚本仓库项（包含文件夹结构）
   */
  public getCharacterRepositoryItems(): ScriptRepositoryItem[] {
    return this.scriptData.getCharacterRepositoryItems();
  }

  /**
   * 创建文件夹
   */
  public async createFolder(name: string, type: ScriptType, icon?: string, color?: string): Promise<string> {
    return await this.scriptData.createFolder(name, type, icon, color);
  }

  /**
   * 重命名文件夹
   */
  public async editFolder(
    folderId: string,
    newName: string,
    type: ScriptType,
    newIcon?: string,
    newColor?: string,
  ): Promise<void> {
    await this.scriptData.editFolder(folderId, newName, type, newIcon, newColor);
  }

  /**
   * 删除文件夹
   */
  public async deleteFolder(folderId: string, type: ScriptType): Promise<void> {
    await this.scriptData.deleteFolder(folderId, type);
  }

  /**
   * 将脚本移动到文件夹
   */
  public async moveScriptToFolder(scriptId: string, targetFolderId: string | null, type: ScriptType): Promise<void> {
    await this.scriptData.moveScriptToFolder(scriptId, targetFolderId, type);
  }

  /**
   * 将文件夹移动到其他类型
   * @param folderId 文件夹ID
   * @param fromType 源类型
   */
  public async moveFolder(folderId: string, fromType: ScriptType): Promise<void> {
    const targetType = getOppositeScriptType(fromType);

    await this.scriptData.moveItemToOtherType({ type: 'folder', id: folderId }, fromType);

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'folder_move',
      folderId,
      fromType,
      targetType,
    });
  }

  /**
   * 获取文件夹中的脚本
   */
  public getFolderScripts(folderId: string, type: ScriptType): Script[] {
    return this.scriptData.getFolderScripts(folderId, type);
  }

  /**
   * 获取根级别的脚本
   */
  public getRootScripts(type: ScriptType): Script[] {
    return this.scriptData.getRootScripts(type);
  }

  /**
   * 获取所有文件夹
   */
  public getFolders(type: ScriptType): ScriptRepositoryItem[] {
    return this.scriptData.getFolders(type);
  }

  /**
   * 批量切换文件夹内所有脚本的启用状态
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param enable 是否启用
   */
  public async toggleFolderScripts(folderId: string, type: ScriptType, enable: boolean): Promise<void> {
    try {
      await this.scriptData.toggleFolderScripts(folderId, type, enable);

      const scripts = this.scriptData.getFolderScripts(folderId, type);

      const isTypeEnabled =
        type === ScriptType.GLOBAL ? this.scriptData.isGlobalScriptEnabled : this.scriptData.isCharacterScriptEnabled;

      if (isTypeEnabled) {
        for (const script of scripts) {
          if (enable && script.enabled) {
            await this.runScript(script, type);
          } else if (!enable) {
            await this.stopScript(script, type);
          }
        }
      }

      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
        action: 'folder_scripts_toggle',
        folderId,
        type,
        enable,
      });
    } catch (error) {
      console.error(`[ScriptManager] 批量切换文件夹脚本状态失败: ${folderId}`, error);
      toastr.error(`批量切换文件夹脚本状态失败`);
    }
  }

  /**
   * 获取文件夹内脚本的整体启用状态
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  public getFolderScriptsState(folderId: string, type: ScriptType): 'all' | 'none' {
    return this.scriptData.getFolderScriptsState(folderId, type);
  }

  /**
   * 获取指定脚本的按钮数组
   * @param scriptId 脚本ID
   * @returns 按钮数组
   */
  public getScriptButton(scriptId: string): Script['buttons'] {
    const script = this.scriptData.getScriptById(scriptId);
    if (!script) {
      console.warn(`[ScriptManager] 脚本不存在: ${scriptId}`);
      return [];
    }
    return script.buttons;
  }

  /**
   * 修改后更新脚本按钮（仅重建按钮，不重启脚本）
   * @param script 脚本对象
   * @param type 脚本类型
   */
  public async setScriptButton(script: Script, type: ScriptType): Promise<void> {
    await this.scriptData.saveScript(script, type);

    if (script.enabled) {
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });

      if (script.buttons && script.buttons.length > 0) {
        scriptEvents.emit(ScriptRepositoryEventType.BUTTON_ADD, { script });
      }
    }
  }

  /**
   * 获取指定脚本的变量数据
   * @param scriptId 脚本ID
   * @returns 脚本的data字段，如果脚本不存在返回空对象
   */
  public getScriptVariables(scriptId: string): { [key: string]: any } {
    const script = this.scriptData.getScriptById(scriptId);
    if (!script) {
      console.warn(`[ScriptManager] 脚本不存在: ${scriptId}`);
      return {};
    }
    return script.data || {};
  }

  /**
   * 更新指定脚本的变量数据
   * @param scriptId 脚本ID
   * @param variables 新的变量数据
   * @param type 脚本类型
   * @returns 是否更新成功
   */
  public async updateScriptVariables(
    scriptId: string,
    variables: { [key: string]: any },
    type: ScriptType,
  ): Promise<boolean> {
    const script = this.scriptData.getScriptById(scriptId);
    if (!script) {
      console.warn(`[ScriptManager] 脚本不存在: ${scriptId}`);
      return false;
    }

    script.data = variables;
    await this.scriptData.saveScript(script, type);

    console.info(`[ScriptManager] 已更新脚本变量: ${script.name}`);
    return true;
  }

  /**
   * 获取所有脚本的变量数据（用于调试和管理）
   * @param type 脚本类型
   * @returns 所有脚本的变量数据映射
   */
  public getAllScriptVariables(type: ScriptType): Map<string, { [key: string]: any }> {
    const scripts =
      type === ScriptType.GLOBAL ? this.scriptData.getGlobalScripts() : this.scriptData.getCharacterScripts();

    const variablesMap = new Map<string, { [key: string]: any }>();

    scripts.forEach(script => {
      if (script.data && Object.keys(script.data).length > 0) {
        variablesMap.set(script.id, script.data);
      }
    });

    return variablesMap;
  }

  /**
   * 清理所有资源
   */
  public async cleanup(): Promise<void> {
    await this.executor.clearAllScriptsIframe();
  }

  /**
   * 处理脚本ID冲突
   * @param script 要处理的脚本
   * @param existingScript 已存在的脚本
   * @param targetType 目标类型
   * @param operationType 操作类型：'import' - 导入, 'move' - 移动
   * @returns 处理结果：'new' - 使用新ID, 'override' - 覆盖已有脚本, 'cancel' - 取消操作
   */
  public async handleScriptIdConflict(
    script: Script,
    existingScript: Script,
    targetType: ScriptType,
    operationType: 'import' | 'move' = 'import',
  ): Promise<'new' | 'override' | 'cancel'> {
    const existingScriptType = this.scriptData.getScriptType(existingScript);
    const existingTypeText = existingScriptType === ScriptType.GLOBAL ? '全局脚本' : '角色脚本';
    const targetTypeText = targetType === ScriptType.GLOBAL ? '全局脚本' : '角色脚本';

    let message: string;
    if (operationType === 'import') {
      message = `要导入的脚本 '${script.name}' 与${existingTypeText}库中的 '${existingScript.name}' id 相同，是否要继续操作？`;
    } else {
      message = `要移动到${targetTypeText}库的脚本 '${script.name}' 与目标库中的 '${existingScript.name}' id 相同，是否要继续操作？`;
    }

    const input = await callGenericPopup(message, POPUP_TYPE.TEXT, '', {
      okButton: '覆盖原脚本',
      cancelButton: '取消',
      customButtons: ['新建脚本'],
    });

    let action: 'new' | 'override' | 'cancel' = 'cancel';

    switch (input) {
      case 0:
        action = 'cancel';
        break;
      case 1:
        action = 'override';
        break;
      case 2:
        action = 'new';
        break;
    }

    return action;
  }
}
