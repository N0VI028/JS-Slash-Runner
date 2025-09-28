type VariableOption = {
  /**
   * 对某一楼层的聊天变量 (`message`)、聊天变量 (`'chat'`)、角色卡变量 (`'character'`)、聊天变量 (`'script'`) 或全局变量 (`'global'`) 进行操作, 默认为 `'chat'`
   */
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';

  /**
   * 当 `type` 为 `'message'` 时, 该参数指定要获取变量的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
   */
  message_id?: number | 'latest';

  /**
   * 当 `type` 为 `'script'` 时, 该参数指定要获取变量的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
   */
  script_id?: string;
}

/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 变量表
 *
 * @example
 * // 获取所有聊天变量并弹窗输出结果
 * const variables = getVariables({type: 'chat'});
 * alert(variables);
 *
 * @example
 * // 获取所有全局变量
 * const variables = getVariables({type: 'global'});
 * // 酒馆助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
 * if (_.has(variables, "神乐光.好感度")) {
 *   ...
 * }
 *
 * @example
 * // 获取倒数第二楼层的聊天变量
 * const variables = getVariables({type: 'message', message_id: -2});
 *
 * @example
 * // 在脚本内获取该脚本绑定的变量
 * const variables = getVariables({type: 'script', script_id: getScriptId()});
 */
declare function getVariables({ type, message_id, script_id }?: VariableOption): Record<string, any>;

/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为酒馆助手内置了 lodash 库:
 *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @example
 * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * let variables = getVariables();
 * _.unset(variables, "神乐光.好感度");
 * await replaceVariables(variables);
 *
 * @example
 * // 在脚本内替换该脚本绑定的变量
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}}, {type: 'script', script_id: getScriptId()});
 */
declare function replaceVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<void>;

type VariablesUpdater =
  | ((variables: Record<string, any>) => Record<string, any>)
  | ((variables: Record<string, any>) => Promise<Record<string, any>>);

/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * await updateVariablesWith(variables => {_.unset(variables, "神乐光.好感度"); return variables;});
 *
 * @example
 * // 更新 "爱城华恋.好感度" 为原来的 2 倍, 如果该变量不存在则设置为 0
 * await updateVariablesWith(variables => _.update(variables, "爱城华恋.好感度", value => value ? value * 2 : 0));
 */
declare function updateVariablesWith(
  updater: VariablesUpdater,
  { type, message_id, script_id }?: VariableOption,
): Promise<Record<string, any>>;

/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
declare function insertOrAssignVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<Record<string, any>>;

/**
 * 插入新变量, 如果变量已经存在则什么也不做
 *
 * @param variables 要插入的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则什么也不做
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 5}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
declare function insertVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<Record<string, any>>;

/**
 * 删除变量, 如果变量不存在则什么也不做
 *
 * @param variable_path 要删除的变量路径
 *   - 如果变量不存在, 则什么也不做
 *   - 如果变量已经存在, 则删除该变量
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 更新后的变量表, 以及是否成功删除变量
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await deleteVariable("爱城华恋.好感度");
 * // 执行后变量: `{爱城华恋: {}}`
 */
declare function deleteVariable(
  variable_path: string,
  { type, message_id, script_id }?: VariableOption,
): Promise<{ variables: Record<string, any>; delete_occurred: boolean }>;
