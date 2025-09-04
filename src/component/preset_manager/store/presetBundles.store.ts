/**
 * 预设绑定功能 Pinia Store
 * 维护预设与脚本/正则绑定的数据与副作用
 */

import { defineStore } from 'pinia';
import type { ExportedBundles, PresetBinding, PresetBindingsMap, PresetName } from '../types';
import { PresetBindingsMapSchema, validateExportedBundles, validatePresetBinding, validatePresetName } from '../types';

export const usePresetBundlesStore = defineStore('presetBundles', {
  state: () => ({
    currentPresetName: '' as string,
    bindings: {} as PresetBindingsMap,
  }),

  getters: {
    getBinding:
      state =>
      (presetName: PresetName): PresetBinding | undefined => {
        return state.bindings[presetName] ? { ...state.bindings[presetName] } : undefined;
      },
  },

  actions: {
    // 基础状态管理
    setCurrentPreset(name: PresetName): void {
      this.currentPresetName = name;
    },

    // 绑定管理
    bindScripts(presetName: PresetName, scriptIds: string[]): void {
      this.ensureBinding(presetName);
      this.bindings[presetName].scripts = [...scriptIds];
    },

    bindRegexes(presetName: PresetName, regexIds: string[]): void {
      this.ensureBinding(presetName);
      this.bindings[presetName].regexes = [...regexIds];
    },

    // 确保绑定存在的辅助方法
    ensureBinding(presetName: PresetName): PresetBinding {
      if (!this.bindings[presetName]) {
        this.bindings[presetName] = { scripts: [], regexes: [] };
      }
      return this.bindings[presetName];
    },

    // 数据验证和清理（使用 Zod）
    validateAndCleanBindings(): void {
      try {
        console.log('[PresetBundles] Validating and cleaning bindings with Zod...');

        // 首先验证整个数据结构
        const validationResult = PresetBindingsMapSchema.safeParse(this.bindings);

        if (validationResult.success) {
          console.log('[PresetBundles] All bindings are valid');
          return;
        }

        console.warn('[PresetBundles] Validation failed, cleaning invalid data:', validationResult.error);

        const cleanedBindings: PresetBindingsMap = {};
        let totalCleaned = 0;

        Object.entries(this.bindings).forEach(([presetName, binding]) => {
          // 验证预设名
          if (!validatePresetName(presetName)) {
            console.warn(`[PresetBundles] Invalid preset name: ${presetName}`);
            totalCleaned++;
            return;
          }

          // 验证绑定结构
          if (!validatePresetBinding(binding)) {
            console.warn(`[PresetBundles] Invalid binding structure for preset: ${presetName}`);

            // 尝试修复绑定结构
            const fixedBinding = this.fixBindingStructure(binding);
            if (fixedBinding && validatePresetBinding(fixedBinding)) {
              cleanedBindings[presetName] = fixedBinding;
              console.log(`[PresetBundles] Fixed binding structure for preset: ${presetName}`);
            } else {
              console.warn(`[PresetBundles] Could not fix binding for preset: ${presetName}`);
              totalCleaned++;
            }
            return;
          }

          // 只保留有绑定的预设
          if (binding.scripts.length > 0 || binding.regexes.length > 0) {
            cleanedBindings[presetName] = binding;
          } else {
            console.warn(`[PresetBundles] Empty preset removed: ${presetName}`);
            totalCleaned++;
          }
        });

        this.bindings = cleanedBindings;

        if (totalCleaned > 0) {
          console.log(`[PresetBundles] Cleaned ${totalCleaned} invalid entries`);
        } else {
          console.log('[PresetBundles] All bindings are valid');
        }
      } catch (error) {
        console.error('[PresetBundles] Error during validation and cleaning:', error);
      }
    },

    // 修复绑定结构
    fixBindingStructure(binding: any): PresetBinding | null {
      try {
        const fixed: PresetBinding = {
          scripts: [],
          regexes: [],
        };

        // 修复脚本数组
        if (Array.isArray(binding.scripts)) {
          fixed.scripts = binding.scripts.filter((id: any) => typeof id === 'string' && id.trim() !== '');
        } else if (typeof binding.scripts === 'string') {
          // 处理单个脚本字符串的情况
          fixed.scripts = [binding.scripts];
        }

        // 修复正则数组
        if (Array.isArray(binding.regexes)) {
          fixed.regexes = binding.regexes.filter((id: any) => typeof id === 'string' && id.trim() !== '');
        } else if (typeof binding.regexes === 'string') {
          // 处理单个正则字符串的情况
          fixed.regexes = [binding.regexes];
        }

        return fixed;
      } catch (error) {
        console.error('[PresetBundles] Error fixing binding structure:', error);
        return null;
      }
    },

    // 验证脚本和正则是否存在于系统中
    async validateSystemReferences(): Promise<{ missingScripts: string[]; missingRegexes: string[] }> {
      const result = { missingScripts: [] as string[], missingRegexes: [] as string[] };

      try {
        console.log('[PresetBundles] Validating system references...');

        // 获取所有引用的 ID
        const allScriptIds = new Set<string>();
        const allRegexIds = new Set<string>();

        Object.values(this.bindings).forEach(binding => {
          binding.scripts.forEach(id => allScriptIds.add(id));
          binding.regexes.forEach(id => allRegexIds.add(id));
        });

        // 验证脚本引用
        if (allScriptIds.size > 0) {
          const { ScriptManager } = await import('../../script_repository/script_controller');
          const scriptManager = ScriptManager.getInstance();
          const allSystemScripts = [...scriptManager.getGlobalScripts(), ...scriptManager.getCharacterScripts()];
          const allSystemScriptIds = new Set(allSystemScripts.map(s => s.id));

          allScriptIds.forEach(id => {
            if (!allSystemScriptIds.has(id)) {
              result.missingScripts.push(id);
            }
          });
        }

        // 验证正则引用
        if (allRegexIds.size > 0) {
          const { getTavernRegexes } = await import('../../../function/tavern_regex');
          const allSystemRegexes = getTavernRegexes();
          const allSystemRegexIds = new Set(allSystemRegexes.map((r: any) => r.id));

          allRegexIds.forEach(id => {
            if (!allSystemRegexIds.has(id)) {
              result.missingRegexes.push(id);
            }
          });
        }

        if (result.missingScripts.length > 0 || result.missingRegexes.length > 0) {
          console.warn('[PresetBundles] Found missing references:', result);
        } else {
          console.log('[PresetBundles] All system references are valid');
        }

        return result;
      } catch (error) {
        console.error('[PresetBundles] Error validating system references:', error);
        return result;
      }
    },

    // 清理无效引用
    async cleanInvalidReferences(): Promise<void> {
      try {
        console.log('[PresetBundles] Cleaning invalid references...');

        const validation = await this.validateSystemReferences();
        let totalCleaned = 0;

        if (validation.missingScripts.length > 0 || validation.missingRegexes.length > 0) {
          const missingScriptIds = new Set(validation.missingScripts);
          const missingRegexIds = new Set(validation.missingRegexes);

          Object.entries(this.bindings).forEach(([, binding]) => {
            // 清理无效脚本引用
            const originalScriptsCount = binding.scripts.length;
            binding.scripts = binding.scripts.filter(id => !missingScriptIds.has(id));
            totalCleaned += originalScriptsCount - binding.scripts.length;

            // 清理无效正则引用
            const originalRegexesCount = binding.regexes.length;
            binding.regexes = binding.regexes.filter(id => !missingRegexIds.has(id));
            totalCleaned += originalRegexesCount - binding.regexes.length;
          });

          console.log(`[PresetBundles] Cleaned ${totalCleaned} invalid references`);

          // 清理空预设
          this.validateAndCleanBindings();
        }
      } catch (error) {
        console.error('[PresetBundles] Error cleaning invalid references:', error);
      }
    },

    // 快照与应用

    async applyBindings(presetName: PresetName): Promise<void> {
      try {
        console.log(`[PresetBundles] Applying bindings for preset: ${presetName}`);

        const binding = this.getBinding(presetName);
        if (!binding) {
          console.log(`[PresetBundles] No bindings found for preset: ${presetName}`);
          return;
        }

        // 验证绑定数据
        if (!Array.isArray(binding.scripts) || !Array.isArray(binding.regexes)) {
          throw new Error('Invalid binding data structure');
        }

        // 应用脚本绑定
        await this.applyScriptBindings(binding.scripts);

        // 应用正则绑定
        await this.applyRegexBindings(binding.regexes);

        console.log(
          `[PresetBundles] Bindings applied for preset ${presetName}: ${binding.scripts.length} scripts, ${binding.regexes.length} regexes`,
        );
      } catch (error) {
        console.error(`[PresetBundles] Error applying bindings for preset ${presetName}:`, error);
        throw error;
      }
    },

    // 辅助方法 - 应用脚本绑定
    async applyScriptBindings(scriptIds: string[]): Promise<void> {
      const { ScriptManager } = await import('../../script_repository/script_controller');
      const { ScriptType } = await import('../../script_repository/types');
      const scriptManager = ScriptManager.getInstance();

      // 获取所有脚本
      const allGlobalScripts = scriptManager.getGlobalScripts();
      const allCharacterScripts = scriptManager.getCharacterScripts();
      const allScripts = [...allGlobalScripts, ...allCharacterScripts];

      // 创建脚本 ID 到类型的映射
      const scriptTypeMap = new Map<string, typeof ScriptType.GLOBAL | typeof ScriptType.CHARACTER>();
      allGlobalScripts.forEach(s => scriptTypeMap.set(s.id, ScriptType.GLOBAL));
      allCharacterScripts.forEach(s => scriptTypeMap.set(s.id, ScriptType.CHARACTER));

      // 批量处理脚本状态变更
      const promises: Promise<void>[] = [];

      for (const script of allScripts) {
        const shouldEnable = scriptIds.includes(script.id);
        const scriptType = scriptTypeMap.get(script.id);

        if (scriptType && script.enabled !== shouldEnable) {
          // 使用 toggleScript 但不保存到持久化存储（userInput = false）
          promises.push(scriptManager.toggleScript(script, scriptType, shouldEnable, false));
        }
      }

      // 等待所有脚本状态变更完成
      await Promise.all(promises);
    },

    // 辅助方法 - 应用正则绑定
    async applyRegexBindings(regexIds: string[]): Promise<void> {
      const { getTavernRegexes, replaceTavernRegexes } = await import('../../../function/tavern_regex');

      // 获取所有正则
      const allRegexes = getTavernRegexes();

      // 创建目标正则集合
      const targetRegexes = allRegexes.map((regex: any) => ({
        ...regex,
        enabled: regexIds.includes(regex.id),
      }));

      // 替换正则集合
      await replaceTavernRegexes(targetRegexes, { scope: 'all' });
    },

    // 导出导入
    async toExportObject(presetName?: PresetName): Promise<ExportedBundles> {
      try {
        console.log(`[PresetBundles] Exporting bundles for preset: ${presetName || 'all'}`);

        if (presetName) {
          // 导出特定预设的绑定
          const binding = this.getBinding(presetName);
          if (!binding) {
            return {};
          }

          // 获取完整的脚本和正则数据
          const [fullScripts, fullRegexes] = await Promise.all([
            this.getFullScriptsData(binding.scripts),
            this.getFullRegexesData(binding.regexes),
          ]);

          return {
            scripts: fullScripts.map(script => ({ ...script, type: 'preset', presetName } as any)),
            regexes: fullRegexes,
          };
        } else {
          // 导出所有预设的绑定
          const allBindings: ExportedBundles = {
            scripts: [],
            regexes: [],
          };

          for (const [preset, binding] of Object.entries(this.bindings)) {
            const [fullScripts, fullRegexes] = await Promise.all([
              this.getFullScriptsData(binding.scripts),
              this.getFullRegexesData(binding.regexes),
            ]);

            if (allBindings.scripts) {
              allBindings.scripts.push(
                ...fullScripts.map(script => ({ ...script, type: 'preset', presetName: preset } as any)),
              );
            }
            if (allBindings.regexes) {
              allBindings.regexes.push(...fullRegexes);
            }
          }

          return allBindings;
        }
      } catch (error) {
        console.error(`[PresetBundles] Error exporting bundles:`, error);
        return {};
      }
    },

    async imported(bundles: ExportedBundles): Promise<void> {
      try {
        console.log('[PresetBundles] Importing bundles:', bundles);

        // 使用 Zod 验证导入的数据
        const validationResult = validateExportedBundles(bundles);
        if (!validationResult) {
          throw new Error('Invalid bundles data structure');
        }

        if (
          !bundles ||
          ((!bundles.scripts || bundles.scripts.length === 0) && (!bundles.regexes || bundles.regexes.length === 0))
        ) {
          console.log('[PresetBundles] No bundles to import');
          return;
        }

        // 清空现有绑定
        this.bindings = {};

        // 重建绑定数据
        const presetBindingsMap: Record<string, { scripts: Set<string>; regexes: Set<string> }> = {};

        // 导入脚本数据并建立绑定
        if (bundles.scripts) {
          const importedScriptIds = await this.importScriptsData(bundles.scripts);

          bundles.scripts.forEach((script: any, index: number) => {
            const presetName = script.presetName || 'default';
            if (!presetBindingsMap[presetName]) {
              presetBindingsMap[presetName] = { scripts: new Set(), regexes: new Set() };
            }

            // 使用导入后的实际 ID
            const actualId = importedScriptIds[index] || script.id;
            presetBindingsMap[presetName].scripts.add(actualId);
          });
        }

        // 导入正则数据并建立绑定
        if (bundles.regexes) {
          const importedRegexIds = await this.importRegexesData(bundles.regexes);

          bundles.regexes.forEach((regex: any, index: number) => {
            const presetName = regex.presetName || 'default';
            if (!presetBindingsMap[presetName]) {
              presetBindingsMap[presetName] = { scripts: new Set(), regexes: new Set() };
            }

            // 使用导入后的实际 ID
            const actualId = importedRegexIds[index] || regex.id;
            presetBindingsMap[presetName].regexes.add(actualId);
          });
        }

        // 转换为最终格式
        Object.entries(presetBindingsMap).forEach(([presetName, binding]) => {
          this.bindings[presetName] = {
            scripts: Array.from(binding.scripts),
            regexes: Array.from(binding.regexes),
          };
        });

        console.log(`[PresetBundles] Import completed, ${Object.keys(this.bindings).length} preset bindings restored`);
      } catch (error) {
        console.error('[PresetBundles] Error importing bundles:', error);
        throw error;
      }
    },

    // 清理
    clearBinding(presetName: PresetName): void {
      delete this.bindings[presetName];
      console.log(`[PresetBundles] Cleared binding for preset: ${presetName}`);
    },

    // 清理所有绑定
    clearAllBindings(): void {
      const count = Object.keys(this.bindings).length;
      this.bindings = {};
      this.currentPresetName = '';
      console.log(`[PresetBundles] Cleared all bindings (${count} presets)`);
    },

    // 系统健康检查
    async performHealthCheck(): Promise<{
      isHealthy: boolean;
      issues: string[];
      recommendations: string[];
    }> {
      const result = {
        isHealthy: true,
        issues: [] as string[],
        recommendations: [] as string[],
      };

      try {
        console.log('[PresetBundles] Performing health check...');

        // 检查基础数据结构
        if (!this.bindings || typeof this.bindings !== 'object') {
          result.isHealthy = false;
          result.issues.push('Invalid bindings data structure');
          result.recommendations.push('Reset all bindings');
        }

        // 检查当前预设名
        if (this.currentPresetName && typeof this.currentPresetName !== 'string') {
          result.isHealthy = false;
          result.issues.push('Invalid current preset name');
          result.recommendations.push('Reset current preset');
        }

        // 验证绑定数据
        this.validateAndCleanBindings();

        // 检查系统引用
        const validation = await this.validateSystemReferences();
        if (validation.missingScripts.length > 0) {
          result.issues.push(`Missing ${validation.missingScripts.length} script references`);
          result.recommendations.push('Clean invalid script references');
        }

        if (validation.missingRegexes.length > 0) {
          result.issues.push(`Missing ${validation.missingRegexes.length} regex references`);
          result.recommendations.push('Clean invalid regex references');
        }

        // 检查预设数量
        const presetCount = Object.keys(this.bindings).length;
        if (presetCount > 50) {
          result.issues.push(`Too many presets (${presetCount})`);
          result.recommendations.push('Consider cleaning unused presets');
        }

        if (result.issues.length > 0) {
          result.isHealthy = false;
        }

        console.log(`[PresetBundles] Health check completed: ${result.isHealthy ? 'Healthy' : 'Issues found'}`);
        return result;
      } catch (error) {
        console.error('[PresetBundles] Error during health check:', error);
        result.isHealthy = false;
        result.issues.push('Health check failed');
        result.recommendations.push('Restart the preset bundles system');
        return result;
      }
    },

    // 自动修复
    async autoRepair(): Promise<boolean> {
      try {
        console.log('[PresetBundles] Starting auto repair...');

        // 执行健康检查
        const healthCheck = await this.performHealthCheck();

        if (healthCheck.isHealthy) {
          console.log('[PresetBundles] System is healthy, no repair needed');
          return true;
        }

        // 清理无效数据
        this.validateAndCleanBindings();
        await this.cleanInvalidReferences();

        // 重置当前预设名如果无效
        if (this.currentPresetName && !this.bindings[this.currentPresetName]) {
          this.currentPresetName = '';
          console.log('[PresetBundles] Reset current preset name');
        }

        // 再次检查健康状态
        const postRepairCheck = await this.performHealthCheck();
        const repairSuccess = postRepairCheck.isHealthy || postRepairCheck.issues.length < healthCheck.issues.length;

        console.log(`[PresetBundles] Auto repair ${repairSuccess ? 'successful' : 'partially successful'}`);
        return repairSuccess;
      } catch (error) {
        console.error('[PresetBundles] Error during auto repair:', error);
        return false;
      }
    },

    // 辅助方法 - 获取完整的脚本数据
    async getFullScriptsData(scriptIds: string[]): Promise<any[]> {
      try {
        const { ScriptManager } = await import('../../script_repository/script_controller');
        const scriptManager = ScriptManager.getInstance();

        const allGlobalScripts = scriptManager.getGlobalScripts();
        const allCharacterScripts = scriptManager.getCharacterScripts();
        const allScripts = [...allGlobalScripts, ...allCharacterScripts];

        // 找到对应的脚本对象
        const fullScripts = scriptIds
          .map(id => allScripts.find(script => script.id === id))
          .filter((script): script is NonNullable<typeof script> => script !== undefined);

        return fullScripts;
      } catch (error) {
        console.error('[PresetBundles] Error getting full scripts data:', error);
        return [];
      }
    },

    // 辅助方法 - 获取完整的正则数据
    async getFullRegexesData(regexIds: string[]): Promise<any[]> {
      try {
        const { getTavernRegexes } = await import('../../../function/tavern_regex');
        const allRegexes = getTavernRegexes();

        // 找到对应的正则对象
        const fullRegexes = regexIds
          .map(id => allRegexes.find((regex: any) => regex.id === id))
          .filter((regex): regex is NonNullable<typeof regex> => regex !== undefined);

        return fullRegexes;
      } catch (error) {
        console.error('[PresetBundles] Error getting full regexes data:', error);
        return [];
      }
    },

    // 辅助方法 - 导入脚本数据
    async importScriptsData(scripts: any[]): Promise<string[]> {
      try {
        console.log(`[PresetBundles] Importing ${scripts.length} scripts`);

        // 对于预设绑定系统，我们假设脚本已经存在于系统中
        // 只需要验证脚本 ID 的有效性并返回
        const validScriptIds: string[] = [];

        for (const script of scripts) {
          if (script && script.id && typeof script.id === 'string') {
            validScriptIds.push(script.id);
          } else {
            console.warn('[PresetBundles] Invalid script data during import:', script);
          }
        }

        console.log(`[PresetBundles] Validated ${validScriptIds.length} script IDs`);
        return validScriptIds;
      } catch (error) {
        console.error('[PresetBundles] Error importing scripts data:', error);
        return [];
      }
    },

    // 辅助方法 - 导入正则数据
    async importRegexesData(regexes: any[]): Promise<string[]> {
      try {
        console.log(`[PresetBundles] Importing ${regexes.length} regexes`);

        // 对于预设绑定系统，我们假设正则已经存在于系统中
        // 只需要验证正则 ID 的有效性并返回
        const validRegexIds: string[] = [];

        for (const regex of regexes) {
          if (regex && regex.id && typeof regex.id === 'string') {
            validRegexIds.push(regex.id);
          } else {
            console.warn('[PresetBundles] Invalid regex data during import:', regex);
          }
        }

        console.log(`[PresetBundles] Validated ${validRegexIds.length} regex IDs`);
        return validRegexIds;
      } catch (error) {
        console.error('[PresetBundles] Error importing regexes data:', error);
        return [];
      }
    },
  },
});

// 导出类型以便在组件中使用
export type PresetBundlesStore = ReturnType<typeof usePresetBundlesStore>;
