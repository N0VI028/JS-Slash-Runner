declare namespace Mvu {
  type MvuData = {
    /** 已被 mvu 初始化 initvar 条目的世界书列表 */
    initialized_lorebooks: string[];

    /** 实际的变量数据 */
    stat_data: Record<string, any>;

    /**
     * 显示数据: 变量变化的可视化表示, 方便在前端显示变量变化.
     *
     * 存储格式:
     * - 如果变量从来没变化, 则存储值
     * - 如果变量变化过, 则存储最新一次 `'旧值->新值 (原因)`
     */
    display_data: Record<string, any>;

    /**
     * 增量显示数据: 最新一次变量更新中变量变化的可视表示
     *
     * 存储格式:
     * - 如果本次更新中变量没变化, 则没有对应表示
     * - 如果本次更新中变量变化了, 则存储 `'旧值->新值 (原因)`
     */
    delta_data: Record<string, any>;
  };
}

/**
 * mvu 变量框架脚本提供的额外功能, 必须额外安装 mvu 变量框架脚本, 具体内容见于 https://github.com/MagicalAstrogy/MagVarUpdate/blob/master/src/export_globals.ts
 * **要使用它, 你必须保证你的脚本/界面加载在 mvu 脚本之后
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.Mvu` 来查看当前 Mvu 变量框架所提供的接口
 */
declare const Mvu: {
  events: {
    /** 某轮变量更新开始时触发的事件 */
    VARIABLE_UPDATE_STARTED: 'mag_variable_update_started';

    /**
     * 某轮变量更新过程中, 某个变量更新时触发的事件
     *
     * @example
     * // 检测络络好感度突破 30
     * eventOn(Mvu.events.SINGLE_VARIABLE_UPDATED, (stat_data, path, old_value, new_value) => {
     *   // 如果被更新的变量不是 'stat_data.角色.络络.好感度', 则什么都不做直接返回 (return)
     *   if (path === '角色.络络.好感度') {
     *     return;
     *   }
     *
     *   // --被更新的变量是 'stat_data.角色.络络.好感度'---
     *   if (old_value < 30 && new_value >= 30) {
     *     toaster.success('络络好感度突破 30 了!');
     *   }
     * });
     */
    SINGLE_VARIABLE_UPDATED: 'mag_variable_updated';

    /**
     * 某轮变量更新结束时触发的事件
     *
     * @example
     * // 保持好感度不低于 0
     * eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables) => {
     *   if (_.get(variables, 'stat_data.角色.络络.好感度') < 0) {
     *     _.set(variables, 'stat_data.角色.络络.好感度', 0);
     *   }
     * });
     */
    VARIABLE_UPDATE_ENDED: 'mag_variable_update_ended';
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
   * 完全替换变量表为包含 mvu 数据的 `mvu_data` (但更建议监听 mvu 事件来修改 mvu 数据!)
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
  parseMessage: (message: string, old_data: Mvu.MvuData) => Promise<Mvu.MvuData | undefined>;

  /**
   * 重新加载初始变量数据
   *
   * @param mvu_data 要重新加载初始数据的 MvuData 数据表
   *
   * @returns 是否加载成功
   */
  reloadInitVar: (mvu_data: Mvu.MvuData) => Promise<boolean>;

  /**
   * 对 MvuData 数据表设置单个变量的值
   *
   * @param mvu_data 要更新的 MvuData 数据表
   * @param path 变量路径, 支持嵌套路径如 `'player.health'` 或数组索引 `'items[0]'`
   * @param new_value 新值
   * @param option 可选参数
   *   - `reason?:string`: 更新原因, 会显示在 `display_data` 中
   *   - `is_recursive?:boolean`: 是否触发 `Mvu.events.SINGLE_VARIABLE_UPDATED` 事件, 默认为 `false`
   *
   * @returns 更新是否成功
   *
   * @example
   * // 简单更新
   * await Mvu.setMvuVariable(data, '角色.络络.好感度', 30);
   *
   * // 带原因的更新
   * await Mvu.setMvuVariable(data, '角色.络络.好感度', 30, { reason: '强制更新' });
   *
   * // 触发 mvu 事件 `Mvu.events.SINGLE_VARIABLE_UPDATED` 的更新
   * await Mvu.setMvuVariable(data, '角色.络络.好感度', 30, { reason: '强制更新', is_recursive: true });
   */
  setMvuVariable: (
    mvu_data: Mvu.MvuData,
    path: string,
    new_value: any,
    { reason, is_recursive }?: { reason?: string; is_recursive?: boolean },
  ) => Promise<boolean>;

  /**
   * 获取变量的值
   *
   * @param mvu_data MvuData 数据表
   * @param path 变量路径, 支持嵌套路径如 `'player.health'` 或数组索引 `'items[0]'`
   * @param option 可选参数
   *   - `category?:'stat' | 'display' | 'delta'`: 要获取的变量数据类型, 默认为 `'stat'`
   *   - `default_value?:any`: 如果变量不存在, 则返回该默认值
   *
   * @returns 变量值。如果是 ValueWithDescription 类型，返回第一个元素（实际值）
   *
   * @example
   * // 获取 stat_data 中的值
   * const health = Mvu.getMvuVariable(data, 'player.health');
   *
   * // 获取 display_data 中的显示值
   * const healthDisplay = Mvu.getMvuVariable(data, 'player.health', { category: 'display' });
   *
   * // 获取 display_data 中的显示值, 如果没能获取到则默认为 0
   * const score = Mvu.getMvuVariable(data, 'player.score', { default_value: 0 });
   */
  getMvuVariable: (
    mvu_data: Mvu.MvuData,
    path: string,
    { category, default_value }?: { category?: 'stat' | 'display' | 'delta'; default_value?: any },
  ) => any;
};

interface ListenerType {
  [Mvu.events.VARIABLE_UPDATE_STARTED]: (variables: Mvu.MvuData) => void;

  [Mvu.events.SINGLE_VARIABLE_UPDATED]: (
    stat_data: Mvu.MvuData['stat_data'],
    path: string,
    old_value: any,
    new_value: any,
  ) => void;

  [Mvu.events.VARIABLE_UPDATE_ENDED]: (variables: Mvu.MvuData) => void;
}
