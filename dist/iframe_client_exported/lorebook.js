export const iframe_client_lorebook = `
// TODO: 没给接口做不到设置世界书全局设置, 服了
// TODO: 是否有获取当前全局世界书的需求?
// TODO: 查询哪些条目被激活?
// TODO: 绑定/解绑世界书?
;
/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 */
function getLorebookSettings() {
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_get_lorebook_settings_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: "iframe_get_lorebook_settings",
            uid: uid,
        }, "*");
    });
}
;
/**
 * 获取角色卡绑定的世界书
 *
 * @param option 可选选项
 *   - \`name?:string\`: 要查询的角色卡名称; 默认为当前角色卡
 *   - \`type?:'all'|'primary'|'additional'\`: 按角色世界书的绑定类型筛选世界书; 默认为 \`'all'\`
 *
 * @returns 一个数组, 元素是各世界书的名称. 主要世界书将会排列在附加世界书的前面.
 */
function getCharLorebooks(option = {}) {
    option = {
        name: option.name,
        type: option.type ?? 'all'
    };
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_get_char_lorebooks_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: "iframe_get_char_lorebooks",
            uid: uid,
            option: option,
        }, "*");
    });
}
/**
 * 获取当前角色卡绑定的主要世界书
 *
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 \`null\`
 */
function getCurrentCharPrimaryLorebook() {
    return getCharLorebooks({ type: 'primary' }).then(lorebooks => lorebooks[0]);
}
/**
 * 获取或创建当前聊天绑定的世界书
 *
 * @returns 聊天世界书的名称
 */
function getOrCreateChatLorebook() {
    return triggerSlashWithResult("/getchatbook");
}
/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
function getLorebooks() {
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_get_lorebooks_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: "iframe_get_lorebooks",
            uid: uid,
        }, "*");
    });
}
/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
function createLorebook(lorebook) {
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_create_lorebook_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: "iframe_create_lorebook",
            uid: uid,
            lorebook: lorebook,
        }, "*");
    });
}
/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
function deleteLorebook(lorebook) {
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_delete_lorebook_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage({
            request: "iframe_delete_lorebook",
            uid: uid,
            lorebook: lorebook,
        }, "*");
    });
}
`;
//# sourceMappingURL=lorebook.js.map