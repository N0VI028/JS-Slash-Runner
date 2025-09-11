import type { Script } from '@/component/script_repository/schemas/script.schema';
import { repositoryService } from '@/component/script_repository/services/repository.service';
import { buttonManager, getButtonId, getScriptButton } from '@/component/script_repository/utils/buttonManager';
import { _getScriptId } from '@/function/util';

type ScriptButton = {
  name: string;
  visible: boolean;
};

export function _getButtonEvent(this: Window, button_name: string): string {
  return getButtonId(String(_getScriptId.call(this)), button_name);
}

export function _getScriptButtons(this: Window): ScriptButton[] {
  const scriptId = _getScriptId.call(this);
  return getScriptButton(scriptId) as ScriptButton[];
}

export function _replaceScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, param1: string | ScriptButton[], param2?: ScriptButton[]): void {
  const scriptId = typeof param1 === 'string' ? param1 : _getScriptId.call(this);
  const newButtons = (typeof param1 === 'string' ? param2! : param1) as ScriptButton[];

  const found = repositoryService.findScriptInAllTypes(scriptId);
  if (!found) throw new Error(`脚本不存在: ${scriptId}`);

  (found.script as Script).buttons = newButtons as any;
  try {
    buttonManager.rebuildButtonsForScript(found.script as Script);
  } catch {}
  repositoryService.updateScriptInType(found.type, found.script as Script).catch(() => {});
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

export function _getScriptInfo(this: Window): string {
  const scriptId = _getScriptId.call(this);
  const found = repositoryService.findScriptInAllTypes(scriptId);
  if (found && found.script) return (found.script.info || '') as string;
  throw new Error(`脚本不存在: ${scriptId}`);
}

export function _replaceScriptInfo(this: Window, info: string): void {
  const scriptId = _getScriptId.call(this);
  const found = repositoryService.findScriptInAllTypes(scriptId);
  if (!found) throw new Error(`脚本不存在: ${scriptId}`);
  (found.script as Script).info = info;
  repositoryService.updateScriptInType(found.type, found.script as Script).catch(() => {});
}
