export const iframe_client_variables = `
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
async function getVariables() {
    return await new Promise((resolve, _) => {
        function handleMessage(event) {
            if (event.data && event.data.variables) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.variables);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({ request: "getVariables" }, "*");
    });
}
function setVariables(message_id, new_or_updated_variables) {
    let actual_message_id;
    let actual_variables;
    if (new_or_updated_variables) {
        actual_message_id = message_id;
        actual_variables = new_or_updated_variables;
    }
    else {
        actual_message_id = getCurrentMessageId();
        actual_variables = message_id;
    }
    if (typeof actual_message_id === 'number' && typeof actual_variables === 'object') {
        // @ts-ignore 18047
        const iframeId = window.frameElement.id;
        window.parent.postMessage({
            request: "setVariables",
            message_id: actual_message_id,
            variables: actual_variables,
        }, "*");
    }
    else {
        console.error("[Variables][setVariables] 调用出错, 请检查你的参数类型是否正确");
    }
}
`