declare namespace Mvu {
  type MvuData = {
    /** 已被 mvu 初始化 initvar 条目的世界书列表 */
    initialized_lorebooks: string[];

    /** 实际的变量数据 */
    stat_data: Record<string, any>;
  };

  type CommandInfo = SetCommandInfo | InsertCommandInfo | DeleteCommandInfo | AddCommandInfo;
  type SetCommandInfo = {
    type: 'set';
    full_match: string;
    args:
      | [path: string, new_value_literal: string]
      | [path: string, expected_old_value_literal: string, new_value_literal: string];
    reason: string;
  };
  type InsertCommandInfo = {
    type: 'insert';
    full_match: string;
    args:
      | [path: string, value_literal: string] // 在尾部追加值
      | [path: string, index_or_key_literal: string, value_literal: string]; // 在指定索引/键处插入值
    reason: string;
  };
  type DeleteCommandInfo = {
    type: 'delete';
    full_match: string;
    args: [path: string] | [path: string, index_or_key_or_value_literal: string];
    reason: string;
  };
  type AddCommandInfo = {
    type: 'add';
    full_match: string;
    args: [path: string, delta_or_toggle_literal: string];
    reason: string;
  };
}

/**
 * mvu 变量框架脚本提供的额外功能, 必须额外安装 mvu 变量框架脚本, 具体内容见于 https://github.com/MagicalAstrogy/MagVarUpdate/blob/master/src/export_globals.ts
 * **在使用它之前, 你应该先通过 `await waitGlobalInitialized('Mvu')` 来等待 Mvu 初始化完毕**
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.Mvu` 来查看当前 Mvu 变量框架所提供的接口
 */
declare const Mvu: {
  events: {
    /** 新开聊天对变量初始化时触发的事件  */
    VARIABLE_INITIALIZED: 'mag_variable_initiailized';

    /** 某轮变量更新开始时触发的事件 */
    VARIABLE_UPDATE_STARTED: 'mag_variable_update_started';

    /**
     * 某轮变量更新过程中, 对文本成功解析了所有更新命令时触发的事件
     *
     * @example
     * // 修复 gemini 在中文间加入的 '-'', 如将 '角色.络-络' 修复为 '角色.络络'
     * eventOn(Mvu.events.COMMAND_PARSED, commands => {
     *   commands.forEach(command => {
     *     command.args[0] = command.args[0].replace(/-/g, '');
     *   });
     * });
     *
     * @example
     * // 修复繁体字, 如将 '絡絡' 修复为 '络络'
     * eventOn(Mvu.events.COMMAND_PARSED, commands => {
     *   commands.forEach(command => {
     *     command.args[0] = command.args[0].replaceAll('絡絡', '络络');
     *   });
     * });
     *
     * @example
     * // 添加新的更新命令
     * eventOn(Mvu.events.COMMAND_PARSED, commands => {
     *   commands.push({
     *     type: 'set',
     *     full_match: `_.set('络络.好感度', 5)`,
     *     args: ['络络.好感度', 5],
     *     reason: '脚本强行更新',
     *   });
     * });
     */
    COMMAND_PARSED: 'mag_command_parsed';

    /**
     * 某轮变量更新结束时触发的事件
     *
     * @example
     * // 保持好感度不低于 0
     * eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, variables => {
     *   if (_.get(variables, 'stat_data.角色.络络.好感度') < 0) {
     *     _.set(variables, 'stat_data.角色.络络.好感度', 0);
     *   }
     * })
     *
     * @example
     * // 保持好感度增幅不超过 3
     * eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before_update) => {
     *   const old_value = _.get(variables_before_update, 'stat_data.角色.络络.好感度');
     *   const new_value = _.get(variables, 'stat_data.角色.络络.好感度');
     *
     *   // 新的好感度必须在 旧好感度-3 和 旧好感度+3 之间
     *   _.set(variables, 'stat_data.角色.络络.好感度', _.clamp(new_value, old_value - 3, old_value + 3));
     * });
     */
    VARIABLE_UPDATE_ENDED: 'mag_variable_update_ended';

    /** 即将用更新后的变量更新楼层时触发的事件  */
    BEFORE_MESSAGE_UPDATE: 'mag_before_message_update';
  };

  /**
   * 获取变量表, 并将其视为包含 mvu 数据的 MvuData
   *
   * @param  可选选项
   *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
   *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
   *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
   *
   * @returns MvuData 数据表
   *
   * @example
   * // 获取最新消息楼层的 mvu 数据
   * const message_data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   *
   * // 在消息楼层 iframe 内获取该 iframe 所在楼层的 mvu 数据
   * const message_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
   */
  getMvuData: (options: VariableOption) => Mvu.MvuData;

  /**
   * 完全替换变量表为包含 mvu 数据的 `mvu_data` (但如果没用 parseMessages 自行处理变量, 则更建议监听 mvu 事件来修改 mvu 数据!)
   *
   * @param variables 要用于替换的变量表
   * @param option 可选选项
   *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
   *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
   *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
   *
   * @example
   * // 修改络络好感度为 30
   * const mvu_data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * _.set(mvu_data, 'stat_data.角色.络络.好感度', 30);
   * await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: 'latest' });
   */
  replaceMvuData: (mvu_data: Mvu.MvuData, options: VariableOption) => Promise<void>;

  /**
   * 解析包含变量更新命令 (`_.set`) 的消息 `message`, 根据它更新 `old_data` 中的 mvu 变量数据
   *
   * @param message 包含 _.set() 命令的消息字符串
   * @param old_data 当前的 MvuData 数据
   *
   * @returns 如果有变量被更新则返回新的 MvuData, 否则返回 `undefined`
   *
   * @example
   * // 修改络络好感度为 30
   * const old_data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
   * const new_data = await Mvu.parseMessage("_.set('角色.络络.好感度', 30); // 强制修改", old_data);
   * await Mvu.replaceMvuData(new_data, { type: 'message', message_id: 'latest' });
   */
  parseMessage: (message: string, old_data: Mvu.MvuData) => Promise<Mvu.MvuData>;

  /**
   * 重新加载初始变量数据
   *
   * @param mvu_data 要重新加载初始数据的 MvuData 数据表
   *
   * @returns 是否加载成功
   */
  reloadInitVar: (mvu_data: Mvu.MvuData) => Promise<boolean>;
};

interface ListenerType {
  [Mvu.events.VARIABLE_INITIALIZED]: (variables: Mvu.MvuData, swipe_id: number) => void;

  [Mvu.events.BEFORE_MESSAGE_UPDATE]: (context: { variables: Mvu.MvuData; message_content: string }) => void;

  [Mvu.events.VARIABLE_UPDATE_STARTED]: (variables: Mvu.MvuData) => void;

  [Mvu.events.COMMAND_PARSED]: (variables: Mvu.MvuData, commands: Mvu.CommandInfo[], message_content: string) => void;

  [Mvu.events.VARIABLE_UPDATE_ENDED]: (variables: Mvu.MvuData, variables_before_update: Mvu.MvuData) => void;
}
