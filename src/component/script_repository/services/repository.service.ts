import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { download, uuidv4 } from '@sillytavern/scripts/utils';
import _ from 'lodash';
import log from 'loglevel';
import { toRaw } from 'vue';
import type { Script, ScriptFolder, ScriptRepository, ScriptRepositoryItem } from '../schemas/script.schema';

import { ScriptFolderSchema, ScriptRepositoryItemSchema, ScriptSchema, ScriptType } from '../schemas/script.schema';
/**
 * 脚本仓库服务
 */
export class RepositoryService {
  private static instance: RepositoryService;

  private constructor() {}

  public static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  /**
   * 递归去除 Vue 响应式代理，返回纯数据结构
   */
  private deepToRaw<T>(value: T, seen: WeakMap<any, any> = new WeakMap()): T {
    const unwrapped: any = toRaw(value as any);
    if (unwrapped === null || typeof unwrapped !== 'object') return unwrapped as T;

    if (seen.has(unwrapped)) return seen.get(unwrapped);

    if (Array.isArray(unwrapped)) {
      const arr: any[] = [];
      seen.set(unwrapped, arr);
      for (const item of unwrapped) {
        arr.push(this.deepToRaw(item, seen));
      }
      return arr as unknown as T;
    }

    const plain: Record<string, any> = {};
    seen.set(unwrapped, plain);
    for (const key of Object.keys(unwrapped)) {
      plain[key] = this.deepToRaw(unwrapped[key], seen);
    }
    return plain as unknown as T;
  }

  /**
   * 加载仓库数据
   * @param {ScriptType} type 脚本类型
   * @returns {ScriptRepository} 仓库数据
   */

  public loadRepositoryByType(type: ScriptType): ScriptRepository {
    switch (type) {
      case 'global':
        return getSettingValue('script.scriptsRepository') || [];
      case 'character':
        //@ts-ignore
        return characters?.[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
      case 'preset': {
        const presetManager = getPresetManager();
        // @ts-ignore
        const raw = presetManager.readPresetExtensionField({ path: 'tavern_helper_scripts' });
        const repository = _.get(raw, 'repository', []);
        return repository;
      }
    }
  }

  /**
   * 保存仓库数据
   * @param {ScriptType} type 脚本类型
   * @param {ScriptRepository} repository 仓库数据
   */
  public async saveRepositoryByType(type: ScriptType, repository: ScriptRepository): Promise<void> {
    switch (type) {
      case 'global':
        saveSettingValue('script.scriptsRepository', this.deepToRaw(repository));
        return;
      case 'character':
        if (this_chid === undefined) {
          throw new Error('保存失败：当前角色为空');
        }
        //@ts-ignore
        await writeExtensionField(this_chid, 'TavernHelper_scripts', this.deepToRaw(repository));
        return;
      case 'preset': {
        const presetManager = getPresetManager();
        const isEnabled = presetManager.readPresetExtensionField({ path: 'tavern_helper_scripts.enabled' }) || false;
        // @ts-ignore
        await presetManager.writePresetExtensionField({
          path: 'tavern_helper_scripts',
          value: { repository: this.deepToRaw(repository), enabled: isEnabled },
        });
        return;
      }
    }
  }

  /**
   * 保存预设脚本开关状态
   * @param {boolean} enabled 开关状态
   */
  public async savePresetEnabledState(enabled: boolean): Promise<void> {
    const presetManager = getPresetManager();
    // @ts-ignore
    const currentExtension = presetManager.readPresetExtensionField({ path: 'tavern_helper_scripts' }) || {};
    // @ts-ignore
    await presetManager.writePresetExtensionField({
      path: 'tavern_helper_scripts',
      value: {
        repository: this.deepToRaw(currentExtension.repository || []),
        enabled: enabled,
      },
    });
  }

  /**
   * 保存全局脚本开关状态
   * @param {boolean} enabled 开关状态
   */
  public async saveGlobalEnabledState(enabled: boolean): Promise<void> {
    saveSettingValue('script.global_script_enabled', enabled);
  }

  /**
   * 保存角色脚本开关状态（通过白名单机制）
   * @param {boolean} enabled 开关状态
   */
  public async saveCharacterEnabledState(enabled: boolean): Promise<void> {
    const avatar = (this_chid && (characters as any)?.[this_chid]?.avatar) || '';
    if (!avatar) return;

    const allowList: string[] = getSettingValue('script.characters_with_scripts') || [];
    const isCurrentlyWhitelisted = allowList.includes(avatar);

    if (enabled && !isCurrentlyWhitelisted) {
      // 启用且不在白名单中，添加到白名单
      allowList.push(avatar);
      saveSettingValue('script.characters_with_scripts', allowList);
    } else if (!enabled && isCurrentlyWhitelisted) {
      // 禁用且在白名单中，从白名单移除
      const index = allowList.indexOf(avatar);
      if (index > -1) {
        allowList.splice(index, 1);
        saveSettingValue('script.characters_with_scripts', allowList);
      }
    }
  }

  // ===== 脚本操作 =====

  /**
   * 创建脚本
   * @param {ScriptType} type 脚本类型
   * @param {Partial<Script>} payload 脚本数据
   * @returns {string} 脚本ID
   */
  async createScriptInType(type: ScriptType, payload: Partial<Script>): Promise<string> {
    try {
      const script = ScriptRepositoryItemSchema.parse({
        type: 'script',
        value: ScriptSchema.parse(payload),
      });

      const repository = this.loadRepositoryByType(type);
      repository.unshift(script);

      await this.saveRepositoryByType(type, repository);
      return script.id;
    } catch (error) {
      log.error('创建脚本失败:', error);
      throw error;
    }
  }

  /**
   * 更新脚本
   * @param {ScriptType} type 脚本类型
   * @param {Script} script 脚本数据
   */
  async updateScriptInType(type: ScriptType, script: Script): Promise<void> {
    try {
      const newScript = ScriptSchema.parse(script);

      const repository = this.loadRepositoryByType(type);
      const oldScript = this.findScriptById(repository, script.id);

      if (!oldScript) {
        throw new Error('脚本不存在');
      }

      const updateFields = _.pickBy(newScript, value => value !== undefined);
      // 使用assign进行替换更新，因为用户传入的是完整的Script对象状态
      _.assign(oldScript, updateFields);

      ScriptSchema.parse(oldScript);

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      log.error('更新脚本失败:', error);
      throw error;
    }
  }

  /**
   * 删除脚本
   */
  async deleteScriptInType(type: ScriptType, scriptId: string): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);
      this.removeScriptById(repository, scriptId);

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      log.error('删除脚本失败:', error);
      throw error;
    }
  }

  /**
   * 通过ID获取脚本
   * @param type 脚本类型
   * @param scriptId 脚本ID
   * @returns 脚本
   */
  async getScriptFromType(type: ScriptType, scriptId: string): Promise<Script | null> {
    try {
      const repository = this.loadRepositoryByType(type);
      return this.findScriptById(repository, scriptId);
    } catch (error) {
      log.error('获取脚本失败:', error);
      return null;
    }
  }

  // ===== 文件夹操作 =====

  /**
   * 创建文件夹
   */
  async createFolderInType(type: ScriptType, payload: ScriptFolder): Promise<string> {
    try {
      const folder = ScriptRepositoryItemSchema.parse({
        type: 'folder',
        value: ScriptFolderSchema.parse(payload),
      });

      const repository = this.loadRepositoryByType(type);
      repository.unshift(folder);

      await this.saveRepositoryByType(type, repository);
      return folder.id;
    } catch (error) {
      log.error('创建文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolderInType(type: ScriptType, folderId: string): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);
      this.removeFolderById(repository, folderId);

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      log.error('删除文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 更新文件夹（名称/图标/颜色）
   * @param type 脚本类型
   * @param folderId 文件夹ID
   * @param payload 更新内容
   */
  async updateFolderInType(type: ScriptType, folderId: string, payload: Partial<ScriptFolder>): Promise<void> {
    try {
      if (_.isEmpty(payload) || _.every(payload, _.isUndefined)) {
        throw new Error('至少需要提供一个要更新的字段');
      }

      const validatedPayload = ScriptFolderSchema.partial().parse(payload);

      const repository = this.loadRepositoryByType(type);

      const folderItem = this.findFolderById(repository, folderId);

      // 使只更新有效的字段
      const updateFields = _.pickBy(validatedPayload, value => !_.isUndefined(value));

      _.assign(folderItem, updateFields);

      const folderValidation = ScriptRepositoryItemSchema.safeParse(folderItem);
      if (!folderValidation.success) {
        throw new Error(`更新后的文件夹数据无效: ${folderValidation.error.message}`);
      }

      await this.saveRepositoryByType(type, repository);

      log.debug(`文件夹 ${folderId} 更新成功`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('更新文件夹失败:', errorMessage);

      throw new Error(`更新文件夹失败: ${errorMessage}`);
    }
  }

  /**
   * 移动脚本到文件夹
   */
  async moveScriptWithinType(type: ScriptType, scriptId: string, targetFolderId: string | null): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);

      // 从原位置移除脚本
      const script = this.removeScriptById(repository, scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }

      if (targetFolderId) {
        const targetFolder = this.findFolderById(repository, targetFolderId);
        if (!targetFolder) {
          throw new Error('目标文件夹不存在');
        }
        const folderValue = _.get(targetFolder, 'value');
        if (!_.isArray(folderValue)) {
          throw new Error('文件夹数据格式错误');
        }
        folderValue.unshift(script);
      } else {
        // 移动到根目录
        repository.unshift(script as unknown as ScriptRepositoryItem);
      }

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      log.error('移动脚本失败:', error);
      throw error;
    }
  }

  /**
   * 重新排序仓库根级项目
   */
  async reorderRepositoryItems(type: ScriptType, orderedIds: string[]): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);
      const idToItem = new Map<string, ScriptRepositoryItem>();

      // 先按仓库项建立ID映射，再兜底纯脚本
      for (const item of repository) {
        const repoItemResult = ScriptRepositoryItemSchema.safeParse(item);
        if (repoItemResult.success) {
          const repoItem = repoItemResult.data as any;
          if (repoItem.type === 'folder') {
            idToItem.set(repoItem.id, item);
          } else if (repoItem.type === 'script') {
            idToItem.set(repoItem.value.id, item);
          }
          continue;
        }
        if (ScriptSchema.safeParse(item).success) {
          const script = item as unknown as Script;
          idToItem.set(script.id, item as unknown as ScriptRepositoryItem);
        }
      }

      // 按新顺序重建数组
      const reordered: ScriptRepositoryItem[] = [];
      for (const id of orderedIds) {
        const item = idToItem.get(id);
        if (item) {
          reordered.push(item);
        }
      }

      // 只有当重排后的数量与原数量一致时才应用
      if (reordered.length === repository.length) {
        repository.splice(0, repository.length, ...reordered);
        await this.saveRepositoryByType(type, repository);
      } else {
        throw new Error('重排项目数量不匹配');
      }
    } catch (error) {
      log.error('重新排序仓库项目失败:', error);
      throw error;
    }
  }

  /**
   * 重新排序文件夹内的脚本
   */
  async reorderFolderScripts(type: ScriptType, folderId: string, orderedScriptIds: string[]): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);
      const folder = this.findFolderById(repository, folderId);

      if (!folder) {
        throw new Error('文件夹不存在');
      }

      const folderValue = _.get(folder, 'value');
      if (!_.isArray(folderValue)) {
        throw new Error('文件夹数据格式错误');
      }

      const scripts = folderValue as Script[];
      const idToScript = new Map(scripts.map(s => [s.id, s] as [string, Script]));
      const reordered = orderedScriptIds.map(id => idToScript.get(id)).filter(Boolean) as Script[];

      // 只有当重排后的数量与原数量一致时才应用
      if (reordered.length === scripts.length) {
        scripts.splice(0, scripts.length, ...reordered);
        await this.saveRepositoryByType(type, repository);
      } else {
        throw new Error('重排脚本数量不匹配');
      }
    } catch (error) {
      log.error('重新排序文件夹脚本失败:', error);
      throw error;
    }
  }

  /**
   * 通过ID获取脚本
   * @param repository 仓库
   * @param scriptId 脚本ID
   * @returns 脚本
   */

  public findScriptById(repository: ScriptRepository, scriptId: string): Script | null {
    const rootItem = _.find(repository, item => {
      if (ScriptSchema.safeParse(item).success) {
        return _.get(item, 'id') === scriptId;
      }
      return false;
    });

    if (rootItem) {
      return rootItem as unknown as Script;
    }

    const repositoryItem = _.find(repository, item => {
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repoItem = item as any;
        if (_.get(repoItem, 'type') === 'script') {
          return _.get(repoItem, 'value.id') === scriptId;
        } else if (_.get(repoItem, 'type') === 'folder' && Array.isArray(_.get(repoItem, 'value'))) {
          return _.some(_.get(repoItem, 'value', []), (script: Script) => _.get(script, 'id') === scriptId);
        }
      }
      return false;
    }) as any;

    if (repositoryItem) {
      if (_.get(repositoryItem, 'type') === 'script') {
        return _.get(repositoryItem, 'value') as unknown as Script;
      } else if (_.get(repositoryItem, 'type') === 'folder') {
        return _.find(
          _.get(repositoryItem, 'value', []),
          (script: Script) => _.get(script, 'id') === scriptId,
        ) as unknown as Script;
      }
    }

    return null;
  }

  /**
   * 在所有类型仓库中查找脚本
   * 返回第一个匹配的脚本以及其所在类型
   */
  public findScriptInAllTypes(scriptId: string): { script: Script; type: ScriptType } | null {
    const types: ScriptType[] = ['global', 'character', 'preset'];
    for (const type of types) {
      const repo = this.loadRepositoryByType(type);
      const script = this.findScriptById(repo, scriptId);
      if (script) return { script, type };
    }
    return null;
  }

  /**
   * 获取单个仓库中的所有脚本
   * @param repository 脚本仓库
   * @returns 该仓库中的所有脚本数组
   */
  public getScriptsFromRepository(repository: ScriptRepository): Script[] {
    const scripts: Script[] = [];

    for (const item of repository) {
      // 先解析仓库项目，避免把包装项误判为纯脚本
      const repoItemResult = ScriptRepositoryItemSchema.safeParse(item);
      if (repoItemResult.success) {
        const repoItem = repoItemResult.data as any;
        if (repoItem.type === 'script' && repoItem.value) {
          scripts.push(repoItem.value as Script);
          continue;
        } else if (repoItem.type === 'folder' && Array.isArray(repoItem.value)) {
          scripts.push(...(repoItem.value as Script[]));
          continue;
        }
      }

      // 兼容顶层纯 Script
      if (ScriptSchema.safeParse(item).success) {
        scripts.push(item as unknown as Script);
        continue;
      }
    }

    return scripts;
  }

  // ===== 辅助方法 =====

  /**
   * 从仓库中移除文件夹
   * @param repository
   * @param folderId
   */
  private removeFolderById(repository: ScriptRepository, folderId: string): void {
    // 查找根级文件夹
    const rootFolderItem = _.find(repository, item => {
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as any;
        return repositoryItem.type === 'folder' && repositoryItem.id === folderId;
      }
      return false;
    });

    if (rootFolderItem) {
      _.remove(repository, item => item === rootFolderItem);
      return;
    }

    throw new Error('文件夹不存在');
  }

  /**
   * 从仓库中移除脚本
   * @param repository
   * @param scriptId
   * @returns 被移除的脚本，如果不存在则返回null
   */
  public removeScriptById(repository: ScriptRepository, scriptId: string): Script | null {
    // 优先处理仓库项，避免误将包装项当作纯脚本
    const repoItemIndex = repository.findIndex(item => {
      const res = ScriptRepositoryItemSchema.safeParse(item);
      if (!res.success) return false;
      const repoItem = res.data as any;
      if (repoItem.type === 'script') {
        return repoItem.value?.id === scriptId;
      } else if (repoItem.type === 'folder' && Array.isArray(repoItem.value)) {
        return (repoItem.value as Script[]).some(s => s.id === scriptId);
      }
      return false;
    });

    if (repoItemIndex !== -1) {
      const repoItem = repository[repoItemIndex] as any;
      if (repoItem.type === 'script') {
        // 根级包装脚本
        const script = repoItem.value as Script;
        repository.splice(repoItemIndex, 1);
        return script;
      } else if (repoItem.type === 'folder') {
        // 文件夹内脚本
        const scripts = repoItem.value as Script[];
        const idx = scripts.findIndex((s: Script) => s.id === scriptId);
        if (idx !== -1) {
          const [removed] = scripts.splice(idx, 1);
          return removed;
        }
      }
    }

    // 兼容顶层纯 Script
    const rootScriptItem = _.find(
      repository,
      item => ScriptSchema.safeParse(item).success && (item as unknown as Script).id === scriptId,
    );

    if (rootScriptItem) {
      _.remove(repository, item => item === rootScriptItem);
      return rootScriptItem as unknown as Script;
    }

    // 没有找到脚本
    return null;
  }
  /**
   * 通过ID获取文件夹
   * @param repository 仓库
   * @param folderId 文件夹ID
   * @returns 文件夹项，包含文件夹的所有信息
   */
  public findFolderById(repository: ScriptRepository, folderId: string): ScriptRepositoryItem | null {
    for (const item of repository) {
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as any;
        if (repositoryItem.type === 'folder' && repositoryItem.id === folderId) {
          return repositoryItem;
        }
      }
    }
    return null;
  }

  /**
   * 导入脚本到指定类型的根目录
   * @param type 脚本类型
   * @param scripts 脚本数组
   */
  async importScriptsToType(type: ScriptType, scripts: Script[]): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);

      for (const scriptData of scripts) {
        const script = ScriptSchema.parse(scriptData);
        repository.unshift(script as unknown as ScriptRepositoryItem);
      }

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      log.error('导入脚本失败:', error);
      throw error;
    }
  }

  /**
   * 导出脚本并生成下载文件
   * @param scriptIds 脚本ID数组
   * @param type 脚本类型
   * @param format 导出格式，'single'为单个脚本，'batch'为批量脚本数组
   */
  async exportScripts(scriptIds: string[], type: ScriptType, format: 'single' | 'batch' = 'batch'): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);
      const scripts: Script[] = [];

      for (const scriptId of scriptIds) {
        const script = this.findScriptById(repository, scriptId);
        if (script) {
          scripts.push(script);
        }
      }

      if (_.isEmpty(scripts)) {
        throw new Error('没有找到可导出的脚本');
      }

      // 根据格式生成和下载文件

      if (format === 'single' && scripts.length === 1) {
        // 单个脚本导出
        const script = scripts[0];
        const scriptName = _.get(script, 'name', 'script').replace(/[<>:"/\\|?*]/g, '_');
        const filename = `${type === 'preset' ? 'preset-script' : 'script'}-${scriptName}.json`;

        const content = JSON.stringify(script, null, 2);
        download(content, filename, 'application/json');
      } else {
        // 批量脚本导出 - 为每个脚本生成独立的JSON文件
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const typeName = type === 'global' ? 'global' : type === 'character' ? 'character' : 'preset';
        _.forEach(scripts, (script, index) => {
          const scriptName = _.get(script, 'name', 'script').replace(/[<>:"/\\|?*]/g, '_');
          const filename = `${typeName}-script-${scriptName}-${timestamp}-${index + 1}.json`;

          setTimeout(() => {
            const content = JSON.stringify(script, null, 2);
            download(content, filename, 'application/json');
          }, index * 100);
        });
      }

      log.info(`成功导出 ${scripts.length} 个脚本`);
    } catch (error) {
      log.error('导出脚本失败:', error);
      throw error;
    }
  }

  /**
   * 将指定类型下的文件夹打包为 ZIP 并直接下载
   * 使用zod验证输入，lodash优化对象操作
   */
  async exportFolderToZip(type: ScriptType, folderId: string): Promise<void> {
    try {
      const repository = this.loadRepositoryByType(type);

      const folderItem = _.find(repository, item => {
        const repoItem = item as any;
        return _.get(repoItem, 'type') === 'folder' && _.get(repoItem, 'id') === folderId;
      });

      if (!folderItem) {
        throw new Error('文件夹不存在');
      }

      const folderValidation = ScriptRepositoryItemSchema.safeParse(folderItem);
      if (!folderValidation.success) {
        throw new Error(`文件夹数据结构无效: ${folderValidation.error.message}`);
      }
      const folderName = _.get(folderItem, 'name', 'folder');
      const sanitizedFolderName = _.toString(folderName).replace(/[<>:"/\\|?*]/g, '_');

      const scripts = _.get(folderItem, 'value', []);
      if (!_.isArray(scripts) || _.isEmpty(scripts)) {
        throw new Error('文件夹内没有脚本');
      }

      // @ts-ignore
      if (!window.JSZip) {
        await import('@sillytavern/lib/jszip.min.js');
      }
      // @ts-ignore
      const zip = new JSZip();

      _.forEach(scripts, script => {
        const scriptValidation = ScriptSchema.safeParse(script);
        if (!scriptValidation.success) {
          log.warn(`跳过无效脚本: ${scriptValidation.error.message}`, script);
          return;
        }

        const scriptData = {
          name: _.get(script, 'name', '未命名脚本'),
          content: _.get(script, 'content', ''),
          info: _.get(script, 'info', ''),
          buttons: _.get(script, 'buttons', []),
          data: _.get(script, 'data', {}),
        };

        const scriptName = _.toString(_.get(script, 'name', 'script')).replace(/[<>:"/\\|?*]/g, '_');
        const scriptFileName = `${scriptName}.json`;

        zip.file(`${sanitizedFolderName}/${scriptFileName}`, JSON.stringify(scriptData, null, 2));
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const typeName = type === 'global' ? 'global' : 'character';
      const filename = `folder_${sanitizedFolderName}_${typeName}_${timestamp}.zip`;

      download(zipBlob, filename, 'application/zip');

      log.info(`文件夹 "${folderName}" 导出成功，包含 ${scripts.length} 个脚本`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('导出文件夹失败:', {
        error: errorMessage,
      });

      throw new Error(`导出文件夹失败: ${errorMessage}`);
    }
  }

  /**
   * 检查脚本ID在指定仓库中的冲突
   * @param id 脚本ID
   * @param targetType 目标仓库类型
   * @returns 冲突信息，如果没有冲突返回null
   */
  findIdConflictInTarget(id: string, targetType: ScriptType): { existing: Script; existingType: ScriptType } | null {
    const targetRepo = this.loadRepositoryByType(targetType);
    const targetScripts = this.getScriptsFromRepository(targetRepo);

    const conflictInTarget = targetScripts.find((s: Script) => s.id === id);
    if (conflictInTarget) return { existing: conflictInTarget, existingType: targetType };

    return null;
  }

  /**
   * 导入脚本（支持 JSON/ZIP），包含：
   * - 文件读取与解析
   * - 冲突检测并强制弹窗处理
   * - 实际导入到目标仓库
   * - ZIP 导入：以 ZIP 文件名创建文件夹，内部 json 脚本导入到该文件夹
   *
   * 行为：当某个文件/条目解析失败时，记录错误并继续处理下一个。
   *
   * @param files 文件列表
   * @param targetType 目标仓库类型
   * @returns 导入的脚本数量
   */
  async importScripts(files: FileList, targetType: ScriptType): Promise<number> {
    if (!files?.length) return 0;

    let totalImported = 0;

    const { usePopups } = await import('@/component/script_repository/composables/usePopups');
    const popups = usePopups();

    const importOne = async (scriptRaw: any, folderId: string | null = null): Promise<boolean> => {
      try {
        const script = ScriptSchema.parse(scriptRaw);

        // 检查目标仓库中的 ID 冲突
        const conflict = this.findIdConflictInTarget(script.id, targetType);
        if (conflict) {
          const decision = await popups.resolveImportIdConflict({
            scriptName: script.name,
            existingScriptName: conflict.existing.name,
            existingType: conflict.existingType,
          });

          if (decision === 'cancel') {
            return false;
          }
          if (decision === 'override') {
            await this.deleteScriptInType(conflict.existingType, conflict.existing.id);
          } else if (decision === 'new') {
            script.id = uuidv4();
          }
        }

        const createdId = await this.createScriptInType(targetType, script);

        if (folderId) {
          await this.moveScriptWithinType(targetType, createdId, folderId);
        }

        return true;
      } catch (error) {
        log.error('导入单个脚本失败:', error);
        return false;
      }
    };

    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();

      try {
        if (lower.endsWith('.zip')) {
          // @ts-ignore
          if (!window.JSZip) {
            await import('@sillytavern/lib/jszip.min.js');
          }
          // @ts-ignore
          const zip = new JSZip();
          const buffer = await file.arrayBuffer();
          const loaded = await zip.loadAsync(buffer);

          const folderName = file.name.replace(/\.[^/.]+$/, '');
          const sanitizedFolderName = _.toString(folderName).replace(/[<>:"/\\|?*]/g, '_');

          const folderId = await this.createFolderInType(targetType, {
            name: sanitizedFolderName,
            icon: 'fa-folder',
            color: document.documentElement.style.getPropertyValue('--SmartThemeBodyColor'),
            target: targetType,
          });

          const entries = Object.keys(loaded.files);
          for (const entry of entries) {
            const fileEntry = loaded.files[entry];
            if (!fileEntry || fileEntry.dir) continue;
            if (entry.includes('/')) continue;
            if (!entry.toLowerCase().endsWith('.json')) continue;

            try {
              const text = await fileEntry.async('text');
              const parsed = JSON.parse(text);

              const list = Array.isArray(parsed)
                ? parsed
                : parsed && parsed.name && 'content' in parsed
                  ? [parsed]
                  : null;

              if (!list) {
                log.error(`ZIP 内 JSON 不符合脚本格式，已跳过: ${entry}`);
                continue;
              }

              for (const raw of list) {
                const ok = await importOne(raw, folderId);
                if (ok) totalImported++;
              }
            } catch (e) {
              log.error(`解析 ZIP 条目失败，已跳过: ${entry}`, e);
              continue;
            }
          }
        } else if (lower.endsWith('.json')) {
          const content = await file.text();
          const parsed = JSON.parse(content);

          const scripts = Array.isArray(parsed)
            ? parsed
            : parsed && parsed.name && 'content' in parsed
              ? [parsed]
              : null;

          if (!scripts) {
            log.error(`JSON 文件不符合脚本格式，已跳过: ${file.name}`);
            continue;
          }

          for (const raw of scripts) {
            const ok = await importOne(raw, null);
            if (ok) totalImported++;
          }
        } else {
          log.warn(`不支持的文件类型，已跳过: ${file.name}`);
          continue;
        }
      } catch (error) {
        log.error(`处理文件失败，已跳过: ${file.name}`, error);
        continue;
      }
    }

    return totalImported;
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

// 导出单例实例
export const repositoryService = RepositoryService.getInstance();
