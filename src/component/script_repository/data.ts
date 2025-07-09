import {
  extractScriptsFromRepository,
  getOppositeScriptType,
  isScript,
  isScriptRepositoryItem,
  Script,
  ScriptRepositoryItem,
  ScriptType,
} from '@/component/script_repository/types';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';
import { uuidv4 } from '@sillytavern/scripts/utils';

import log from 'loglevel';

/**
 * 脚本数据管理类
 */
export class ScriptData {
  private static instance: ScriptData;
  private globalScripts: Script[] = [];
  private characterScripts: Script[] = [];
  private _isGlobalScriptEnabled: boolean = false;
  private _isCharacterScriptEnabled: boolean = false;

  private constructor() {
    this.loadScripts();
  }

  public get isGlobalScriptEnabled(): boolean {
    return this._isGlobalScriptEnabled;
  }

  public get isCharacterScriptEnabled(): boolean {
    return this._isCharacterScriptEnabled;
  }

  public static getInstance(): ScriptData {
    if (!ScriptData.instance) {
      ScriptData.instance = new ScriptData();
    }
    return ScriptData.instance;
  }

  public static destroyInstance(): void {
    if (ScriptData.instance) {
      ScriptData.instance = undefined as unknown as ScriptData;
    }
  }

  /**
   * 检查当前角色是否启用了脚本库
   * @returns 角色脚本库是否启用
   */
  public checkCharacterScriptEnabled(): boolean {
    const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
    //@ts-ignore
    const avatar = characters?.[this_chid]?.avatar;
    return charactersWithScripts?.includes(avatar) || false;
  }

  /**
   * 加载脚本库原始数据，支持新旧数据结构兼容
   */
  loadScripts() {
    const rawGlobalRepository = getSettingValue('script.scriptsRepository') || [];
    this.globalScripts = this.migrateAndExtractScripts(rawGlobalRepository, ScriptType.GLOBAL);
    //@ts-ignore
    const rawCharacterRepository = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    this.characterScripts = this.migrateAndExtractScripts(rawCharacterRepository, ScriptType.CHARACTER);

    this._isGlobalScriptEnabled = getSettingValue('script.global_script_enabled') ?? false;
    this._isCharacterScriptEnabled = this.checkCharacterScriptEnabled();
  }

  /**
   * 检查并迁移数据结构，确保向后兼容
   * @param repository 原始仓库数据
   * @param type 脚本类型
   * @returns 提取的脚本数组
   */
  private migrateAndExtractScripts(repository: any[], type: ScriptType): Script[] {
    if (!Array.isArray(repository)) {
      return [];
    }

    let needsMigration = false;
    const migratedRepository: ScriptRepositoryItem[] = [];

    for (const item of repository) {
      if (isScript(item)) {
        needsMigration = true;
        migratedRepository.push({
          type: 'script',
          value: new Script(item),
        });
      } else if (isScriptRepositoryItem(item)) {
        if (item.type === 'script') {
          migratedRepository.push({
            type: 'script',
            value: new Script(item.value as Partial<Script>),
          });
        } else if (item.type === 'folder') {
          migratedRepository.push({
            type: 'folder',
            id: item.id,
            name: item.name,
            icon: item.icon || 'fa-folder',
            color: item.color || document.documentElement.style.getPropertyValue('--SmartThemeBodyColor'),
            value: Array.isArray(item.value) ? item.value.map((s: any) => new Script(s)) : [],
          });
        }
      } else {
        log.warn('[ScriptManager] 无法解析的脚本数据:', item);
      }
    }

    if (needsMigration) {
      this.saveMigratedRepository(migratedRepository, type);
    }

    return extractScriptsFromRepository(migratedRepository);
  }

  /**
   * 保存迁移后的仓库数据
   * @param repository 迁移后的仓库数据
   * @param type 脚本类型
   */
  private async saveMigratedRepository(repository: ScriptRepositoryItem[], type: ScriptType): Promise<void> {
    try {
      if (type === ScriptType.GLOBAL) {
        saveSettingValue('script.scriptsRepository', repository);
      } else {
        if (!this_chid) {
          log.warn('[ScriptManager] 无法保存角色脚本迁移数据：当前角色为空');
          return;
        }
        //@ts-ignore
        await writeExtensionField(this_chid, 'TavernHelper_scripts', repository);
      }
      log.info(`[ScriptManager] 成功迁移${type}脚本数据结构`);
    } catch (error) {
      log.error(`[ScriptManager] 迁移${type}脚本数据失败:`, error);
    }
  }

  /**
   * 获取全局脚本列表
   */
  getGlobalScripts(): Script[] {
    return this.globalScripts;
  }

  /**
   * 获取角色脚本列表
   */
  getCharacterScripts(): Script[] {
    //@ts-ignore
    const rawCharacterRepository = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    this.characterScripts = this.migrateAndExtractScripts(rawCharacterRepository, ScriptType.CHARACTER);
    return this.characterScripts;
  }

  /**
   * 根据ID获取脚本
   * @param id 脚本ID
   * @returns 脚本对象，如果不存在则返回undefined
   */
  getScriptById(id: string): Script | undefined {
    let script = this.globalScripts.find((s: Script) => s.id === id);
    if (script) return script;

    script = this.characterScripts.find((s: Script) => s.id === id);
    if (script) return script;

    return undefined;
  }

  /**
   * 保存单个脚本到设置中，不存在则添加到末尾，存在则覆盖
   * @param script 脚本
   * @param type 脚本类型
   */
  async saveScript(script: Script, type: ScriptType): Promise<void> {
    if (!script.name || script.name.trim() === '') {
      throw new Error('[ScriptManager] 保存失败，脚本名称为空');
    }

    const rawRepository =
      type === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : //@ts-ignore
          characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

    const repository = this.ensureRepositoryStructure(rawRepository);

    let foundIndex = -1;
    let foundInFolder = false;
    let folderIndex = -1;

    for (let i = 0; i < repository.length; i++) {
      const item = repository[i];
      if (item.type === 'script' && (item.value as Script).id === script.id) {
        foundIndex = i;
        break;
      } else if (item.type === 'folder') {
        const scripts = item.value as Script[];
        const scriptIndex = scripts.findIndex(s => s.id === script.id);
        if (scriptIndex !== -1) {
          foundInFolder = true;
          folderIndex = i;
          foundIndex = scriptIndex;
          break;
        }
      }
    }

    if (foundInFolder && folderIndex >= 0) {
      const folder = repository[folderIndex];
      (folder.value as Script[])[foundIndex] = script;
    } else if (foundIndex >= 0) {
      (repository[foundIndex].value as Script) = script;
    } else {
      repository.push({
        type: 'script',
        value: script,
      });
    }

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }

    this.loadScripts();
  }

  /**
   * 确保仓库使用新的数据结构
   * @param rawRepository 原始仓库数据
   * @returns 规范化的仓库数据
   */
  private ensureRepositoryStructure(rawRepository: any[]): ScriptRepositoryItem[] {
    const repository: ScriptRepositoryItem[] = [];

    for (const item of rawRepository) {
      if (isScript(item)) {
        repository.push({
          type: 'script',
          value: new Script(item),
        });
      } else if (isScriptRepositoryItem(item)) {
        if (item.type === 'script') {
          repository.push({
            type: 'script',
            value: new Script(item.value as Partial<Script>),
          });
        } else if (item.type === 'folder') {
          if (!item.icon) {
            item.icon = 'fa-folder';
          }
          if (!item.color) {
            item.color = document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');
          }
          repository.push({
            ...item,
            value: Array.isArray(item.value) ? item.value.map((s: any) => new Script(s)) : [],
          });
        }
      } else {
        try {
          repository.push({
            type: 'script',
            value: new Script(item),
          });
        } catch (error) {
          log.warn('[ScriptManager] 无法解析的脚本数据:', item, error);
        }
      }
    }

    return repository;
  }

  /**
   * 保存全局脚本数组到扩展设置
   * @param array 脚本数组
   */
  async saveGlobalScripts(array: Script[]): Promise<void> {
    saveSettingValue('script.scriptsRepository', array);
    this.globalScripts = array;
  }

  /**
   * 保存脚本数组到角色卡数据
   * @param array 脚本数组
   */
  async saveCharacterScripts(array: Script[]): Promise<void> {
    if (!this_chid) {
      throw new Error('[ScriptManager] 保存失败，当前角色为空');
    }

    //@ts-ignore
    await writeExtensionField(this_chid, 'TavernHelper_scripts', array);

    this.characterScripts = array;
  }

  /**
   * 保存全局脚本仓库项数组到扩展设置
   * @param repository 仓库项数组
   */
  async saveGlobalRepositoryItems(repository: ScriptRepositoryItem[]): Promise<void> {
    saveSettingValue('script.scriptsRepository', repository);
    this.globalScripts = extractScriptsFromRepository(repository);
  }

  /**
   * 保存脚本仓库项数组到角色卡数据
   * @param repository 仓库项数组
   */
  async saveCharacterRepositoryItems(repository: ScriptRepositoryItem[]): Promise<void> {
    if (!this_chid) {
      throw new Error('[ScriptManager] 保存失败，当前角色为空');
    }
    //@ts-ignore
    await writeExtensionField(this_chid, 'TavernHelper_scripts', repository);

    this.characterScripts = extractScriptsFromRepository(repository);
  }

  /**
   * 从脚本库中删除脚本
   * @param id 脚本ID
   * @param type 脚本类型
   */
  async deleteScript(id: string, type: ScriptType): Promise<void> {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    let scriptFound = false;

    for (let i = 0; i < repository.length; i++) {
      const item = repository[i];
      if (item.type === 'script' && (item.value as Script).id === id) {
        repository.splice(i, 1);
        scriptFound = true;
        break;
      } else if (item.type === 'folder') {
        const scripts = item.value as Script[];
        const foundIndex = scripts.findIndex(s => s.id === id);
        if (foundIndex !== -1) {
          scripts.splice(foundIndex, 1);
          scriptFound = true;
          break;
        }
      }
    }

    if (!scriptFound) {
      throw new Error('[ScriptManager] 删除脚本失败，脚本不存在');
    }

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }
  }

  /**
   * 更新脚本启用状态
   * @param type 脚本类型
   * @param enable 是否启用
   */
  async updateScriptTypeEnableState(type: ScriptType, enable: boolean): Promise<void> {
    if (type === ScriptType.GLOBAL) {
      saveSettingValue('script.global_script_enabled', enable);
      this._isGlobalScriptEnabled = enable;
    } else {
      const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
      //@ts-ignore
      const avatar = characters?.[this_chid]?.avatar;

      if (enable) {
        if (avatar && !charactersWithScripts.includes(avatar)) {
          charactersWithScripts.push(avatar);
        }
      } else {
        const index = charactersWithScripts.indexOf(avatar);
        if (index !== -1) {
          charactersWithScripts.splice(index, 1);
        }
      }

      saveSettingValue('script.characters_with_scripts', charactersWithScripts);
      this._isCharacterScriptEnabled = enable;
    }
  }

  /**
   * 获取脚本的类型
   * @param script 脚本对象
   * @returns 脚本类型
   */
  public getScriptType(script: Script): ScriptType {
    return this.globalScripts.some(s => s.id === script.id) ? ScriptType.GLOBAL : ScriptType.CHARACTER;
  }

  /**
   * 刷新角色脚本启用状态
   */
  refreshCharacterScriptEnabledState(): void {
    this._isCharacterScriptEnabled = this.checkCharacterScriptEnabled();
  }

  /**
   * 获取全局脚本仓库项
   */
  getGlobalRepositoryItems(): ScriptRepositoryItem[] {
    const rawRepository = getSettingValue('script.scriptsRepository') || [];
    return this.ensureRepositoryStructure(rawRepository);
  }

  /**
   * 获取角色脚本仓库项
   */
  getCharacterRepositoryItems(): ScriptRepositoryItem[] {
    //@ts-ignore
    const rawRepository = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    return this.ensureRepositoryStructure(rawRepository);
  }

  /**
   * 创建文件夹
   * @param name 文件夹名称
   * @param type 脚本类型
   * @param icon 文件夹图标（可选）
   * @param color 文件夹颜色（可选）
   * @returns 新创建的文件夹ID
   */
  async createFolder(name: string, type: ScriptType, icon?: string, color?: string): Promise<string> {
    if (!name || name.trim() === '') {
      throw new Error('[ScriptManager] 文件夹名称不能为空');
    }

    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    const existingFolder = repository.find(item => item.type === 'folder' && item.name === name.trim());
    if (existingFolder) {
      throw new Error('[ScriptManager] 文件夹名称已存在');
    }

    const folderId = uuidv4();
    const newFolder: ScriptRepositoryItem = {
      type: 'folder',
      id: folderId,
      name: name.trim(),
      icon: icon || 'fa-folder',
      color: color || document.documentElement.style.getPropertyValue('--SmartThemeBodyColor'),
      value: [],
    };

    repository.unshift(newFolder);

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }

    return folderId;
  }

  /**
   * 编辑文件夹
   * @param folderId 文件夹ID
   * @param newName 新名称
   * @param type 脚本类型
   * @param newIcon 新图标
   * @param newColor 新颜色
   */
  async editFolder(
    folderId: string,
    newName: string,
    type: ScriptType,
    newIcon?: string,
    newColor?: string,
  ): Promise<void> {
    if (!newName || newName.trim() === '') {
      throw new Error('[ScriptManager] 文件夹名称不能为空');
    }

    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    const folderIndex = repository.findIndex(item => item.type === 'folder' && item.id === folderId);
    if (folderIndex === -1) {
      throw new Error('[ScriptManager] 文件夹不存在');
    }

    const existingFolder = repository.find(
      item => item.type === 'folder' && item.name === newName.trim() && item.id !== folderId,
    );
    if (existingFolder) {
      throw new Error('[ScriptManager] 文件夹名称已存在');
    }

    repository[folderIndex].name = newName.trim();
    if (newIcon !== undefined) {
      repository[folderIndex].icon = newIcon;
    }
    if (newColor !== undefined) {
      repository[folderIndex].color = newColor;
    }

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }
  }

  /**
   * 删除文件夹（同时删除内部的所有脚本）
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  async deleteFolder(folderId: string, type: ScriptType): Promise<void> {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    const folderIndex = repository.findIndex(item => item.type === 'folder' && item.id === folderId);
    if (folderIndex === -1) {
      throw new Error('[ScriptManager] 文件夹不存在');
    }

    repository.splice(folderIndex, 1);

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }
  }

  /**
   * 将项目（脚本或文件夹）移动到其他类型的仓库
   * @param item 要移动的项目信息
   * @param sourceType 源类型
   */
  async moveItemToOtherType(
    item: { type: 'script'; id: string; value: Script } | { type: 'folder'; id: string },
    sourceType: ScriptType,
  ): Promise<void> {
    const targetType = getOppositeScriptType(sourceType);

    const sourceRepository =
      sourceType === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    let itemFound = false;
    let foundItem: ScriptRepositoryItem | null = null;

    if (item.type === 'script') {
      for (let i = 0; i < sourceRepository.length; i++) {
        const repoItem = sourceRepository[i];
        if (repoItem.type === 'script' && (repoItem.value as Script).id === item.id) {
          foundItem = repoItem;
          sourceRepository.splice(i, 1);
          itemFound = true;
          break;
        } else if (repoItem.type === 'folder') {
          const scripts = repoItem.value as Script[];
          const foundIndex = scripts.findIndex(s => s.id === item.id);
          if (foundIndex !== -1) {
            foundItem = { type: 'script', value: scripts[foundIndex] };
            scripts.splice(foundIndex, 1);
            itemFound = true;
            break;
          }
        }
      }

      if (!itemFound) {
        throw new Error('[ScriptManager] 移动脚本失败，脚本不存在');
      }
    } else if (item.type === 'folder') {
      const folderIndex = sourceRepository.findIndex(repoItem => repoItem.type === 'folder' && repoItem.id === item.id);
      if (folderIndex === -1) {
        throw new Error('[ScriptManager] 文件夹不存在');
      }

      foundItem = sourceRepository[folderIndex];
      sourceRepository.splice(folderIndex, 1);
      itemFound = true;
    }

    if (!itemFound || !foundItem) {
      throw new Error('[ScriptManager] 移动失败，项目不存在');
    }

    const targetRepository =
      targetType === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    if (foundItem.type === 'folder') {
      const existingFolder = targetRepository.find(
        repoItem => repoItem.type === 'folder' && repoItem.name === foundItem!.name,
      );
      if (existingFolder) {
        toastr.error('目标位置已存在同名文件夹');
        throw new Error('[ScriptManager] 目标位置已存在同名文件夹');
      }
      targetRepository.unshift(foundItem);
    } else {
      targetRepository.push(foundItem);
    }

    if (sourceType === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(sourceRepository);
      await this.saveCharacterRepositoryItems(targetRepository);
    } else {
      await this.saveCharacterRepositoryItems(sourceRepository);
      await this.saveGlobalRepositoryItems(targetRepository);
    }
  }

  /**
   * 将脚本移动到文件夹
   * @param scriptId 脚本ID
   * @param targetFolderId 目标文件夹ID，如果为null则移动到根级别
   * @param type 脚本类型
   */
  async moveScriptToFolder(scriptId: string, targetFolderId: string | null, type: ScriptType): Promise<void> {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    let script: Script | null = null;

    for (let i = 0; i < repository.length; i++) {
      const item = repository[i];
      if (item.type === 'script' && (item.value as Script).id === scriptId) {
        script = item.value as Script;
        repository.splice(i, 1);
        break;
      } else if (item.type === 'folder') {
        const scripts = item.value as Script[];
        const foundIndex = scripts.findIndex(s => s.id === scriptId);
        if (foundIndex !== -1) {
          script = scripts[foundIndex];
          scripts.splice(foundIndex, 1);
          break;
        }
      }
    }

    if (!script) {
      throw new Error('[ScriptManager] 脚本不存在');
    }

    if (targetFolderId === null) {
      repository.push({
        type: 'script',
        value: script,
      });
    } else {
      const targetFolder = repository.find(item => item.type === 'folder' && item.id === targetFolderId);
      if (!targetFolder) {
        throw new Error('[ScriptManager] 目标文件夹不存在');
      }

      const folderScripts = targetFolder.value as Script[];
      const existingScript = folderScripts.find(s => s.name === script.name);
      if (existingScript) {
        throw new Error('[ScriptManager] 文件夹中已存在同名脚本');
      }

      folderScripts.push(script);
    }

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalRepositoryItems(repository);
    } else {
      await this.saveCharacterRepositoryItems(repository);
    }
  }

  /**
   * 获取文件夹中的脚本列表
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  getFolderScripts(folderId: string, type: ScriptType): Script[] {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    const folder = repository.find(item => item.type === 'folder' && item.id === folderId);

    if (!folder) {
      return [];
    }

    return folder.value as Script[];
  }

  /**
   * 获取根级别的脚本列表
   * @param type 脚本类型
   */
  getRootScripts(type: ScriptType): Script[] {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    return repository.filter(item => item.type === 'script').map(item => item.value as Script);
  }

  /**
   * 获取所有文件夹列表
   * @param type 脚本类型
   */
  getFolders(type: ScriptType): ScriptRepositoryItem[] {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    return repository.filter(item => item.type === 'folder');
  }

  /**
   * 批量切换文件夹内所有脚本的启用状态
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param enable 是否启用
   */
  async toggleFolderScripts(folderId: string, type: ScriptType, enable: boolean): Promise<void> {
    const repository =
      type === ScriptType.GLOBAL ? this.getGlobalRepositoryItems() : this.getCharacterRepositoryItems();

    const folder = repository.find(item => item.type === 'folder' && item.id === folderId);
    if (!folder) {
      throw new Error('[ScriptManager] 文件夹不存在');
    }

    const scripts = folder.value as Script[];
    let hasChanges = false;

    for (const script of scripts) {
      if (script.enabled !== enable) {
        script.enabled = enable;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      if (type === ScriptType.GLOBAL) {
        await this.saveGlobalRepositoryItems(repository);
      } else {
        await this.saveCharacterRepositoryItems(repository);
      }
    }
  }

  /**
   * 获取文件夹内脚本的整体启用状态
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @returns 'all' - 全部启用, 'none' - 全部禁用
   */
  getFolderScriptsState(folderId: string, type: ScriptType): 'all' | 'none' {
    const scripts = this.getFolderScripts(folderId, type);

    if (scripts.length === 0) {
      return 'none';
    }

    const enabledCount = scripts.filter(script => script.enabled).length;

    if (enabledCount === 0) {
      return 'none';
    } else {
      return 'all';
    }
  }
}

/**
 * 从脚本允许列表中删除角色
 * @param param0
 */
export async function purgeEmbeddedScripts({ character }: { character: any }): Promise<void> {
  const avatar = character?.character?.avatar;
  const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
  if (avatar) {
    localStorage.removeItem(`AlertScript_${avatar}`);
    if (charactersWithScripts?.includes(avatar)) {
      const index = charactersWithScripts.indexOf(avatar);
      if (index !== -1) {
        charactersWithScripts.splice(index, 1);
        saveSettingValue('script.characters_with_scripts', charactersWithScripts);
      }
    }
  }
}
