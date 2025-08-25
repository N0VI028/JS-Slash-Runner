import { ScriptData } from '@/component/script_repository/data';
import { ScriptManager } from '@/component/script_repository/script_controller';
import { _getScriptId } from '@/function/util';

type ScriptButton = {
  name: string;
  visible: boolean;
};

export function _getButtonEvent(this: Window, button_name: string): string {
  return `${String(_getScriptId.call(this))}_${button_name}`;
}

export function _getScriptButtons(this: Window): ScriptButton[] {
  return ScriptManager.getInstance().getScriptButton(_getScriptId.call(this));
}

export function _replaceScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, param1: string | ScriptButton[], param2?: ScriptButton[]): void {
  const script_id = _getScriptId.call(this);

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`脚本不存在: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = typeof param1 === 'string' ? param2! : param1;
  ScriptManager.getInstance().setScriptButton(script, type);
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
  const inexistent_buttons = buttons.filter(button => !script_buttons.some(sb => sb.name === button.name));
  if (inexistent_buttons.length === 0) {
    return;
  }

  _replaceScriptButtons.call(this, [...script_buttons, ...inexistent_buttons]);
}
