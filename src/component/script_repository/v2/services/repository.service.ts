import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';
import { uuidv4 } from '@sillytavern/scripts/utils';
import type {
  CreateFolderPayload,
  CreateScriptPayload,
  ImportScriptPayload,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';
import { CreateFolderPayloadSchema, CreateScriptPayloadSchema } from '../schemas/payloads.schema';
import type { Repository, Script, ScriptRepositoryItem } from '../schemas/script.schema';
import {
  ScriptRepositoryItemSchema,
  ScriptSchema,
  createDefaultFolderItem,
  createDefaultScript,
} from '../schemas/script.schema';

/**
 * 脚本仓库服务 - 基于V1数据结构的服务层
 * 直接操作V1数据结构，使用zod进行类型验证
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

  // ===== 基础数据读写 =====

  // ===== 无类型 API（分离 char/global） =====

  /** 加载全局仓库数据 */
  async loadGlobalRepository(): Promise<Repository> {
    try {
      const rawData = this.readRawRepository('global');
      return this.validateAndNormalizeRepository(rawData);
    } catch (error) {
      console.error('加载全局仓库数据失败:', error);
      throw error;
    }
  }

  /** 加载角色仓库数据 */
  async loadCharacterRepository(): Promise<Repository> {
    try {
      const rawData = this.readRawRepository('character');
      return this.validateAndNormalizeRepository(rawData);
    } catch (error) {
      console.error('加载角色仓库数据失败:', error);
      throw error;
    }
  }

  /** 保存全局仓库数据 */
  async saveGlobalRepository(repository: Repository): Promise<void> {
    try {
      await this.saveRawRepository('global', repository);
    } catch (error) {
      console.error('保存全局仓库数据失败:', error);
      throw error;
    }
  }

  /** 保存角色仓库数据 */
  async saveCharacterRepository(repository: Repository): Promise<void> {
    try {
      await this.saveRawRepository('character', repository);
    } catch (error) {
      console.error('保存角色仓库数据失败:', error);
      throw error;
    }
  }

  /** 在全局仓库创建脚本 */
  async createGlobalScript(payload: CreateScriptPayload): Promise<string> {
    try {
      const validated = CreateScriptPayloadSchema.parse(payload);
      const scriptId = uuidv4();

      const script = createDefaultScript({
        id: scriptId,
        name: validated.name,
        content: validated.content || '',
        info: validated.info || '',
        enabled: validated.enabled || false,
      });

      const repository = await this.loadGlobalRepository();

      if (validated.folderId) {
        const folderItem = this.findFolderById(repository, validated.folderId);
        if (!folderItem) throw new Error('目标文件夹不存在');
        if (!Array.isArray(folderItem.value)) throw new Error('文件夹数据格式错误');
        folderItem.value.push(script);
      } else {
        repository.push({ type: 'script', value: script });
      }

      await this.saveGlobalRepository(repository);
      return scriptId;
    } catch (error) {
      console.error('创建全局脚本失败:', error);
      throw error;
    }
  }

  /** 在角色仓库创建脚本 */
  async createCharacterScript(payload: CreateScriptPayload): Promise<string> {
    try {
      const validated = CreateScriptPayloadSchema.parse(payload);
      const scriptId = uuidv4();

      const script = createDefaultScript({
        id: scriptId,
        name: validated.name,
        content: validated.content || '',
        info: validated.info || '',
        enabled: validated.enabled || false,
      });

      const repository = await this.loadCharacterRepository();

      if (validated.folderId) {
        const folderItem = this.findFolderById(repository, validated.folderId);
        if (!folderItem) throw new Error('目标文件夹不存在');
        if (!Array.isArray(folderItem.value)) throw new Error('文件夹数据格式错误');
        folderItem.value.push(script);
      } else {
        repository.push({ type: 'script', value: script });
      }

      await this.saveCharacterRepository(repository);
      return scriptId;
    } catch (error) {
      console.error('创建角色脚本失败:', error);
      throw error;
    }
  }

  /** 更新全局脚本 */
  async updateGlobalScript(scriptId: string, payload: UpdateScriptPayload): Promise<void> {
    try {
      const repository = await this.loadGlobalRepository();
      const script = this.findScriptById(repository, scriptId);
      if (!script) throw new Error('脚本不存在');

      if (payload.name !== undefined) script.name = payload.name;
      if (payload.content !== undefined) script.content = payload.content;
      if (payload.info !== undefined) script.info = payload.info;
      if (payload.enabled !== undefined) script.enabled = payload.enabled;
      if (payload.buttons !== undefined) script.buttons = payload.buttons;
      if (payload.data !== undefined) script.data = payload.data;

      ScriptSchema.parse(script);
      await this.saveGlobalRepository(repository);
    } catch (error) {
      console.error('更新全局脚本失败:', error);
      throw error;
    }
  }

  /** 更新角色脚本 */
  async updateCharacterScript(scriptId: string, payload: UpdateScriptPayload): Promise<void> {
    try {
      const repository = await this.loadCharacterRepository();
      const script = this.findScriptById(repository, scriptId);
      if (!script) throw new Error('脚本不存在');

      if (payload.name !== undefined) script.name = payload.name;
      if (payload.content !== undefined) script.content = payload.content;
      if (payload.info !== undefined) script.info = payload.info;
      if (payload.enabled !== undefined) script.enabled = payload.enabled;
      if (payload.buttons !== undefined) script.buttons = payload.buttons;
      if (payload.data !== undefined) script.data = payload.data;

      ScriptSchema.parse(script);
      await this.saveCharacterRepository(repository);
    } catch (error) {
      console.error('更新角色脚本失败:', error);
      throw error;
    }
  }

  /** 删除全局脚本 */
  async deleteGlobalScript(scriptId: string): Promise<void> {
    try {
      const repository = await this.loadGlobalRepository();
      const result = this.removeScriptById(repository, scriptId);
      if (!result) throw new Error('脚本不存在');
      await this.saveGlobalRepository(repository);
    } catch (error) {
      console.error('删除全局脚本失败:', error);
      throw error;
    }
  }

  /** 删除角色脚本 */
  async deleteCharacterScript(scriptId: string): Promise<void> {
    try {
      const repository = await this.loadCharacterRepository();
      const result = this.removeScriptById(repository, scriptId);
      if (!result) throw new Error('脚本不存在');
      await this.saveCharacterRepository(repository);
    } catch (error) {
      console.error('删除角色脚本失败:', error);
      throw error;
    }
  }

  /** 获取全局脚本 */
  async getGlobalScript(scriptId: string): Promise<Script | null> {
    try {
      const repository = await this.loadGlobalRepository();
      return this.findScriptById(repository, scriptId);
    } catch (error) {
      console.error('获取全局脚本失败:', error);
      return null;
    }
  }

  /** 获取角色脚本 */
  async getCharacterScript(scriptId: string): Promise<Script | null> {
    try {
      const repository = await this.loadCharacterRepository();
      return this.findScriptById(repository, scriptId);
    } catch (error) {
      console.error('获取角色脚本失败:', error);
      return null;
    }
  }

  /** 在全局创建文件夹 */
  async createGlobalFolder(payload: CreateFolderPayload): Promise<string> {
    try {
      const validated = CreateFolderPayloadSchema.parse(payload);
      const folderId = uuidv4();
      const folderItem = createDefaultFolderItem({
        id: folderId,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        scripts: [],
      });
      const repository = await this.loadGlobalRepository();
      repository.push(folderItem);
      await this.saveGlobalRepository(repository);
      return folderId;
    } catch (error) {
      console.error('创建全局文件夹失败:', error);
      throw error;
    }
  }

  /** 在角色创建文件夹 */
  async createCharacterFolder(payload: CreateFolderPayload): Promise<string> {
    try {
      const validated = CreateFolderPayloadSchema.parse(payload);
      const folderId = uuidv4();
      const folderItem = createDefaultFolderItem({
        id: folderId,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        scripts: [],
      });
      const repository = await this.loadCharacterRepository();
      repository.push(folderItem);
      await this.saveCharacterRepository(repository);
      return folderId;
    } catch (error) {
      console.error('创建角色文件夹失败:', error);
      throw error;
    }
  }

  /** 删除全局文件夹 */
  async deleteGlobalFolder(folderId: string): Promise<void> {
    try {
      const repository = await this.loadGlobalRepository();
      const folderIndex = this.findFolderIndex(repository, folderId);
      if (folderIndex === -1) throw new Error('文件夹不存在');
      repository.splice(folderIndex, 1);
      await this.saveGlobalRepository(repository);
    } catch (error) {
      console.error('删除全局文件夹失败:', error);
      throw error;
    }
  }

  /** 删除角色文件夹 */
  async deleteCharacterFolder(folderId: string): Promise<void> {
    try {
      const repository = await this.loadCharacterRepository();
      const folderIndex = this.findFolderIndex(repository, folderId);
      if (folderIndex === -1) throw new Error('文件夹不存在');
      repository.splice(folderIndex, 1);
      await this.saveCharacterRepository(repository);
    } catch (error) {
      console.error('删除角色文件夹失败:', error);
      throw error;
    }
  }

  /** 在全局内移动脚本 */
  async moveGlobalScript(scriptId: string, targetFolderId: string | null): Promise<void> {
    try {
      const repository = await this.loadGlobalRepository();
      const script = this.removeScriptById(repository, scriptId);
      if (!script) throw new Error('脚本不存在');
      if (targetFolderId) {
        const targetFolder = this.findFolderById(repository, targetFolderId);
        if (!targetFolder) throw new Error('目标文件夹不存在');
        if (!Array.isArray(targetFolder.value)) throw new Error('文件夹数据格式错误');
        targetFolder.value.push(script);
      } else {
        repository.push({ type: 'script', value: script });
      }
      await this.saveGlobalRepository(repository);
    } catch (error) {
      console.error('移动全局脚本失败:', error);
      throw error;
    }
  }

  /** 在角色内移动脚本 */
  async moveCharacterScript(scriptId: string, targetFolderId: string | null): Promise<void> {
    try {
      const repository = await this.loadCharacterRepository();
      const script = this.removeScriptById(repository, scriptId);
      if (!script) throw new Error('脚本不存在');
      if (targetFolderId) {
        const targetFolder = this.findFolderById(repository, targetFolderId);
        if (!targetFolder) throw new Error('目标文件夹不存在');
        if (!Array.isArray(targetFolder.value)) throw new Error('文件夹数据格式错误');
        targetFolder.value.push(script);
      } else {
        repository.push({ type: 'script', value: script });
      }
      await this.saveCharacterRepository(repository);
    } catch (error) {
      console.error('移动角色脚本失败:', error);
      throw error;
    }
  }

  /**
   * 按类型加载仓库数据
   */
  async loadRepositoryByType(type: 'global' | 'character'): Promise<Repository> {
    try {
      const rawData = this.readRawRepository(type);
      return this.validateAndNormalizeRepository(rawData);
    } catch (error) {
      console.error(`加载仓库数据失败 [${type}]:`, error);
      throw error;
    }
  }

  /**
   * 保存仓库数据
   */
  async saveRepositoryByType(type: 'global' | 'character', repository: Repository): Promise<void> {
    try {
      await this.saveRawRepository(type, repository);
    } catch (error) {
      console.error(`保存仓库数据失败 [${type}]:`, error);
      throw error;
    }
  }

  private readRawRepository(type: 'global' | 'character'): any[] {
    if (type === 'global') {
      return getSettingValue('script.scriptsRepository') || [];
    }
    // @ts-ignore
    return characters?.[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
  }

  private async saveRawRepository(type: 'global' | 'character', repository: Repository): Promise<void> {
    if (type === 'global') {
      saveSettingValue('script.scriptsRepository', repository);
      return;
    }
    if (!this_chid) {
      throw new Error('保存失败：当前角色为空');
    }
    // @ts-ignore
    await writeExtensionField(this_chid, 'TavernHelper_scripts', repository);
  }

  private validateAndNormalizeRepository(raw: any[]): Repository {
    if (!Array.isArray(raw)) return [];

    const normalized: Repository = [];
    for (const item of raw) {
      if (!item) continue;

      try {
        // 尝试解析为ScriptRepositoryItem
        const repositoryItem = ScriptRepositoryItemSchema.safeParse(item);
        if (repositoryItem.success) {
          normalized.push(repositoryItem.data);
          continue;
        }

        // 尝试解析为直接的Script对象（兼容旧数据）
        const script = ScriptSchema.safeParse(item);
        if (script.success) {
          normalized.push(script.data);
          continue;
        }

        console.warn('跳过无法解析的仓库项:', item);
      } catch (error) {
        console.warn('解析仓库项失败:', item, error);
      }
    }

    return normalized;
  }

  // ===== 脚本操作 =====

  /**
   * 创建脚本
   */
  async createScriptInType(type: 'global' | 'character', payload: CreateScriptPayload): Promise<string> {
    try {
      const validated = CreateScriptPayloadSchema.parse(payload);
      const scriptId = uuidv4();

      const script = createDefaultScript({
        id: scriptId,
        name: validated.name,
        content: validated.content || '',
        info: validated.info || '',
        enabled: validated.enabled || false,
      });

      const repository = await this.loadRepositoryByType(type);

      if (validated.folderId) {
        // 添加到指定文件夹
        const folderItem = this.findFolderById(repository, validated.folderId);
        if (!folderItem) {
          throw new Error('目标文件夹不存在');
        }
        if (!Array.isArray(folderItem.value)) {
          throw new Error('文件夹数据格式错误');
        }
        folderItem.value.push(script);
      } else {
        // 添加到根目录
        repository.push({ type: 'script', value: script });
      }

      await this.saveRepositoryByType(type, repository);
      return scriptId;
    } catch (error) {
      console.error('创建脚本失败:', error);
      throw error;
    }
  }

  /**
   * 更新脚本
   */
  async updateScriptInType(
    type: 'global' | 'character',
    scriptId: string,
    payload: UpdateScriptPayload,
  ): Promise<void> {
    try {
      const repository = await this.loadRepositoryByType(type);
      const script = this.findScriptById(repository, scriptId);

      if (!script) {
        throw new Error('脚本不存在');
      }

      // 更新脚本属性
      if (payload.name !== undefined) script.name = payload.name;
      if (payload.content !== undefined) script.content = payload.content;
      if (payload.info !== undefined) script.info = payload.info;
      if (payload.enabled !== undefined) script.enabled = payload.enabled;
      if (payload.buttons !== undefined) script.buttons = payload.buttons;
      if (payload.data !== undefined) script.data = payload.data;

      // 验证更新后的脚本
      ScriptSchema.parse(script);

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      console.error('更新脚本失败:', error);
      throw error;
    }
  }

  /**
   * 删除脚本
   */
  async deleteScriptInType(type: 'global' | 'character', scriptId: string): Promise<void> {
    try {
      const repository = await this.loadRepositoryByType(type);
      const result = this.removeScriptById(repository, scriptId);

      if (!result) {
        throw new Error('脚本不存在');
      }

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      console.error('删除脚本失败:', error);
      throw error;
    }
  }

  /**
   * 获取脚本
   */
  async getScriptFromType(type: 'global' | 'character', scriptId: string): Promise<Script | null> {
    try {
      const repository = await this.loadRepositoryByType(type);
      return this.findScriptById(repository, scriptId);
    } catch (error) {
      console.error('获取脚本失败:', error);
      return null;
    }
  }

  // ===== 文件夹操作 =====

  /**
   * 创建文件夹
   */
  async createFolderInType(type: 'global' | 'character', payload: CreateFolderPayload): Promise<string> {
    try {
      const validated = CreateFolderPayloadSchema.parse(payload);
      const folderId = uuidv4();

      const folderItem = createDefaultFolderItem({
        id: folderId,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        scripts: [],
      });

      const repository = await this.loadRepositoryByType(type);
      repository.push(folderItem);

      await this.saveRepositoryByType(type, repository);
      return folderId;
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolderInType(type: 'global' | 'character', folderId: string): Promise<void> {
    try {
      const repository = await this.loadRepositoryByType(type);
      const folderIndex = this.findFolderIndex(repository, folderId);

      if (folderIndex === -1) {
        throw new Error('文件夹不存在');
      }

      repository.splice(folderIndex, 1);
      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      console.error('删除文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 移动脚本到文件夹
   */
  async moveScriptWithinType(
    type: 'global' | 'character',
    scriptId: string,
    targetFolderId: string | null,
  ): Promise<void> {
    try {
      const repository = await this.loadRepositoryByType(type);

      // 从原位置移除脚本
      const script = this.removeScriptById(repository, scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }

      if (targetFolderId) {
        // 移动到目标文件夹
        const targetFolder = this.findFolderById(repository, targetFolderId);
        if (!targetFolder) {
          throw new Error('目标文件夹不存在');
        }
        if (!Array.isArray(targetFolder.value)) {
          throw new Error('文件夹数据格式错误');
        }
        targetFolder.value.push(script);
      } else {
        // 移动到根目录
        repository.push({ type: 'script', value: script });
      }

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      console.error('移动脚本失败:', error);
      throw error;
    }
  }

  // ===== 辅助方法 =====

  private findScriptById(repository: Repository, scriptId: string): Script | null {
    for (const item of repository) {
      if (ScriptSchema.safeParse(item).success) {
        // 直接的脚本对象
        const script = item as Script;
        if (script.id === scriptId) {
          return script;
        }
      } else if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'script') {
          const script = repositoryItem.value as Script;
          if (script.id === scriptId) {
            return script;
          }
        } else if (repositoryItem.type === 'folder' && Array.isArray(repositoryItem.value)) {
          // 在文件夹中查找
          for (const script of repositoryItem.value) {
            if (script.id === scriptId) {
              return script;
            }
          }
        }
      }
    }
    return null;
  }

  private removeScriptById(repository: Repository, scriptId: string): Script | null {
    for (let i = 0; i < repository.length; i++) {
      const item = repository[i];

      if (ScriptSchema.safeParse(item).success) {
        // 直接的脚本对象
        const script = item as Script;
        if (script.id === scriptId) {
          repository.splice(i, 1);
          return script;
        }
      } else if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'script') {
          const script = repositoryItem.value as Script;
          if (script.id === scriptId) {
            repository.splice(i, 1);
            return script;
          }
        } else if (repositoryItem.type === 'folder' && Array.isArray(repositoryItem.value)) {
          // 在文件夹中查找并移除
          for (let j = 0; j < repositoryItem.value.length; j++) {
            if (repositoryItem.value[j].id === scriptId) {
              const script = repositoryItem.value[j];
              repositoryItem.value.splice(j, 1);
              return script;
            }
          }
        }
      }
    }
    return null;
  }

  private findFolderById(repository: Repository, folderId: string): ScriptRepositoryItem | null {
    for (const item of repository) {
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'folder' && repositoryItem.id === folderId) {
          return repositoryItem;
        }
      }
    }
    return null;
  }

  private findFolderIndex(repository: Repository, folderId: string): number {
    for (let i = 0; i < repository.length; i++) {
      const item = repository[i];
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'folder' && repositoryItem.id === folderId) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * 获取所有脚本（扁平化）
   */
  getAllScripts(repository: Repository): Script[] {
    const scripts: Script[] = [];

    for (const item of repository) {
      if (ScriptSchema.safeParse(item).success) {
        // 直接的脚本对象
        scripts.push(item as Script);
      } else if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'script') {
          scripts.push(repositoryItem.value as Script);
        } else if (repositoryItem.type === 'folder' && Array.isArray(repositoryItem.value)) {
          scripts.push(...repositoryItem.value);
        }
      }
    }

    return scripts;
  }

  /**
   * 获取文件夹中的脚本
   */
  getFolderScripts(repository: Repository, folderId: string): Script[] {
    const folder = this.findFolderById(repository, folderId);
    if (folder && Array.isArray(folder.value)) {
      return folder.value;
    }
    return [];
  }

  /**
   * 获取根级别的脚本
   */
  getRootScripts(repository: Repository): Script[] {
    const scripts: Script[] = [];

    for (const item of repository) {
      if (ScriptSchema.safeParse(item).success) {
        // 直接的脚本对象
        scripts.push(item as Script);
      } else if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'script') {
          scripts.push(repositoryItem.value as Script);
        }
      }
    }

    return scripts;
  }

  /**
   * 获取所有文件夹
   */
  getAllFolders(repository: Repository): ScriptRepositoryItem[] {
    const folders: ScriptRepositoryItem[] = [];

    for (const item of repository) {
      if (ScriptRepositoryItemSchema.safeParse(item).success) {
        const repositoryItem = item as ScriptRepositoryItem;
        if (repositoryItem.type === 'folder') {
          folders.push(repositoryItem);
        }
      }
    }

    return folders;
  }

  /**
   * 在不同类型间移动脚本
   */
  async moveScriptToOtherType(scriptId: string, fromType: 'global' | 'character'): Promise<void> {
    try {
      const toType = fromType === 'global' ? 'character' : 'global';

      // 从源类型获取脚本
      const script = await this.getScriptFromType(fromType, scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }

      // 删除源脚本
      await this.deleteScriptInType(fromType, scriptId);

      // 在目标类型创建脚本
      await this.createScriptInType(toType, {
        name: script.name,
        content: script.content,
        info: script.info,
        enabled: script.enabled,
        folderId: null, // 移动到根目录
      });
    } catch (error) {
      console.error('移动脚本到其他类型失败:', error);
      throw error;
    }
  }

  /**
   * 导出脚本
   */
  async exportScripts(scriptIds: string[], type: 'global' | 'character'): Promise<any[]> {
    try {
      const repository = await this.loadRepositoryByType(type);
      const scripts: Script[] = [];

      for (const scriptId of scriptIds) {
        const script = this.findScriptById(repository, scriptId);
        if (script) {
          scripts.push(script);
        }
      }

      return scripts;
    } catch (error) {
      console.error('导出脚本失败:', error);
      throw error;
    }
  }

  /**
   * 导入脚本到指定类型
   */
  async importScriptsToType(type: 'global' | 'character', payload: ImportScriptPayload): Promise<void> {
    try {
      const repository = await this.loadRepositoryByType(type);

      for (const scriptData of payload.scripts) {
        const script = createDefaultScript({
          name: scriptData.name || '未命名脚本',
          content: scriptData.content || '',
          info: scriptData.info || '',
          enabled: false,
          buttons: [],
          data: {},
        });

        if (payload.folderId) {
          // 添加到指定文件夹
          const folderItem = this.findFolderById(repository, payload.folderId);
          if (!folderItem) {
            throw new Error('目标文件夹不存在');
          }
          if (!Array.isArray(folderItem.value)) {
            throw new Error('文件夹数据格式错误');
          }
          folderItem.value.push(script);
        } else {
          // 添加到根目录
          repository.push({ type: 'script', value: script });
        }
      }

      await this.saveRepositoryByType(type, repository);
    } catch (error) {
      console.error('导入脚本失败:', error);
      throw error;
    }
  }

  /** 导入到全局 */
  async importScriptsToGlobal(payload: ImportScriptPayload): Promise<void> {
    try {
      const repository = await this.loadGlobalRepository();
      for (const scriptData of payload.scripts) {
        const script = createDefaultScript({
          name: scriptData.name || '未命名脚本',
          content: scriptData.content || '',
          info: scriptData.info || '',
          enabled: false,
          buttons: [],
          data: {},
        });
        if (payload.folderId) {
          const folderItem = this.findFolderById(repository, payload.folderId);
          if (!folderItem) throw new Error('目标文件夹不存在');
          if (!Array.isArray(folderItem.value)) throw new Error('文件夹数据格式错误');
          folderItem.value.push(script);
        } else {
          repository.push({ type: 'script', value: script });
        }
      }
      await this.saveGlobalRepository(repository);
    } catch (error) {
      console.error('导入全局脚本失败:', error);
      throw error;
    }
  }

  /** 导入到角色 */
  async importScriptsToCharacter(payload: ImportScriptPayload): Promise<void> {
    try {
      const repository = await this.loadCharacterRepository();
      for (const scriptData of payload.scripts) {
        const script = createDefaultScript({
          name: scriptData.name || '未命名脚本',
          content: scriptData.content || '',
          info: scriptData.info || '',
          enabled: false,
          buttons: [],
          data: {},
        });
        if (payload.folderId) {
          const folderItem = this.findFolderById(repository, payload.folderId);
          if (!folderItem) throw new Error('目标文件夹不存在');
          if (!Array.isArray(folderItem.value)) throw new Error('文件夹数据格式错误');
          folderItem.value.push(script);
        } else {
          repository.push({ type: 'script', value: script });
        }
      }
      await this.saveCharacterRepository(repository);
    } catch (error) {
      console.error('导入角色脚本失败:', error);
      throw error;
    }
  }

  /** 从全局导出脚本 */
  async exportGlobalScripts(scriptIds: string[]): Promise<any[]> {
    try {
      const repository = await this.loadGlobalRepository();
      const scripts: Script[] = [];
      for (const scriptId of scriptIds) {
        const script = this.findScriptById(repository, scriptId);
        if (script) scripts.push(script);
      }
      return scripts;
    } catch (error) {
      console.error('导出全局脚本失败:', error);
      throw error;
    }
  }

  /** 从角色导出脚本 */
  async exportCharacterScripts(scriptIds: string[]): Promise<any[]> {
    try {
      const repository = await this.loadCharacterRepository();
      const scripts: Script[] = [];
      for (const scriptId of scriptIds) {
        const script = this.findScriptById(repository, scriptId);
        if (script) scripts.push(script);
      }
      return scripts;
    } catch (error) {
      console.error('导出角色脚本失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const repositoryService = RepositoryService.getInstance();
