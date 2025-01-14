"use strict";
// TODO: 没给接口做不到设置世界书全局设置, 服了
// TODO: 是否有获取当前全局世界书的需求?
// TODO: 查询那些条目被激活?
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
 *   - `name?:string`: 要查询的角色卡名称; 默认为当前角色卡
 *   - `type?:'all'|'primary'|'additional'`: 按角色世界书的绑定类型筛选世界书; 默认为 `'all'`
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
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 `null`
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
;
/**
 * 获取世界书中的条目信息. **请务必阅读示例**.
 *
 * @param lorebook 世界书名称
 * @param option 可选选项
 *   - `filter:'none'|LorebookEntry的一个子集`: 按照指定字段值筛选条目, 要求对应字段值包含制定的内容; 默认为不进行筛选.
 *                                       如 `{content: '神乐光'}` 表示内容中必须有 `'神乐光'`, `{type: 'selective'}` 表示仅获取绿灯条目.
 *                                       由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选.
 *   - `fields:'all'|数组,元素是LorebookEntry里的字段`: 指定要获取世界书条目哪些字段, 如 `['uid', 'comment', 'content']` 表示仅获取这三个字段; 默认为获取全部字段.
 *
 * @returns 一个数组, 元素是各条目信息.
 *   - 如果使用了 `fields` 指定获取哪些字段, 则数组元素只具有那些字段.
 *   - 如果使用了 `filter` 筛选条目, 则数组只会包含满足要求的元素.
 *   - 你应该根据你的 `fields` 参数断言返回类型, 如 `await getLoreBookEntries(...) as LorebookEntry_Partial_RequireUid[]`.
 *
 * @example
 * // 获取世界书中所有条目的所有信息
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 *
 * @example
 * // 按内容筛选, content 中必须出现 `'神乐光'`
 * const entries = await getLorebookEntries("eramgt少女歌剧", {filter: {content: '神乐光'}})
 *
 * @example
 * // 仅获取世界书的 uid 和名称.
 * const entries = await getLorebookEntries("eramgt少女歌剧", {fields: ["uid", "comment"]});
 *
 * @example
 * // 如果你在写 TypeScript, 你应该根据给的 `fields` 参数断言返回类型
 * const entries = await getLoreBookEntries("eramgt少女歌剧") as LorebookEntry[];
 * const entries = await getLoreBookEntries("eramgt少女歌剧", {fields: ["uid", "comment"]}) as Pick<LorebookEntry, "uid" | "comment">[];
 *
 * @example
 * // 筛选后仅获取世界书的 uid
 * const entries = await getLorebookEntries("eramgt少女歌剧", {filter: {content: '神乐光'}, fields: ["uid"]})
 */
function getLorebookEntries(lorebook, option = {}) {
  option = {
    filter: option.filter ?? 'none',
    fields: option.fields ?? 'all',
  };
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event) {
      if (event.data?.request === "iframe_get_lorebook_entries_callback" && event.data.uid == uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_get_lorebook_entries",
      uid: uid,
      lorebook: lorebook,
      option: option,
    }, "*");
  });
}
/**
 * 将条目信息修改回对应的世界书中, 如果某个字段不存在, 则该字段采用原来的值.
 *
 * 这只是修改信息, 不能创建新的条目, 因此要求条目必须已经在世界书中.
 *
 * @param lorebook 条目所在的世界书名称
 * @param entries 一个数组, 元素是各条目信息. 其中必须有 "uid", 而其他字段可选.
 *
 * @example
 * const lorebook = "eramgt少女歌剧";
 *
 * // 你可以自己指定 uid 来设置
 * setLorebookEntries(lorebook, [{uid: 0, comment: "新标题"}]);
 *
 * // 也可以用从 `getLorebookEntries` 获取的条目
 * const entries = await getLorebookEntries(lorebook) as LorebookEntry[];
 * entries[0].sticky = 5;
 * entries[1].enabled = false;
 * setLorebookEntries(lorebook, [entries[0], entries[1]]);
 *
 * @example
 * const lorebook = "eramgt少女歌剧";
 *
 * // 禁止所有条目递归, 保持其他设置不变
 * const entries = await getLorebookEntries(lorebook) as LorebookEntry[];
 * // `...entry` 表示展开 `entry` 中的内容; 而 `prevent_recursion: true` 放在后面会覆盖或设置 `prevent_recursion` 字段
 * setLorebookEntries(lorebook, entries.map((entry) => ({ ...entry, prevent_recursion: true })));
 *
 * // 也就是说, 其实我们获取 `uid` 字段就够了
 * const entries = await getLorebookEntries(lorebook, {fields: ["uid"]}) as LorebookEntry_Partial_RequireUid[];
 * setLorebookEntries(lorebook, entries.map((entry) => ({ ...entry, prevent_recursion: true })));
 *
 * // 当然你也可以做一些更复杂的事, 比如不再是禁用, 而是反转开关
 * const entries = await getLorebookEntries(lorebook) as LorebookEntry[];
 * setLorebookEntries(lorebook, entries.map((entry) => ({ ...entry, prevent_recursion: !entry.prevent_recursion })));
 */
function setLorebookEntries(lorebook, entries) {
  window.parent.postMessage({
    request: "iframe_set_lorebook_entries",
    lorebook: lorebook,
    entries: entries,
  }, "*");
}
/**
 * 向世界书中新增一个条目
 *
 * @param lorebook 世界书名称
 * @param field_values 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值. **不能设置 `uid`**.
 *
 * @returns 新条目的 uid
 *
 * @example
 * const uid = await createLorebookEntry("eramgt少女歌剧", {comment: "revue", content: "歌唱吧跳舞吧相互争夺吧"});
 */
function createLorebookEntry(lorebook, field_values) {
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event) {
      if (event.data?.request === "iframe_create_lorebook_entry_callback" && event.data.uid == uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_create_lorebook_entry",
      uid: uid,
      lorebook: lorebook,
      field_values: field_values,
    }, "*");
  });
}
/**
 * 删除世界书中的某个条目
 *
 * @param lorebook 世界书名称
 * @param uid 要删除的条目 uid
 *
 * @returns 是否成功删除, 可能因世界书不存在、对应条目不存在等原因失败
 */
function deleteLorebookEntry(lorebook, uid) {
  return new Promise((resolve, _) => {
    const request_uid = Date.now() + Math.random();
    function handleMessage(event) {
      if (event.data?.request === "iframe_delete_lorebook_entry_callback" && event.data.uid == request_uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_delete_lorebook_entry",
      uid: request_uid,
      lorebook: lorebook,
      lorebook_uid: uid,
    }, "*");
  });
}
//# sourceMappingURL=lorebook.js.map
