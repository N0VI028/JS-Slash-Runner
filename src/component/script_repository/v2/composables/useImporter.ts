import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { createDefaultScript, ScriptSchema, type Script } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

export function useImporter() {
  async function importFiles(files: FileList): Promise<void> {
    if (!files?.length) return;

    try {
      const popups = (await import('./usePopups')).usePopups();
      const result = await popups.selectTarget({ title: '导入到:' });
      if (!result.confirmed || !result.data) return;
      const tgt = result.data.target as ScriptType;

      const jsonScripts: any[] = [];
      let totalImported = 0;

      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.zip')) {
          const count = await importZipIntoSingleFolder(file, tgt);
          totalImported += count;
        } else {
          const content = await readFileAsText(file);
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item && item.name && 'content' in item) {
                  jsonScripts.push(item);
                }
              }
            } else if (parsed && parsed.name && 'content' in parsed) {
              jsonScripts.push(parsed);
            } else {
              jsonScripts.push({
                name: file.name.replace(/\.[^/.]+$/, ''),
                content,
                info: `从文件 ${file.name} 导入`,
              });
            }
          } catch {
            jsonScripts.push({
              name: file.name.replace(/\.[^/.]+$/, ''),
              content,
              info: `从文件 ${file.name} 导入`,
            });
          }
        }
      }

      if (jsonScripts.length > 0) {
        totalImported += await importScriptsWithConflictHandling(tgt, jsonScripts, null);
      }

      const { useScriptRepoCommands } = await import('./useScriptRepoCommands');
      const commands = useScriptRepoCommands();
      await commands.initRepository();
      toastr.success('导入成功', `已导入 ${totalImported} 个脚本`);
    } catch (error) {
      console.error('导入失败:', error);
      toastr.error('导入失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function importZipIntoSingleFolder(file: File, type: ScriptType): Promise<number> {
    //@ts-ignore
    if (!window.JSZip) {
      await import('@sillytavern/lib/jszip.min.js');
    }
    //@ts-ignore
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const topLevelFolders = new Set<string>();
    const scripts: any[] = [];

    for (const fileName in zipContent.files) {
      const entry = zipContent.files[fileName];
      if (entry.dir) continue;
      if (!fileName.toLowerCase().endsWith('.json')) continue;

      const parts = fileName.split('/');
      if (parts.length > 1) {
        topLevelFolders.add(parts[0]);
      }

      const text = await entry.async('string');
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.name && 'content' in item) {
              scripts.push(item);
            }
          }
        } else if (parsed && parsed.name && 'content' in parsed) {
          scripts.push(parsed);
        }
      } catch {
        // ignore invalid JSON
      }
    }

    if (scripts.length === 0) return 0;

    let folderName = '';
    if (topLevelFolders.size > 0) {
      const names = Array.from(topLevelFolders).map(sanitizeName);
      folderName = names.join('_');
    } else {
      const base = file.name.replace(/\.zip$/i, '');
      folderName = sanitizeName(base);
    }
    if (!folderName) folderName = 'imported';

    const folderId = await repositoryService.createFolderInType(type, { name: folderName, target: type });

    const importedCount = await importScriptsWithConflictHandling(type, scripts, folderId);
    return importedCount;
  }

  function sanitizeName(name: string): string {
    return String(name || '').replace(/[<>:"\\/\\|?*]/g, '_');
  }

  function normalizeImportedScript(raw: any): Script {
    const script = createDefaultScript({
      id: raw?.id,
      name: String(raw?.name || ''),
      content: String(raw?.content || ''),
      info: String(raw?.info || ''),
      enabled: false,
      buttons: Array.isArray(raw?.buttons) ? raw.buttons : [],
      data: raw?.data && typeof raw.data === 'object' ? raw.data : {},
    });
    ScriptSchema.parse(script);
    return script;
  }

  function findIdConflict(
    globalScripts: Script[],
    characterScripts: Script[],
    id: string,
  ): { existing: Script; existingType: ScriptType } | null {
    const conflictInGlobal = globalScripts.find(s => s.id === id);
    if (conflictInGlobal) return { existing: conflictInGlobal, existingType: 'global' };
    const conflictInCharacter = characterScripts.find(s => s.id === id);
    if (conflictInCharacter) return { existing: conflictInCharacter, existingType: 'character' };
    return null;
  }

  async function importScriptsWithConflictHandling(
    type: ScriptType,
    rawScripts: any[],
    folderId: string | null,
  ): Promise<number> {
    const [globalRepo, characterRepo] = await Promise.all([
      repositoryService.loadRepositoryByType('global'),
      repositoryService.loadRepositoryByType('character'),
    ]);
    const globalScripts = repositoryService.getAllScripts(globalRepo);
    const characterScripts = repositoryService.getAllScripts(characterRepo);
    const popups = (await import('./usePopups')).usePopups();

    let imported = 0;
    for (const raw of rawScripts) {
      const script = normalizeImportedScript(raw);

      if (raw && typeof raw.id === 'string' && raw.id.trim()) {
        const conflict = findIdConflict(globalScripts, characterScripts, script.id);
        if (conflict) {
          const decision = await popups.resolveImportIdConflict({
            scriptName: script.name,
            existingScriptName: conflict.existing.name,
            existingType: conflict.existingType,
          });

          if (decision === 'cancel') {
            continue;
          }
          if (decision === 'override') {
            await repositoryService.deleteScriptInType(conflict.existingType, conflict.existing.id);
            await repositoryService.insertExistingScriptInType(type, script, folderId);
            imported++;
            continue;
          }
          if (decision === 'new') {
            script.id = uuidv4();
            await repositoryService.insertExistingScriptInType(type, script, folderId);
            imported++;
            continue;
          }
        } else {
          await repositoryService.insertExistingScriptInType(type, script, folderId);
          imported++;
          continue;
        }
      }

      await repositoryService.insertExistingScriptInType(type, script, folderId);
      imported++;
    }

    return imported;
  }

  return {
    importFiles,
  };
}
