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
      // TODO: 从现有的数据源加载数据
      // 这里需要适配现有的 ui_controller.ts 或其他数据源

      // 临时返回空数据
      return {
        scripts: [],
        folders: [],
        rootItems: [],
      };
    } catch (error) {
      console.error('加载仓库数据失败:', error);
      throw error;
    }
  }

  /**
   * 加载单个脚本
   */
  async loadScript(id: string): Promise<Script | null> {
    try {
      // TODO: 实现从现有数据源加载脚本的逻辑
      return null;
    } catch (error) {
      console.error(`加载脚本失败 [${id}]:`, error);
      throw error;
    }
  }

  // ===== 脚本操作 =====

  /**
   * 保存脚本
   */
  async saveScript(script: Script): Promise<void> {
    try {
      // Zod 校验脚本数据
      const validatedScript = ScriptSchema.parse(script);

      // TODO: 调用现有的保存逻辑
      // 可能需要调用 ui_controller.ts 中的相关方法

      console.log('保存脚本:', validatedScript.name);

      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
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

      // 生成新的脚本ID
      const scriptId = crypto.randomUUID();

      const script: Script = {
        id: scriptId,
        name: validatedPayload.name,
        content: validatedPayload.content,
        info: validatedPayload.info,
        enabled: validatedPayload.enabled,
        buttons: validatedPayload.buttons,
        data: validatedPayload.data,
        folderId: validatedPayload.folderId,
      };

      await this.saveScript(script);

      return scriptId;
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
      // TODO: 实现删除逻辑，调用现有系统的删除方法
      console.log('删除脚本:', id);

      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
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
      
      // TODO: 实现文件夹保存逻辑
      console.log('保存文件夹:', validatedFolder.name);

      await new Promise(resolve => setTimeout(resolve, 100));
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
      // TODO: 实现删除文件夹的逻辑，处理其中的脚本
      console.log('删除文件夹:', id);

      await new Promise(resolve => setTimeout(resolve, 100));
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
