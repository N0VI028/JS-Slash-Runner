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
async function getVariables(): Promise<Object> {
  return await new Promise((resolve, _) => {
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
 * 用 `new_or_updated_variables` 更新消息楼层 `message_id` 对应的聊天变量, 相当于你在那个楼层更新了它.
 *   这样的更新与 `message_id` 对应, 如果比 `message_id` 更低的楼层也更新了它, 则通过 `getVariables()` 获取到的会是更低楼层更新的值.
 *   这意味着如果始终使用这个函数设置变量, 则在删除楼层、重 roll 等操作时, 变量会变为这些操作后应该对应的变量值.
 *
 * @param message_id 要绑定到的消息楼层 id
 * @param new_or_updated_variables 要更新的变量
 * @enum
 * - 如果该变量已经存在, 则更新值
 * - 如果不存在, 则新增变量
 *
 * @example
 * setVariables(0, {value: 5, data: 7});
 * setVariables(3, {value: 10});
 *
 * // 如果第 3 楼层还在, 我们将会得到 `{value: 10, data: 7}`
 * const variable = await getVariables();
 *
 * // 如果删去了/重刷了第 3 楼层, 我们将会得到 `{value: 5, data: 7}`
 * const variable = await getVariables();
 */
function setVariables(message_id: number, new_or_updated_variables: Object): void;

/**
 * 用 `new_or_updated_variables` 更新当前楼层对应的聊天变量.
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
