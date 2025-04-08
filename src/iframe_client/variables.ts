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

/**
 * 如果当前楼层是最新楼层, 则用 `new_or_updated_variables` 更新聊天变量, **只能在消息楼层 iframe 中使用**.
 *
 * @deprecated 这个函数是在事件监听功能之前制作的, 现在请使用 `insertOrSetVariables` 然后用事件监听或条件判断来控制怎么更新
 */
async function setVariables(
  new_or_updated_variables: Record<string, any>,
  message_id?: number | Record<string, any>
): Promise<void> {
  // 初始化变量
  let actual_message_id: number;
  let actual_variables: Record<string, any>;
  
  // 处理参数
  if (new_or_updated_variables) {
    actual_variables = new_or_updated_variables;
    
    if (!message_id) {
      actual_message_id = getCurrentMessageId();
    } else {
      actual_message_id = message_id as number;
    }
  } else {
    console.error("[Variables][setVariables] 调用出错, 请检查你的参数是否正确");
    return;
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