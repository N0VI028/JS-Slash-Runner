interface LorebookEntry {
  uid: number;            // uid 是相对于世界书内部的, 不要跨世界书使用
  display_index: number;  // 酒馆中将排序设置为 "自定义" 时的显示顺序

  comment: string;
  enabled: boolean;
  type: 'constant' | 'selective' | 'vectorized'
  position:
  'before_character_definition'   // 角色定义之前
  | 'after_character_definition'  // 角色定义之后
  | 'before_example_messages'     // 示例消息之前
  | 'after_example_messages'      // 示例消息之后
  | 'before_author_note'          // 作者注释之前
  | 'after_author_note'           // 作者注释之后
  | 'at_depth_as_system'          // @D⚙
  | 'at_depth_as_assistant'       // @D👤
  | 'at_depth_as_user';           // @D🤖
  depth: number | null;  // 仅对于 `position === 'at_depth_as_???'` 有意义; 其他情况为 null
  order: number;
  probability: number;

  key: string[];
  logic: 'and_any' | 'and_all' | 'not_all' | 'not_any';
  filter: string[];

  scan_depth: 'same_as_global' | number;
  case_sensitive: 'same_as_global' | boolean;
  match_whole_words: 'same_as_global' | boolean;
  use_group_scoring: 'same_as_global' | boolean;
  automation_id: string | null;

  exclude_recursion: boolean;
  prevent_recursion: boolean;
  delay_until_recursion: boolean | number;  // 启用则是 true, 如果设置了具体的 Recursion Level 则是数字 (具体参考酒馆中勾选这个选项后的变化)

  content: string;

  group: string;
  group_prioritized: boolean;
  group_weight: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
}

type LorebookEntry_Partial = Partial<LorebookEntry>;
type LorebookEntry_Partial_OmitUid = Omit<LorebookEntry_Partial, "uid">;
type LorebookEntry_Partial_RequireUid = Pick<LorebookEntry, "uid"> & LorebookEntry_Partial_OmitUid;

interface GetLorebookEntriesOption {
  filter?: 'none' | Partial<LorebookEntry>;  // 按照指定字段值筛选条目, 如 `{position: 'at_depth_as_system'}` 表示仅获取处于 @D⚙ 的条目; 默认为不进行筛选. 由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选.
  fields?: 'all' | (keyof LorebookEntry)[];  // 指定要获取世界书条目哪些字段, 如 `['uid', 'comment', 'content']` 表示仅获取这三个字段; 默认为获取全部字段.
};

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
function getLorebookEntries(lorebook: string, option: GetLorebookEntriesOption = {}): Promise<LorebookEntry_Partial[]> {
  option = {
    filter: option.filter ?? 'none',
    fields: option.fields ?? 'all',
  } as Required<GetLorebookEntriesOption>;
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
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
function setLorebookEntries(lorebook: string, entries: LorebookEntry_Partial_RequireUid[]): void {
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
function createLorebookEntry(lorebook: string, field_values: LorebookEntry_Partial_OmitUid): Promise<string> {
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
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
function deleteLorebookEntry(lorebook: string, uid: number): Promise<boolean> {
  return new Promise((resolve, _) => {
    const request_uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
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
