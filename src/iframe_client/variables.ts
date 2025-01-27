interface VariableOption {
  type?: 'chat' | 'global';  // 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
};

/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @returns 变量表
 *
 * @example
 * // 获取所有聊天变量并弹窗输出结果
 * const variables = await getVariables();
 * alert(variables);
 *
 * @example
 * // 获取所有全局变量
 * const variables = await getVariables({type: 'global'});
 * // 前端助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
 * if (_.has(variables, "神乐光.好感度")) {
 *   ...
 * }
 */
async function getVariables(option: VariableOption = {}): Promise<Record<string, any>> {
  option = {
    type: option.type ?? 'chat',
  } as Required<VariableOption>;
  return detail.make_iframe_promise({
    request: "[Variables][getVariables]",
    option: option,
  });

}

/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为前端助手内置了 lodash 库:
 *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @example
 * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * let variables = await getVariables();
 * _.unset(variables, "神乐光.好感度");
 * await replaceVariables(variables);
 */
async function replaceVariables(variables: Record<string, any>, option: VariableOption = {}): Promise<void> {
  option = {
    type: option.type ?? 'chat',
  } as Required<VariableOption>;
  return detail.make_iframe_promise({
    request: "[Variables][replaceVariables]",
    option: option,
    variables: variables,
  });
}

/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
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
async function updateVariablesWith(updater: (variables: Record<string, any>) => Record<string, any>, option: VariableOption = {}): Promise<Record<string, any>> {
  option = {
    type: option.type ?? 'chat',
  } as Required<VariableOption>;
  let variables = await getVariables(option);
  variables = updater(variables);
  await replaceVariables(variables, option);

  console.info(`[Chat Message][updateVariablesWith](${getIframeName()}) 用函数对${option.type === 'chat' ? `聊天` : `全局`}变量表进行更新, 结果: ${JSON.stringify(variables)}, 使用的函数:\n\n ${JSON.stringify(detail.format_function_to_string(updater))}`);
  return variables;
}

/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertOrAssignVariables(variables: Record<string, any>, option: VariableOption = {}): Promise<void> {
  await updateVariablesWith(old_variables => _.merge(old_variables, variables), option);
}

/**
 * 插入新变量, 如果变量已经存在则什么也不做
 *
 * @param variables 要插入的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则什么也不做
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 5}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertVariables(variables: Record<string, any>, option: VariableOption = {}): Promise<void> {
  await updateVariablesWith(old_variables => _.defaultsDeep(old_variables, variables), option);
}

/**
 * 删除变量, 如果变量不存在则什么也不做
 *
 * @param variable_path 要删除的变量路径
 *   - 如果变量不存在, 则什么也不做
 *   - 如果变量已经存在, 则删除该变量
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @returns 是否成功删除变量
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await deleteVariable("爱城华恋.好感度");
 * // 执行后变量: `{爱城华恋: {}}`
 */
async function deleteVariable(variable_path: string, option: VariableOption = {}): Promise<boolean> {
  let result: boolean = false;
  await updateVariablesWith(old_variables => { result = _.unset(old_variables, variable_path); return old_variables; }, option);
  return result;
}

//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们

/**
 * 如果 `message_id` 是最新楼层, 则用 `new_or_updated_variables` 更新聊天变量
 *
 * @param message_id 要判定的 `message_id`
 * @param new_or_updated_variables 用于更新的变量
 *   - 如果该变量已经存在, 则更新值
 *   - 如果不存在, 则新增变量
 *
 * @example
 * const variables = {value: 5, data: 7};
 * setVariables(0, variables);
 *
 * @deprecated 这个函数是在事件监听功能之前制作的, 现在请使用 `insertOrSetVariables` 然后用事件监听或条件判断来控制怎么更新
 * @example
 * // 接收到消息时更新变量
 * eventOn(tavern_events.MESSAGE_RECEIVED, updateVariables);
 *
 * function updateVariables(message_id) {
 *   const variables = ...;
 *   insertOrSetVariables(variables);
 * }
 */
async function setVariables(message_id: number, new_or_updated_variables: Record<string, any>): Promise<void>;

/**
 * 如果当前楼层是最新楼层, 则用 `new_or_updated_variables` 更新聊天变量, **只能在消息楼层 iframe 中使用**.
 *
 * @deprecated 这个函数是在事件监听功能之前制作的, 现在请使用 `insertOrSetVariables` 然后用事件监听或条件判断来控制怎么更新
 */
async function setVariables(new_or_updated_variables: Record<string, any>): Promise<void>;

async function setVariables(message_id: number | Record<string, any>, new_or_updated_variables?: Record<string, any>): Promise<void> {
  let actual_message_id: number;
  let actual_variables: Record<string, any>;
  if (new_or_updated_variables) {
    actual_message_id = message_id as number;
    actual_variables = new_or_updated_variables as Record<string, any>;
  } else {
    actual_message_id = getCurrentMessageId();
    actual_variables = message_id as Record<string, any>;
  }
  if (typeof actual_message_id !== 'number' || typeof actual_variables !== 'object') {
    console.error("[Variables][setVariables] 调用出错, 请检查你的参数类型是否正确");
    return;
  }
  return detail.make_iframe_promise({
    request: "[Variables][setVariables]",
    message_id: actual_message_id,
    variables: actual_variables,
  });
}
