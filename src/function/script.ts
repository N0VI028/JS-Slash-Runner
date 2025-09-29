import { _getScriptId } from '@/function/util';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { Script } from '@/type/scripts';
import { getStringHash } from '@sillytavern/scripts/utils';

type ScriptButton = {
  name: string;
  visible: boolean;
};

export function get_button_id(iframe_id: string, button_name: string): string {
  return `${iframe_id}_${getStringHash(button_name)}`;
}

export function get_script(script_id: string): Script | undefined {
  // 仅允许脚本对自身操作, 因此只考虑 enabled_scripts
  return _.concat(
    useGlobalScriptsStore().enabled_scripts,
    useCharacterScriptsStore().enabled_scripts,
    usePresetScriptsStore().enabled_scripts,
  ).find(script => script.id === script_id);
}

export function _getButtonEvent(this: Window, button_name: string): string {
  return get_button_id(String(_getScriptId.call(this)), button_name);
}

export function _getScriptButtons(this: Window): ScriptButton[] {
  return _.cloneDeep(get_script(_getScriptId.call(this))!.button.buttons);
}

export function _replaceScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, param1: string | ScriptButton[], param2?: ScriptButton[]): void {
  const script = get_script(_getScriptId.call(this))!;
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
  return get_script(_getScriptId.call(this))!.info;
}

export function _replaceScriptInfo(this: Window, info: string): void {
  const script = get_script(_getScriptId.call(this))!;
  script.info = info;
}
