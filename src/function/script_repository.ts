import { ScriptData } from '@/component/script_repository/data';
import { ScriptManager } from '@/component/script_repository/script_controller';

interface ScriptButton {
  name: string;
  visible: boolean;
}

/**
 * 获取指定脚本的按钮数组
 * @param script_id 脚本ID
 * @returns 按钮数组
 */
export function getScriptButtons(script_id: string): ScriptButton[] {
  if (!script_id) {
    throw new Error('脚本ID不能为空');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

/**
 * 修改指定脚本的按钮数组
 * @param script_id 脚本ID
 * @param buttons 脚本数组
 */
export function replaceScriptButtons(script_id: string, buttons: ScriptButton[]): void {
  if (!script_id) {
    throw new Error(`脚本ID不能为空`);
  }

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`脚本不存在: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = buttons;
  ScriptManager.getInstance().setScriptButton(script, type);
}
