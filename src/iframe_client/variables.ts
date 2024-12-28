/**
 * 获取所有聊天变量
 *
 * @returns 所有聊天变量
 *
 * @example
 * // 获取所有变量并弹窗输出结果
 * const variables = await getVariables();
 * alert(variables);
 */
function getVariables(): Promise<Object> {
  return new Promise((resolve, _) => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.variables) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.variables);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ request: "getVariables" }, "*");
  });
}

/**
 * 如果 `message_id` 是最新楼层, 则用 `new_or_updated_variables` 更新聊天变量
 *
 * @param message_id 要判定的 `message_id`
 * @param new_or_updated_variables 用于更新的变量
 * @enum
 * - 如果该变量已经存在, 则更新值
 * - 如果不存在, 则新增变量
 *
 * @example
 * const variables = {value: 5, data: 7};
 * setVariables(0, variabels);
 *
 * @deprecated 这个函数是在事件监听功能之前制作的, 现在用酒馆监听控制怎么更新会更为直观 (?) 和自由
 * @example
 * // 接收到消息时更新变量
 * eventOn(tavern_events.MESSAGE_RECEIVED, updateVariables);
 * function parseVariablesFromMessage(messages) { ... }
 * function updateVariables(message_id) {
 *   const variables = parseVariablesFromMessage(await getChatMessages(message_id));
 *   triggerSlash(
 *     Object.entries(variables)
 *       .map((key_and_value) => `/setvar key=${key_and_value[0]} "${key_and_value[1]}"`)
 *       .join("||"));
 * }
 */
function setVariables(message_id: number, new_or_updated_variables: Object): void;

/**
 * 如果当前楼层是最新楼层, 则用 `new_or_updated_variables` 更新聊天变量, **只能在消息楼层 iframe 中使用**.
 *
 * @deprecated 你应该使用更直观的 `setVariables(getCurrentMessageId(), new_or_updated_variables)`
 */
function setVariables(new_or_updated_variables: Object): void;

function setVariables(message_id: number | Object, new_or_updated_variables?: Object): void {
  let actual_message_id: number;
  let actual_variables: Object;
  if (new_or_updated_variables) {
    actual_message_id = message_id as number;
    actual_variables = new_or_updated_variables as Object;
  } else {
    actual_message_id = getCurrentMessageId();
    actual_variables = message_id;
  }
  if (typeof actual_message_id === 'number' && typeof actual_variables === 'object') {
    window.parent.postMessage({
      request: "setVariables",
      message_id: actual_message_id,
      variables: actual_variables,
    }, "*");
  } else {
    console.error("[Variables][setVariables] 调用出错, 请检查你的参数类型是否正确");
  }
}
