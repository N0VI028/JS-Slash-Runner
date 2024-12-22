"use strict";
function requestVariables() {
    return new Promise((resolve, _) => {
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
    const variables = await requestVariables();
    return variables;
}
/**
 * 用 `newVaraibles` 更新聊天变量
 *
 * - 如果键名一致, 则更新值
 * - 如果不一致, 则新增变量
 *
 * @param newVariables 要更新的变量
 *
 * @example
 * const newVariables = { theme: "dark", userInfo: { name: "Alice", age: 30} };
 * setVariables(newVariables);
 */
function setVariables(newVariables) {
    if (typeof newVariables === "object" && newVariables !== null) {
        // @ts-ignore 18047
        const iframeId = window.frameElement.id;
        window.parent.postMessage({ request: "setVariables", data: newVariables, iframeId: iframeId }, "*");
    }
    else {
        console.error("setVariables expects an object");
    }
}
//# sourceMappingURL=variables.js.map