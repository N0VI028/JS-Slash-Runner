import { _getScriptId } from '@/function/util';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { getButtonId } from '@/store/iframe_runtimes/script';
import { getScriptsStoreByType } from '@/store/scripts';
import { ScriptTree } from '@/type/scripts';
import isPromise from 'is-promise';
import { PartialDeep } from 'type-fest';

type ScriptTreesOptions = {
  type: 'global' | 'preset' | 'character';
};

export function getScriptTrees(option: ScriptTreesOptions): ScriptTree[] {
  return klona(getScriptsStoreByType(option.type).script_trees);
}

export function replaceScriptTrees(script_trees: PartialDeep<ScriptTree>[], option: ScriptTreesOptions): void {
  const store = getScriptsStoreByType(option.type);

  let parsed: ScriptTree[];
  try {
    parsed = script_trees.map(tree => ScriptTree.parse(tree));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    toastr.error(errorMsg, '脚本数据验证失败');
    throw error;
  }

  store.script_trees.length = 0;
  store.script_trees.push(...parsed);
}

export function updateScriptTreesWith(
  updater: (script_trees: ScriptTree[]) => PartialDeep<ScriptTree>[],
  option: ScriptTreesOptions,
): ScriptTree[];
export function updateScriptTreesWith(
  updater: (script_trees: ScriptTree[]) => Promise<PartialDeep<ScriptTree>[]>,
  option: ScriptTreesOptions,
): Promise<ScriptTree[]>;
export function updateScriptTreesWith(
  updater:
    | ((script_trees: ScriptTree[]) => PartialDeep<ScriptTree>[])
    | ((script_trees: ScriptTree[]) => Promise<PartialDeep<ScriptTree>[]>),
  option: ScriptTreesOptions,
): ScriptTree[] | Promise<ScriptTree[]> {
  const script_trees = getScriptTrees(option);
  const result = updater(script_trees);
  if (isPromise(result)) {
    return result.then((result: PartialDeep<ScriptTree>[]) => {
      replaceScriptTrees(result, option);
      return getScriptTrees(option);
    });
  }
  replaceScriptTrees(result, option);
  return getScriptTrees(option);
}

type ScriptButton = {
  name: string;
  visible: boolean;
};

export function _getButtonEvent(this: Window, button_name: string): string {
  return getButtonId(String(_getScriptId.call(this)), button_name);
}

export function _getScriptButtons(this: Window): ScriptButton[] {
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this));
  // TODO: 对于预设脚本、角色脚本, $(window).on('pagehide') 时已经切换了角色卡, get 会失败
  if (!script) {
    return [];
  }
  return klona(script.button.buttons);
}

export function getAllEnabledScriptButtons(): { [script_id: string]: { button_id: string; button_name: string }[] } {
  return klona(useScriptIframeRuntimesStore().button_map);
}

export function _replaceScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, param1: string | ScriptButton[], param2?: ScriptButton[]): void {
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this))!;
  // TODO: 对于预设脚本、角色脚本, $(window).on('pagehide') 时已经切换了角色卡, get 会失败
  if (!script) {
    return;
  }
  const new_buttons = typeof param1 === 'string' ? param2! : param1;
  if (!_.isEqual(script.button.buttons, new_buttons)) {
    script.button.buttons = new_buttons;
  }
}

export function _updateScriptButtonsWith(
  this: Window,
  updater: (buttons: ScriptButton[]) => ScriptButton[],
): ScriptButton[];
export function _updateScriptButtonsWith(
  this: Window,
  updater: (buttons: ScriptButton[]) => Promise<ScriptButton[]>,
): Promise<ScriptButton[]>;
export function _updateScriptButtonsWith(
  this: Window,
  updater: ((buttons: ScriptButton[]) => ScriptButton[]) | ((buttons: ScriptButton[]) => Promise<ScriptButton[]>),
): ScriptButton[] | Promise<ScriptButton[]> {
  const buttons = _getScriptButtons.call(this);
  let result = updater(buttons);
  if (isPromise(result)) {
    result = result.then((result: ScriptButton[]) => {
      _replaceScriptButtons.call(this, result);
      return result;
    });
  } else {
    _replaceScriptButtons.call(this, result);
  }
  return result;
}

export function _appendInexistentScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _appendInexistentScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _appendInexistentScriptButtons(
  this: Window,
  param1: string | ScriptButton[],
  param2?: ScriptButton[],
): ScriptButton[] {
  const new_buttons = typeof param1 === 'string' ? param2! : param1;
  // @ts-expect-error 类型正确
  return _updateScriptButtonsWith.call(this, buttons => {
    const inexistent_buttons = new_buttons.filter(button => !buttons.some(b => b.name === button.name));
    return [...buttons, ...inexistent_buttons];
  });
}

export function _getScriptName(this: Window): string {
  // TODO: 对于预设脚本、角色脚本, $(window).on('pagehide') 时已经切换了角色卡, get 会失败
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this));
  if (!script) {
    return '';
  }
  return script.name;
}

export function _getScriptInfo(this: Window): string {
  // TODO: 对于预设脚本、角色脚本, $(window).on('pagehide') 时已经切换了角色卡, get 会失败
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this));
  if (!script) {
    return '';
  }
  return script.info;
}

export function _replaceScriptInfo(this: Window, info: string): void {
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this))!;
  if (!script) {
    return;
  }
  script.info = info;
}
