import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';
import type {
  CreateScriptPayload,
  ExportScriptPayload,
  ImportScriptPayload,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';
import { CreateScriptPayloadSchema } from '../schemas/payloads.schema';
import type { Folder, Repository, Script } from '../schemas/script.schema';
import { FolderSchema, ScriptSchema } from '../schemas/script.schema';

/**
 * 脚本仓库服务 - 负责数据持久化和I/O操作
 * 这个服务层作为新架构与现有系统的适配层
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

  // ===== 数据加载 =====

  /**
   * 加载完整的仓库数据
   */
  async loadRepository(): Promise<Repository> {
    try {
      // 默认返回全局仓库（保持兼容），如需区分请调用 loadRepositoryByType
      return await this.loadRepositoryByType('global');
    } catch (error) {
      console.error('加载仓库数据失败:', error);
      throw error;
    }
  }

  /**
   * 按类型加载仓库数据（从 V1 的持久化结构转换为 V2 的规范化结构）
   */
  async loadRepositoryByType(type: 'global' | 'character'): Promise<Repository> {
    try {
      const items: any[] =
        type === 'global'
          ? getSettingValue('script.scriptsRepository') || []
          : // @ts-ignore
            (characters?.[this_chid]?.data?.extensions?.TavernHelper_scripts || []);

      return this.mapV1RepositoryToV2(items);
    } catch (error) {
      console.error(`按类型加载仓库数据失败 [${type}]:`, error);
      throw error;
    }
  }

  /** 将 V1 的混合结构 (脚本/文件夹) 映射为 V2 的规范化 Repository */
  private mapV1RepositoryToV2(repoItems: any[]): Repository {
    const scripts: Script[] = [];
    const folders: Folder[] = [];
    const rootItems: string[] = [];

    for (const item of repoItems) {
      if (item?.type === 'script') {
        const s = item.value as any;
        const mapped: Script = {
          id: s.id,
          name: s.name || '',
          content: s.content || '',
          info: s.info || '',
          buttons: Array.isArray(s.buttons) ? s.buttons : [],
          data: s.data || {},
          enabled: !!s.enabled,
          folderId: null,
        };
        // 验证
        ScriptSchema.parse(mapped);
        scripts.push(mapped);
        rootItems.push(mapped.id);
      } else if (item?.type === 'folder') {
        const folderId = item.id || crypto.randomUUID();
        const folderScripts = Array.isArray(item.value) ? item.value : [];
        const folderScriptIds: string[] = [];

        for (const s of folderScripts as any[]) {
          const mapped: Script = {
            id: s.id,
            name: s.name || '',
            content: s.content || '',
            info: s.info || '',
            buttons: Array.isArray(s.buttons) ? s.buttons : [],
            data: s.data || {},
            enabled: !!s.enabled,
            folderId: folderId,
          };
          ScriptSchema.parse(mapped);
          scripts.push(mapped);
          folderScriptIds.push(mapped.id);
        }

        const folder: Folder = {
          id: folderId,
          name: item.name || '',
          parentId: null,
          icon: item.icon,
          color: item.color,
          expanded: false,
          scripts: folderScriptIds,
        };
        FolderSchema.parse(folder);
        folders.push(folder);
        rootItems.push(folderId);
      } else {
        // 跳过无法识别的项
      }
    }

    return { scripts, folders, rootItems };
  }

  // ====== 基础读写持久层 (不依赖 V1 ScriptData) ======

  /** 读取原始仓库（V1 结构） */
  private readRawRepository(type: 'global' | 'character'): any[] {
    if (type === 'global') {
      return getSettingValue('script.scriptsRepository') || [];
    }
    // @ts-ignore
    return characters?.[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
  }

  /** 规范化原始仓库结构为 { type: 'script'|'folder', value } 形式 */
  private normalizeRepository(raw: any[]): any[] {
    if (!Array.isArray(raw)) return [];
    const normalized: any[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (item.type === 'script' && item.value) {
        normalized.push({ type: 'script', value: { ...item.value } });
      } else if (item.type === 'folder') {
        normalized.push({
          type: 'folder',
          id: item.id || crypto.randomUUID(),
          name: item.name || '',
          icon: item.icon,
          color: item.color,
          value: Array.isArray(item.value) ? item.value.map((s: any) => ({ ...s })) : [],
        });
      } else if (item.id && (typeof item.name === 'string')) {
        // 兼容旧数据：可能直接是脚本对象
        normalized.push({ type: 'script', value: { ...item } });
      }
    }
    return normalized;
  }

  /** 保存仓库（V1 结构） */
  private async saveRepository(type: 'global' | 'character', repository: any[]): Promise<void> {
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

  /** 在仓库中查找脚本并返回其位置 */
  private findScriptPosition(repo: any[], scriptId: string):
    | { inFolder: true; folderIndex: number; scriptIndex: number }
    | { inFolder: false; index: number }
    | null {
    for (let i = 0; i < repo.length; i++) {
      const item = repo[i];
      if (item.type === 'script' && item.value?.id === scriptId) {
        return { inFolder: false, index: i } as const;
      }
      if (item.type === 'folder' && Array.isArray(item.value)) {
        const idx = item.value.findIndex((s: any) => s?.id === scriptId);
        if (idx !== -1) {
          return { inFolder: true, folderIndex: i, scriptIndex: idx } as const;
        }
      }
    }
    return null;
  }

  /** 获取文件夹索引 */
  private findFolderIndex(repo: any[], folderId: string): number {
    return repo.findIndex((i: any) => i.type === 'folder' && i.id === folderId);
  }

  // ====== V2 <-> 原始持久层 (global / character) ======

  /** 获取脚本类型启用状态 */
  async getTypeEnabled(type: 'global' | 'character'): Promise<boolean> {
    if (type === 'global') {
      return getSettingValue('script.global_script_enabled') ?? false;
    }
    const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
    // @ts-ignore
    const avatar = characters?.[this_chid]?.avatar;
    return charactersWithScripts?.includes(avatar) || false;
  }

  /** 设置脚本类型启用状态 */
  async setTypeEnabled(type: 'global' | 'character', enable: boolean): Promise<void> {
    if (type === 'global') {
      saveSettingValue('script.global_script_enabled', enable);
      return;
    }
    const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
    // @ts-ignore
    const avatar = characters?.[this_chid]?.avatar;
    if (!avatar) return;
    const exists = charactersWithScripts.includes(avatar);
    if (enable && !exists) {
      charactersWithScripts.push(avatar);
    } else if (!enable && exists) {
      const idx = charactersWithScripts.indexOf(avatar);
      if (idx !== -1) charactersWithScripts.splice(idx, 1);
    }
    saveSettingValue('script.characters_with_scripts', charactersWithScripts);
  }

  /** 在指定类型的仓库中创建脚本（保存到 V1 持久层） */
  async createScriptInType(type: 'global' | 'character', payload: CreateScriptPayload): Promise<string> {
    try {
      const validated = CreateScriptPayloadSchema.parse(payload);
      const scriptId = crypto.randomUUID();
      const script = {
        id: scriptId,
        name: validated.name,
        content: validated.content,
        info: validated.info,
        enabled: validated.enabled,
        buttons: validated.buttons,
        data: validated.data,
      };

      const raw = this.normalizeRepository(this.readRawRepository(type));
      if (validated.folderId) {
        const folderIndex = this.findFolderIndex(raw, validated.folderId);
        if (folderIndex === -1) throw new Error('目标文件夹不存在');
        raw[folderIndex].value.push(script);
      } else {
        raw.push({ type: 'script', value: script });
      }
      await this.saveRepository(type, raw);
      return scriptId;
    } catch (error) {
      console.error('创建脚本失败(typed):', error);
      throw error;
    }
  }

  /** 在指定类型的仓库中创建文件夹 */
  async createFolderInType(
    type: 'global' | 'character',
    payload: { name: string; icon?: string; color?: string },
  ): Promise<string> {
    try {
      if (!payload.name || payload.name.trim() === '') {
        throw new Error('文件夹名称不能为空');
      }
      const raw = this.normalizeRepository(this.readRawRepository(type));
      const exists = raw.find((i: any) => i.type === 'folder' && i.name === payload.name.trim());
      if (exists) throw new Error('文件夹名称已存在');
      const folderId = crypto.randomUUID();
      const color = payload.color || document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');
      const icon = payload.icon || 'fa-folder';
      raw.unshift({ type: 'folder', id: folderId, name: payload.name.trim(), icon, color, value: [] });
      await this.saveRepository(type, raw);
      return folderId;
    } catch (error) {
      console.error('创建文件夹失败(typed):', error);
      throw error;
    }
  }

  /** 在指定类型的仓库中导入脚本集合 */
  async importScriptsToType(type: 'global' | 'character', payload: ImportScriptPayload): Promise<string[]> {
    try {
      const ids: string[] = [];
      for (const s of payload.scripts) {
        try {
          const id = await this.createScriptInType(type, {
            name: s.name,
            content: s.content || '',
            info: s.info || '',
            enabled: false,
            buttons: [],
            data: {},
            folderId: payload.folderId ?? null,
          });
          ids.push(id);
        } catch (e) {
          console.warn('跳过无效脚本(typed import):', s?.name, e);
        }
      }
      return ids;
    } catch (error) {
      console.error('导入脚本失败(typed):', error);
      throw error;
    }
  }

  /**
   * 在全局/角色之间移动脚本（保留文件夹结构，由 V1 负责）
   */
  async moveScriptToOtherType(source: 'global' | 'character', scriptId: string): Promise<void> {
    const target: 'global' | 'character' = source === 'global' ? 'character' : 'global';
    const sourceRepo = this.normalizeRepository(this.readRawRepository(source));
    const targetRepo = this.normalizeRepository(this.readRawRepository(target));

    const pos = this.findScriptPosition(sourceRepo, scriptId);
    if (!pos) throw new Error(`脚本不存在: ${scriptId}`);
    let script: any;
    if ('inFolder' in pos && pos.inFolder) {
      script = sourceRepo[pos.folderIndex].value.splice(pos.scriptIndex, 1)[0];
    } else {
      script = sourceRepo.splice((pos as any).index, 1)[0].value;
    }
    // 放到目标根目录
    targetRepo.push({ type: 'script', value: script });

    await this.saveRepository(source, sourceRepo);
    await this.saveRepository(target, targetRepo);
  }

  /** 在同一类型仓库内移动脚本到文件夹或根目录 */
  async moveScriptWithinType(type: 'global' | 'character', scriptId: string, targetFolderId: string | null): Promise<void> {
    const repo = this.normalizeRepository(this.readRawRepository(type));
    const pos = this.findScriptPosition(repo, scriptId);
    if (!pos) throw new Error('脚本不存在');

    let script: any;
    if ('inFolder' in pos && pos.inFolder) {
      script = repo[pos.folderIndex].value.splice(pos.scriptIndex, 1)[0];
    } else {
      script = repo.splice((pos as any).index, 1)[0].value;
    }

    if (targetFolderId === null) {
      repo.push({ type: 'script', value: script });
    } else {
      const folderIndex = this.findFolderIndex(repo, targetFolderId);
      if (folderIndex === -1) throw new Error('目标文件夹不存在');
      const folderScripts: any[] = repo[folderIndex].value;
      const dup = folderScripts.find((s: any) => s.name === script.name);
      if (dup) throw new Error('文件夹中已存在同名脚本');
      folderScripts.push(script);
    }

    await this.saveRepository(type, repo);
  }

  /**
   * 加载单个脚本
   */
  async loadScript(id: string): Promise<Script | null> {
    const search = (repo: any[]): any | null => {
      for (const item of repo) {
        if (item.type === 'script' && item.value?.id === id) return { ...item.value };
        if (item.type === 'folder') {
          const found = (item.value as any[]).find(s => s?.id === id);
          if (found) return { ...found };
        }
      }
      return null;
    };
    const g = this.normalizeRepository(this.readRawRepository('global'));
    const cg = search(g);
    if (cg) return ScriptSchema.parse({ ...cg, folderId: null });
    const c = this.normalizeRepository(this.readRawRepository('character'));
    const cc = search(c);
    if (cc) return ScriptSchema.parse({ ...cc, folderId: null });
    return null;
  }

  // ===== 脚本操作 =====

  /**
   * 保存脚本
   */
  async saveScript(script: Script): Promise<void> {
    try {
      // Zod 校验脚本数据
      const validatedScript = ScriptSchema.parse(script);
      const updateInRepo = async (type: 'global' | 'character'): Promise<boolean> => {
        const repo = this.normalizeRepository(this.readRawRepository(type));
        const pos = this.findScriptPosition(repo, validatedScript.id);
        if (!pos) return false;
        if ('inFolder' in pos && pos.inFolder) {
          repo[pos.folderIndex].value[pos.scriptIndex] = {
            ...repo[pos.folderIndex].value[pos.scriptIndex],
            name: validatedScript.name,
            content: validatedScript.content,
            info: validatedScript.info,
            enabled: validatedScript.enabled,
            buttons: validatedScript.buttons,
            data: validatedScript.data,
          };
        } else {
          repo[(pos as any).index].value = {
            ...repo[(pos as any).index].value,
            name: validatedScript.name,
            content: validatedScript.content,
            info: validatedScript.info,
            enabled: validatedScript.enabled,
            buttons: validatedScript.buttons,
            data: validatedScript.data,
          };
        }
        await this.saveRepository(type, repo);
        return true;
      };

      // 优先更新全局，再尝试角色
      const updatedGlobal = await updateInRepo('global');
      if (!updatedGlobal) {
        await updateInRepo('character');
      }
    } catch (error) {
      console.error('保存脚本失败:', error);
      throw error;
    }
  }

  /**
   * 创建新脚本
   */
  async createScript(payload: CreateScriptPayload): Promise<string> {
    try {
      // Zod 校验载荷并应用默认值
      const validatedPayload = CreateScriptPayloadSchema.parse(payload);
      // 默认创建到全局根目录（保持兼容）
      return await this.createScriptInType('global', validatedPayload);
    } catch (error) {
      console.error('创建脚本失败:', error);
      throw error;
    }
  }

  /**
   * 更新脚本
   */
  async updateScript(payload: UpdateScriptPayload): Promise<void> {
    try {
      const existingScript = await this.loadScript(payload.id);
      if (!existingScript) {
        throw new Error(`脚本不存在: ${payload.id}`);
      }

      const updatedScript: Script = {
        ...existingScript,
        ...payload,
      };

      // Zod 校验更新后的脚本数据
      const validatedScript = ScriptSchema.parse(updatedScript);

      await this.saveScript(validatedScript);
    } catch (error) {
      console.error('更新脚本失败:', error);
      throw error;
    }
  }

  /**
   * 删除脚本
   */
  async deleteScript(id: string): Promise<void> {
    try {
      const removeFromRepo = async (type: 'global' | 'character'): Promise<boolean> => {
        const repo = this.normalizeRepository(this.readRawRepository(type));
        const pos = this.findScriptPosition(repo, id);
        if (!pos) return false;
        if ('inFolder' in pos && pos.inFolder) {
          repo[pos.folderIndex].value.splice(pos.scriptIndex, 1);
        } else {
          repo.splice((pos as any).index, 1);
        }
        await this.saveRepository(type, repo);
        return true;
      };
      const removed = await removeFromRepo('global');
      if (!removed) await removeFromRepo('character');
    } catch (error) {
      console.error('删除脚本失败:', error);
      throw error;
    }
  }

  // ===== 文件夹操作 =====

  /**
   * 保存文件夹结构
   */
  async saveFolder(folder: Folder): Promise<void> {
    try {
      // Zod 校验文件夹数据
      const validatedFolder = FolderSchema.parse(folder);
      const apply = async (type: 'global' | 'character'): Promise<boolean> => {
        const repo = this.normalizeRepository(this.readRawRepository(type));
        const idx = this.findFolderIndex(repo, validatedFolder.id);
        if (idx === -1) return false;
        repo[idx] = {
          ...repo[idx],
          name: validatedFolder.name,
          icon: validatedFolder.icon,
          color: validatedFolder.color,
        };
        await this.saveRepository(type, repo);
        return true;
      };
      const updated = await apply('global');
      if (!updated) await apply('character');
    } catch (error) {
      console.error('保存文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(id: string): Promise<void> {
    try {
      const remove = async (type: 'global' | 'character'): Promise<boolean> => {
        const repo = this.normalizeRepository(this.readRawRepository(type));
        const idx = this.findFolderIndex(repo, id);
        if (idx === -1) return false;
        // 将文件夹中的脚本移动到根目录
        const scripts = repo[idx].value as any[];
        repo.splice(idx, 1);
        for (const s of scripts) {
          repo.push({ type: 'script', value: s });
        }
        await this.saveRepository(type, repo);
        return true;
      };
      const removed = await remove('global');
      if (!removed) await remove('character');
    } catch (error) {
      console.error('删除文件夹失败:', error);
      throw error;
    }
  }

  // ===== 批量操作 =====

  /**
   * 导入脚本
   */
  async importScripts(payload: ImportScriptPayload): Promise<string[]> {
    try {
      const scriptIds: string[] = [];

      for (const scriptData of payload.scripts) {
        try {
          const scriptId = await this.createScript({
            name: scriptData.name,
            content: scriptData.content || '',
            info: scriptData.info || '',
            folderId: payload.folderId,
            enabled: false,
            // buttons 和 data 将由 CreateScriptPayloadSchema 的默认值处理
          });
          scriptIds.push(scriptId);
        } catch (validationError) {
          console.warn(`跳过无效脚本数据: ${scriptData.name}`, validationError);
          // 继续处理其他脚本，不中断整个导入过程
        }
      }

      return scriptIds;
    } catch (error) {
      console.error('导入脚本失败:', error);
      throw error;
    }
  }

  /**
   * 导出脚本
   */
  async exportScripts(payload: ExportScriptPayload): Promise<Blob> {
    try {
      const scripts: Script[] = [];

      // 加载要导出的脚本
      for (const scriptId of payload.scriptIds) {
        const script = await this.loadScript(scriptId);
        if (script) {
          scripts.push(script);
        }
      }

      // 准备导出数据
      const exportData = {
        scripts: scripts.map(script => ({
          name: script.name,
          content: script.content,
          info: script.info,
          enabled: script.enabled,
          buttons: script.buttons,
          ...(payload.includeData && { data: script.data }),
        })),
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      // 创建文件
      const jsonContent = JSON.stringify(exportData, null, 2);
      return new Blob([jsonContent], { type: 'application/json' });
    } catch (error) {
      console.error('导出脚本失败:', error);
      throw error;
    }
  }

  // ===== 脚本执行相关 =====

  /**
   * 运行脚本
   */
  async runScript(id: string): Promise<void> {
    try {
      // TODO: 调用现有的脚本执行逻辑
      console.log('运行脚本:', id);

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('运行脚本失败:', error);
      throw error;
    }
  }

  /**
   * 停止脚本
   */
  async stopScript(id: string): Promise<void> {
    try {
      // TODO: 调用现有的脚本停止逻辑
      console.log('停止脚本:', id);

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('停止脚本失败:', error);
      throw error;
    }
  }

  // ===== 工具方法 =====

  /**
   * 验证脚本语法
   */
  async validateScript(content: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      // TODO: 实现脚本语法验证
      // 可以使用 AST 解析或其他验证方式

      // 简单的语法检查：检查是否为空以及基础的JavaScript语法
      if (!content || content.trim().length === 0) {
        return { valid: false, errors: ['脚本内容不能为空'] };
      }

      // 基础的语法检查 - 尝试解析为函数
      try {
        new Function(content);
        return { valid: true };
      } catch (syntaxError) {
        return {
          valid: false,
          errors: [`语法错误: ${syntaxError instanceof Error ? syntaxError.message : '未知语法错误'}`],
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : '未知错误'],
      };
    }
  }

  /**
   * 格式化脚本代码
   */
  async formatScript(content: string): Promise<string> {
    try {
      // TODO: 实现代码格式化
      // 可以使用 prettier 或其他格式化工具

      return content;
    } catch (error) {
      console.error('格式化脚本失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const repositoryService = RepositoryService.getInstance();
