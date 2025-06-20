import { Script, ScriptType } from '@/component/script_repository/types';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { characters, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';

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
    // @ts-ignore
    const avatar = characters?.[this_chid]?.avatar;
    return charactersWithScripts?.includes(avatar) || false;
  }

  /**
   * 加载脚本库原始数据
   */
  loadScripts() {
    const rawGlobalScripts = getSettingValue('script.scriptsRepository') || [];
    this.globalScripts = rawGlobalScripts.map((scriptData: any) => new Script(scriptData));

    // @ts-ignore
    const rawCharacterScripts = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    this.characterScripts = rawCharacterScripts.map((scriptData: any) => new Script(scriptData));

    this._isGlobalScriptEnabled = getSettingValue('script.global_script_enabled') ?? false;
    //@ts-ignore
    this._isCharacterScriptEnabled = this.checkCharacterScriptEnabled();
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
    // @ts-ignore
    this.characterScripts = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
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
      throw new Error('[Script] 保存失败，脚本名称为空');
    }

    const array =
      type === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : // @ts-ignore
          characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

    const index = array.findIndex((s: Script) => s.id === script.id);
    if (index === -1) {
      array.push(script);
    } else {
      array[index] = script;
    }

    if (type === ScriptType.GLOBAL) {
      await this.saveGlobalScripts(array);
    } else {
      await this.saveCharacterScripts(array);
    }

    // 更新本地缓存
    this.loadScripts();
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
      throw new Error('[Script] 保存失败，当前角色为空');
    }

    // @ts-ignore
    await writeExtensionField(this_chid, 'TavernHelper_scripts', array);

    this.characterScripts = array;
  }

  /**
   * 从脚本库中删除脚本
   * @param id 脚本ID
   * @param type 脚本类型
   */
  async deleteScript(id: string, type: ScriptType): Promise<void> {
    const array =
      type === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : // @ts-ignore
          characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

    const existingScriptIndex = array.findIndex((script: Script) => script.id === id);
    if (existingScriptIndex !== -1) {
      array.splice(existingScriptIndex, 1);

      if (type === ScriptType.GLOBAL) {
        await this.saveGlobalScripts(array);
      } else {
        await this.saveCharacterScripts(array);
      }
    } else {
      throw new Error('[Script] 删除脚本失败，脚本不存在');
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
      // @ts-ignore
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
  getScriptType(script: Script): ScriptType {
    return this.globalScripts.some(s => s.id === script.id) ? ScriptType.GLOBAL : ScriptType.CHARACTER;
  }

  /**
   * 将脚本移动到另一个类型的仓库
   * @param script 脚本对象
   * @param sourceType 源类型
   */
  async moveScriptToOtherType(script: Script, sourceType: ScriptType): Promise<void> {
    // 获取源数组和目标数组
    const sourceArray =
      sourceType === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : // @ts-ignore
          characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

    // 从源数组中删除
    const sourceIndex = sourceArray.findIndex((s: any) => s.id === script.id);
    if (sourceIndex !== -1) {
      sourceArray.splice(sourceIndex, 1);

      if (sourceType === ScriptType.GLOBAL) {
        await this.saveGlobalScripts(sourceArray);
      } else {
        await this.saveCharacterScripts(sourceArray);
      }

      // 添加到目标数组
      const targetType = sourceType === ScriptType.GLOBAL ? ScriptType.CHARACTER : ScriptType.GLOBAL;
      const targetArray =
        targetType === ScriptType.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : // @ts-ignore
            characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      targetArray.push(script);

      if (targetType === ScriptType.GLOBAL) {
        await this.saveGlobalScripts(targetArray);
      } else {
        await this.saveCharacterScripts(targetArray);
      }

      return;
    }

    throw new Error('[Script] 移动脚本失败，脚本不存在');
  }

  /**
   * 刷新角色脚本启用状态
   */
  refreshCharacterScriptEnabledState(): void {
    this._isCharacterScriptEnabled = this.checkCharacterScriptEnabled();
  }
}

/**
 * 获取脚本库局部变量
 * @returns 局部变量
 */
export function getCharacterScriptVariables(): Record<string, any> {
  // @ts-ignore
  return characters[this_chid]?.data?.extensions?.TavernHelper_characterScriptVariables || {};
}

/**
 * 替换角色脚本变量
 * @param variables 变量
 */
export async function replaceCharacterScriptVariables(variables: Record<string, any>): Promise<void> {
  if (!this_chid) {
    throw new Error('[Script] 保存变量失败，当前角色为空');
  }
  // @ts-ignore
  await writeExtensionField(this_chid, 'TavernHelper_characterScriptVariables', variables);
}

/**
 * 从脚本允许列表中删除角色
 * @param param0
 */
export async function purgeEmbeddedScripts({ character }: { character: any }): Promise<void> {
  const avatar = character?.character?.avatar;
  const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
  if (avatar) {
    // TODO: 旧版没有 accountStorage，等酒馆更新几个版本后再更换
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
