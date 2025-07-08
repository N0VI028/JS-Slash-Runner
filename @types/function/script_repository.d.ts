interface ScriptButton {
  name: string;
  visible: boolean;
}

/**
 * 获取指定脚本的按钮设置
 * @param script_id 脚本ID
 * @returns 按钮
 *
 * @example
 * // 在脚本内获取当前脚本的按钮设置
 * const buttons = getScriptButtons(getScriptId());
 */
function getScriptButtons(script_id: string): ScriptButton[] {
  if (!script_id) {
    throw new Error('脚本ID不能为空');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

/**
 * 替换指定脚本的按钮设置
 * @param script_id 脚本ID
 * @param buttons 按钮
 *
 * @example
 * // 在脚本内设置脚本按钮为一个"开始游戏"按钮
 * replaceScriptButtons(getScriptId(), [{name: '开始游戏', visible: true}])
 *
 * @example
 * // 点击"前往地点"按钮后，切换为地点选项按钮
 * eventOnButton("前往地点" () => {
 *   replaceScriptButtons(getScriptId(), [{name: '学校', visible: true}, {name: '商店', visible: true}])
 * })
 */
function replaceScriptButtons(script_id: string, buttons: ScriptButton[]): void {
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
