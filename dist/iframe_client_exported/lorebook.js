export const iframe_client_lorebook = `
// TODO: 没给接口做不到设置世界书全局设置, 服了
// TODO: 查询哪些条目被激活?
// TODO: 绑定/解绑世界书?
;
/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 */
async function getLorebookSettings() {
    return detail.makeIframePromise({
        request: "iframe_get_lorebook_settings",
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
async function getCharLorebooks(option = {}) {
    option = {
        name: option.name,
        type: option.type ?? 'all'
    };
    return detail.makeIframePromise({
        request: "iframe_get_char_lorebooks",
        option: option
    });
}
/**
 * 获取当前角色卡绑定的主要世界书
 *
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 \`null\`
 */
async function getCurrentCharPrimaryLorebook() {
    return getCharLorebooks({ type: 'primary' }).then(lorebooks => lorebooks[0]);
}
/**
 * 获取或创建当前聊天绑定的世界书
 *
 * @returns 聊天世界书的名称
 */
async function getOrCreateChatLorebook() {
    return triggerSlashWithResult("/getchatbook");
}
/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
async function getLorebooks() {
    return detail.makeIframePromise({
        request: "iframe_get_lorebooks",
    });
}
/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
async function createLorebook(lorebook) {
    return detail.makeIframePromise({
        request: "iframe_create_lorebook",
        lorebook: lorebook,
    });
}
/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
async function deleteLorebook(lorebook) {
    return detail.makeIframePromise({
        request: "iframe_delete_lorebook",
        lorebook: lorebook,
    });
    ;
}
`;
//# sourceMappingURL=lorebook.js.map