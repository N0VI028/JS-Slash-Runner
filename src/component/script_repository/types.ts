import { uuidv4 } from '@sillytavern/scripts/utils';

export class Script {
  id: string;
  name: string;
  content: string;
  info: string;
  buttons: { name: string; visible: boolean }[];
  data: { [variableName: string]: any };
  enabled: boolean;

  constructor(data?: Partial<Script>) {
    this.id = data?.id && data.id.trim() !== '' ? data.id : uuidv4();
    this.name = data?.name || '';
    this.content = data?.content || '';
    this.info = data?.info || '';
    this.enabled = data?.enabled || false;
    this.buttons = data?.buttons || [];
    this.data = data?.data || {};
  }
}


export interface ScriptRepositoryItem {
  type: 'folder' | 'script';
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  value: Script[] | Script;
}

export enum ScriptType {
  GLOBAL = 'global',
  CHARACTER = 'character',
}

export const defaultScriptSettings = {
  global_script_enabled: true,
  scriptsRepository: [] as (Script | ScriptRepositoryItem)[],
  characters_with_scripts: [] as string[],
};

export interface IFrameElement extends HTMLIFrameElement {
  cleanup: () => void;
  [prop: string]: any;
}

export function isScriptRepositoryItem(item: any): item is ScriptRepositoryItem {
  return item && typeof item === 'object' && 'type' in item && 'value' in item;
}

export function isScript(item: any): item is Script {
  return item && typeof item === 'object' && 'id' in item && 'name' in item && 'content' in item;
}

export function migrateScriptsToRepositoryItems(scripts: Script[]): ScriptRepositoryItem[] {
  return scripts.map(script => ({
    type: 'script',
    value: script,
  }));
}

export function extractScriptsFromRepository(repository: (Script | ScriptRepositoryItem)[]): Script[] {
  const scripts: Script[] = [];

  for (const item of repository) {
    if (isScript(item)) {
      scripts.push(item);
    } else if (isScriptRepositoryItem(item)) {
      if (item.type === 'script') {
        scripts.push(item.value as Script);
      } else if (item.type === 'folder') {
        const folderScripts = item.value as Script[];
        scripts.push(...folderScripts);
      }
    }
  }

  return scripts;
}

/**
 * 获取相对的脚本类型（全局<->角色）
 * @param type 当前脚本类型
 * @returns 相对的脚本类型
 */
export function getOppositeScriptType(type: ScriptType): ScriptType {
  return type === ScriptType.GLOBAL ? ScriptType.CHARACTER : ScriptType.GLOBAL;
}

/**
 * 获取脚本列表容器的选择器
 * @param type 脚本类型
 * @returns 容器选择器字符串
 */
export function getScriptListSelector(type: ScriptType): string {
  return type === ScriptType.GLOBAL ? '#global-script-list' : '#character-script-list';
}

/**
 * 获取批量控制器的选择器
 * @param type 脚本类型
 * @returns 批量控制器选择器字符串
 */
export function getBatchControlsSelector(type: ScriptType): string {
  return type === ScriptType.GLOBAL ? '#global-batch-controls' : '#character-batch-controls';
}

/**
 * 获取脚本类型切换器的选择器
 * @param type 脚本类型
 * @returns 切换器选择器字符串
 */
export function getScriptToggleSelector(type: ScriptType): string {
  return type === ScriptType.GLOBAL ? '#global-script-enable-toggle' : '#character-script-enable-toggle';
}
