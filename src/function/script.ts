import { _getScriptId } from '@/function/util';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { getButtonId } from '@/store/iframe_runtimes/script';

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
  script.button.buttons = typeof param1 === 'string' ? param2! : param1;
}

export function _appendInexistentScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _appendInexistentScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _appendInexistentScriptButtons(
  this: Window,
  param1: string | ScriptButton[],
  param2?: ScriptButton[],
): void {
  const buttons = typeof param1 === 'string' ? param2! : param1;
  const script_buttons = _getScriptButtons.call(this);
  const inexistent_buttons = buttons.filter(button => !script_buttons.some(b => b.name === button.name));
  if (inexistent_buttons.length === 0) {
    return;
  }
  _replaceScriptButtons.call(this, [...script_buttons, ...inexistent_buttons]);
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
