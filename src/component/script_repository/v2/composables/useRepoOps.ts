import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { repositoryService } from '../services/repository.service';
import { useCharacterScriptStore, useGlobalScriptStore, usePresetScriptStore } from '../stores/factory';
import { usePopups } from './usePopups';
import { useScriptRepoCommands } from './useScriptRepoCommands';
import { useScriptRuntime } from './useScriptRuntime';

export function useRepoOps() {
  const globalScriptStore = useGlobalScriptStore();
  const characterScriptStore = useCharacterScriptStore();
  const presetScriptStore = usePresetScriptStore();
  const commands = useScriptRepoCommands();

  async function toggleFolderScripts(type: ScriptType, folderId: string): Promise<void> {
    try {
      const store =
        type === 'global' ? globalScriptStore : type === 'character' ? characterScriptStore : presetScriptStore;
      const folderScripts = store.getFolderScripts(folderId);
      if (folderScripts.length === 0) return;
      const allEnabled = folderScripts.every(s => s.enabled);
      const target = !allEnabled;
      const runtime = useScriptRuntime();
      await runtime.toggleFolderScripts(folderId, type as any, target);
      toastr.success(
        `${target ? '启用' : '禁用'}成功`,
        `已${target ? '启用' : '禁用'}文件夹内${folderScripts.length}个脚本`,
      );
    } catch (error) {
      console.error('文件夹脚本切换失败:', error);
      toastr.error('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function exportSingle(type: ScriptType, scriptId: string): Promise<void> {
    try {
      // 使用统一的导出方法，自动处理文件生成和下载
      await repositoryService.exportScripts([scriptId], type, 'single');
      toastr.success('导出成功', '脚本已导出');
    } catch (error) {
      console.error('导出失败:', error);
      toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function moveWithinFolder(type: ScriptType, scriptId: string): Promise<void> {
    try {
      const popups = usePopups();
      const input = await popups.promptText('输入目标文件夹ID（留空则移动到根）');
      if (!input.confirmed) return;
      const folderId = input.data?.trim() || null;
      await repositoryService.moveScriptWithinType(type, scriptId, folderId);
      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      toastr.success('已移动', folderId ? '脚本已移动到目标文件夹' : '脚本已移动到根目录');
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function moveType(source: ScriptType, scriptId: string): Promise<void> {
    try {
      const popups = usePopups();
      const runtime = useScriptRuntime();

      const script = await repositoryService.getScriptFromType(source as any, scriptId);
      if (!script) {
        toastr.error('移动失败', '脚本不存在');
        return;
      }

      const selection = await popups.selectTarget({ title: '移动到:', showPresetOption: true });
      if (!selection.confirmed || !selection.data) return;
      const targetSel = selection.data.target as 'global' | 'character' | 'preset';

      // 加载目标仓库检查冲突
      const targetRepo = await repositoryService.loadRepositoryByType(targetSel as any);
      const targetScripts = repositoryService.getAllScripts(targetRepo);
      const conflict = targetScripts.find(s => s.id === script.id);

      if (conflict) {
        const decision = await popups.resolveMoveIdConflict({
          scriptName: script.name,
          existingScriptName: conflict.name,
          target: targetSel === 'preset' ? (source === 'preset' ? 'global' : source) : targetSel,
        });
        if (decision === 'cancel') return;
        if (decision === 'override') {
          await repositoryService.deleteScriptInType(
            (targetSel === 'preset' ? 'global' : targetSel) as any,
            conflict.id,
          );
          await repositoryService.deleteScriptInType(source as any, scriptId);
          await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
        } else if (decision === 'new') {
          await repositoryService.deleteScriptInType(source as any, scriptId);
          script.id = uuidv4();
          await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
        }
      } else {
        await repositoryService.deleteScriptInType(source as any, scriptId);
        await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
      }

      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      await commands.initRepository();

      if (script.enabled) {
        if (targetSel === 'global' && globalScriptStore.enabled) await runtime.startScript(script.id, 'global' as any);
        else if (targetSel === 'character' && characterScriptStore.enabled)
          await runtime.startScript(script.id, 'character' as any);
        else if (targetSel === 'preset' && presetScriptStore.enabled)
          await runtime.startScript(script.id, 'preset' as any);
      }

      toastr.success('移动成功', '脚本已移动到另一脚本库');
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function moveFolderType(source: ScriptType, folderId: string): Promise<void> {
    try {
      const popups = usePopups();
      const runtime = useScriptRuntime();

      const sourceRepo = await repositoryService.loadRepositoryByType(source as any);
      const folder = repositoryService.getAllFolders(sourceRepo).find(f => f.id === folderId);
      if (!folder) {
        toastr.error('移动失败', '文件夹不存在');
        return;
      }

      const selection = await popups.selectTarget({ title: '移动文件夹到:', showPresetOption: true });
      if (!selection.confirmed || !selection.data) return;
      const targetSel = selection.data.target as 'global' | 'character' | 'preset';
      if (targetSel === source) {
        toastr.info('移动取消', '目标库与源库相同');
        return;
      }

      const targetRepoBefore = await repositoryService.loadRepositoryByType(targetSel as any);
      const targetAllScripts = repositoryService.getAllScripts(targetRepoBefore);
      const folderScripts = repositoryService.getFolderScripts(sourceRepo, folderId);

      for (const s of folderScripts) {
        const conflict = targetAllScripts.find(ts => ts.id === s.id);
        if (!conflict) continue;
        const decision = await popups.resolveMoveIdConflict({
          scriptName: s.name,
          existingScriptName: conflict.name,
          target: targetSel,
        });
        if (decision === 'cancel') return;
        if (decision === 'override') {
          await repositoryService.deleteScriptInType(targetSel as any, conflict.id);
        } else if (decision === 'new') {
          s.id = uuidv4();
        }
      }

      await repositoryService.moveFolderBetweenTypes(
        folderId,
        source as any,
        targetSel as any,
        async ({ script, conflict, target }) => {
          const decision = await popups.resolveMoveIdConflict({
            scriptName: script.name,
            existingScriptName: conflict.name,
            target,
          });
          return decision;
        },
      );

      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      await commands.initRepository();

      const masterEnabled = (await import('@/util/extension_variables')).getSettingValue('enabled_extension');
      if (masterEnabled) {
        const targetEnabled =
          targetSel === 'global'
            ? globalScriptStore.enabled
            : targetSel === 'character'
            ? characterScriptStore.enabled
            : presetScriptStore.enabled;
        if (targetEnabled) {
          const targetRepoAfter = await repositoryService.loadRepositoryByType(targetSel as any);
          const folderInTarget = repositoryService.getAllFolders(targetRepoAfter).find(f => f.id === folderId);
          if (folderInTarget && Array.isArray((folderInTarget as any).value)) {
            const scripts = (folderInTarget as any).value
              .filter((i: any) => i?.type === 'script')
              .map((i: any) => i.value);
            for (const s of scripts) {
              if (s?.enabled) await runtime.startScript(s.id, targetSel as any);
            }
          }
        }
      }

      const targetName =
        targetSel === 'global' ? '全局脚本库' : targetSel === 'character' ? '角色脚本库' : '预设脚本库';
      toastr.success('移动成功', `文件夹"${folder.name}"已移动到${targetName}`);
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function editFolder(type: ScriptType, folderId: string): Promise<void> {
    try {
      const repo = await repositoryService.loadRepositoryByType(type);
      const folder = repo.find(item => (item as any).type === 'folder' && (item as any).id === folderId) as any;
      if (!folder) {
        toastr.error('编辑失败', '找不到指定文件夹');
        return;
      }
      const result = await usePopups().editFolder({
        name: String(folder.name || ''),
        icon: String(folder.icon || ''),
        color: String(folder.color || ''),
        target: type,
      } as any);
      if (!result.confirmed || !result.data) return;
      await repositoryService.updateFolderInType(type, folderId, {
        name: result.data.name,
        icon: result.data.icon,
        color: result.data.color,
      });
      await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
      await commands.initRepository();
      toastr.success('保存成功', '文件夹已更新');
    } catch (error) {
      console.error('编辑失败:', error);
      toastr.error('编辑失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function exportFolder(type: ScriptType, folderId: string): Promise<void> {
    try {
      // 使用统一的导出方法，自动处理ZIP生成和下载
      await repositoryService.exportFolderToZip(type, folderId);
      toastr.success('导出成功', '文件夹已导出');
    } catch (error) {
      console.error('导出失败:', error);
      toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function deleteFolder(type: ScriptType, folderId: string): Promise<void> {
    try {
      const confirmed = await usePopups().confirmDelete('确定要删除该文件夹及其内的所有脚本吗？此操作不可撤销。');
      if (!confirmed) return;
      await repositoryService.deleteFolderInType(type, folderId);
      await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
      await commands.initRepository();
      toastr.success('删除成功', '文件夹已删除');
    } catch (error) {
      console.error('删除失败:', error);
      toastr.error('删除失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  // 包裹 commands，统一一处
  async function toggleScript(type: ScriptType, id: string): Promise<void> {
    await commands.toggleScriptEnabled(type as any, id);
  }
  async function showInfo(type: ScriptType, id: string): Promise<void> {
    await commands.showScriptInfo(type as any, id);
  }
  async function editScript(type: ScriptType, id: string): Promise<void> {
    await commands.editScript(type as any, id);
  }
  async function deleteScript(type: ScriptType, id: string): Promise<void> {
    await commands.confirmDeleteScript(type as any, id);
  }

  return {
    toggleFolderScripts,
    exportSingle,
    moveWithinFolder,
    moveType,
    moveFolderType,
    editFolder,
    exportFolder,
    deleteFolder,
    toggleScript,
    showInfo,
    editScript,
    deleteScript,
  };
}

export function createRepoOpsForType(type: ScriptType) {
  const ops = useRepoOps();
  return {
    toggleFolderScripts: (id: string) => ops.toggleFolderScripts(type, id),
    exportSingle: (id: string) => ops.exportSingle(type, id),
    moveWithinFolder: (id: string) => ops.moveWithinFolder(type, id),
    moveType: (id: string) => ops.moveType(type, id),
    moveFolderType: (id: string) => ops.moveFolderType(type, id),
    editFolder: (id: string) => ops.editFolder(type as ScriptType, id),
    exportFolder: (id: string) => ops.exportFolder(type as ScriptType, id),
    deleteFolder: (id: string) => ops.deleteFolder(type as ScriptType, id),
    toggleScript: (id: string) => ops.toggleScript(type, id),
    showInfo: (id: string) => ops.showInfo(type, id),
    editScript: (id: string) => ops.editScript(type, id),
    deleteScript: (id: string) => ops.deleteScript(type, id),
  };
}
