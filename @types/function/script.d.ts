/**
 * 获取所有处于启用状态的酒馆助手脚本按钮, 主要是方便 QR 助手等兼容脚本按钮
 */
declare function getAllEnabledScriptButtons(): { [script_id: string]: { button_id: string; button_name: string }[] };

type ScriptButton = {
  name: string;
  visible: boolean;
};

type Script = {
  type: 'script',
  enabled: boolean;
  name: string;
  id: string;
  content: string;
  info: string;
  button: {
    enabled: boolean;
    buttons: Array<ScriptButton>;
  }
  data: Record<string, any>;
};
type ScriptFolder = {
  type: 'folder';
  enabled: boolean;
  name: string;
  id: string;
  icon: string;
  color: string;
  scripts: Script[];
}
type ScriptTree = Script | ScriptFolder;

type ScriptTreesOptions = {
  /** 对全局脚本 (`'chat'`)、当前预设脚本 (`'preset'`) 或当前角色卡脚本 (`'global'`) 进行操作 */
  type: 'global' | 'preset' | 'character';
};

/**
 * 获取酒馆助手脚本列表
 *
 * @param option 要操作的酒馆助手脚本类型
 *
 * @returns 酒馆助手脚本列表
 */
declare function getScriptTrees(option: ScriptTreesOptions): ScriptTree[];

/**
 * 完全替换酒馆助手列表为 `script_trees`
 *
 * @param script_trees 要用于替换的酒馆助手列表
 * @param option 要操作的酒馆助手脚本类型
 */
declare function replaceScriptTrees(script_trees: PartialDeep<ScriptTree>[], option: ScriptTreesOptions): void;

/**
 * 用 `updater` 函数更新酒馆助手列表
 *
 * @param updater 用于更新酒馆助手列表的函数. 它应该接收酒馆助手列表作为参数, 并返回更新后的酒馆助手列表.
 * @param option 要操作的酒馆助手脚本类型
 *
 * @returns 更新后的酒馆助手列表
 */
declare function updateScriptTreesWith(
  updater: (script_trees: ScriptTree[]) => PartialDeep<ScriptTree>[],
  option: ScriptTreesOptions,
): ScriptTree[];

/**
 * 用 `updater` 函数更新酒馆助手列表
 *
 * @param updater 用于更新酒馆助手列表的函数. 它应该接收酒馆助手列表作为参数, 并返回更新后的酒馆助手列表.
 * @param option 要操作的酒馆助手脚本类型
 *
 * @returns 更新后的酒馆助手列表
 */
declare function updateScriptTreesWith(
  updater: (script_trees: ScriptTree[]) => Promise<PartialDeep<ScriptTree>[]>,
  option: ScriptTreesOptions,
): Promise<ScriptTree[]>;
