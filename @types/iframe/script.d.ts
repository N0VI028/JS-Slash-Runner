/**
 * 获取按钮对应的事件类型, **只能在脚本中使用**
 *
 * @param button_name 按钮名
 * @returns 事件类型
 *
 * @example
 * const event_type = getButtonEvent('按钮名');
 * eventOn(event_type, () => {
 *   console.log('按钮被点击了');
 * });
 */
declare function getButtonEvent(button_name: string): string;

type ScriptButton = {
  name: string;
  visible: boolean;
};

/**
 * 获取指定脚本 `script_id` 的按钮, **只能在脚本中使用**
 *
 * @returns 按钮数组
 *
 * @example
 * // 在脚本内获取当前脚本的按钮设置
 * const buttons = getScriptButtons();
 */
declare function getScriptButtons(): ScriptButton[];

/**
 * 替换指定脚本 `script_id` 的按钮, **只能在脚本中使用**
 *
 * @param buttons 按钮数组
 *
 * @example
 * // 在脚本内设置脚本按钮为一个"开始游戏"按钮
 * replaceScriptButtons([{name: '开始游戏', visible: true}])
 *
 * @example
 * // 点击"前往地点"按钮后，切换为地点选项按钮
 * eventOnButton("前往地点" () => {
 *   replaceScriptButtons([{name: '学校', visible: true}, {name: '商店', visible: true}])
 * })
 */
declare function replaceScriptButtons(buttons: ScriptButton[]): void;

/**
 * 如果指定脚本 `script_id` 没有 `buttons`, 为脚本新增它们到现有按钮末尾, **只能在脚本中使用**
 *
 * @param buttons
 *
 * @exmaple
 * // 新增 "重新开始" 按钮
 * appendInexistentScriptButtons([{name: '重新开始', visible: true}]);
 */
declare function appendInexistentScriptButtons(buttons: ScriptButton[]): void;

/** 获取脚本作者注释 */
declare function getScriptInfo(): string;

/**
 * 替换脚本作者注释
 *
 * @param info 新的作者注释
 */
declare function replaceScriptInfo(info: string): void;
