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
  return _.cloneDeep(useScriptIframeRuntimesStore().get(_getScriptId.call(this))!.buttons.button);
}

export function _replaceScriptButtons(this: Window, script_id: string, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, buttons: ScriptButton[]): void;
export function _replaceScriptButtons(this: Window, param1: string | ScriptButton[], param2?: ScriptButton[]): void {
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this))!;
  script.buttons.button = typeof param1 === 'string' ? param2! : param1;
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
  return useScriptIframeRuntimesStore().get(_getScriptId.call(this))!.info;
}

export function _replaceScriptInfo(this: Window, info: string): void {
  const script = useScriptIframeRuntimesStore().get(_getScriptId.call(this))!;
  script.info = info;
}
