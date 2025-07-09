//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们

/** @deprecated 这个函数是在事件监听功能之前制作的, 现在请使用 `insertOrAssignVariables` 而用事件监听或条件判断来控制怎么更新 */
async function setVariables(
  message_id: number | Record<string, any>,
  new_or_updated_variables?: Record<string, any>,
): Promise<void> {
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
    return;
  }
  return detail.make_iframe_promise({
    request: '[Variables][setVariables]',
    message_id: actual_message_id,
    variables: actual_variables,
  });
}
