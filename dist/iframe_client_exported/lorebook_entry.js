export const iframe_client_lorebook_entry = `
;
/**
 * 获取世界书中的条目信息. **请务必阅读示例**.
 *
 * @param lorebook 世界书名称
 * @param option 可选选项
 *   - \`filter:'none'|LorebookEntry的一个子集\`: 按照指定字段值筛选条目, 要求对应字段值包含制定的内容; 默认为不进行筛选.
 *                                       如 \`{content: '神乐光'}\` 表示内容中必须有 \`'神乐光'\`, \`{type: 'selective'}\` 表示仅获取绿灯条目.
 *                                       由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选.
 *
 * @returns 一个数组, 元素是各条目信息.
 *
 * @example
 * // 获取世界书中所有条目的所有信息
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 *
 * @example
 * // 按内容筛选, content 中必须出现 \`'神乐光'\`
 * const entries = await getLorebookEntries("eramgt少女歌剧", {filter: {content: '神乐光'}})
 */
async function getLorebookEntries(lorebook, option = {}) {
    option = {
        filter: option.filter ?? 'none',
    };
    return detail.make_iframe_promise({
        request: "[LorebookEntry][getLorebookEntries]",
        lorebook: lorebook,
        option: option,
    });
}
/**
 * 将条目信息修改回对应的世界书中, 如果某个字段不存在, 则该字段采用原来的值.
 *
 * 这只是修改信息, 不能创建新的条目, 因此要求条目必须已经在世界书中.
 *
 * @param lorebook 条目所在的世界书名称
 * @param entries 一个数组, 元素是各条目信息. 其中必须有 \`uid\`, 而其他字段可选.
 *
 * @example
 * const lorebook = "eramgt少女歌剧";
 *
 * // 你可以自己指定 uid 来设置
 * await setLorebookEntries(lorebook, [{uid: 0, comment: "新标题"}]);
 *
 * // 也可以用从 \`getLorebookEntries\` 获取的条目
 * const entries = await getLorebookEntries(lorebook);
 * entries[0].sticky = 5;
 * entries[1].enabled = false;
 * await setLorebookEntries(lorebook, [entries[0], entries[1]]);
 *
 * @example
 * const lorebook = "eramgt少女歌剧";
 *
 * // 禁止所有条目递归, 保持其他设置不变
 * const entries = await getLorebookEntries(lorebook);
 * // \`...entry\` 表示展开 \`entry\` 中的内容; 而 \`prevent_recursion: true\` 放在后面会覆盖或设置 \`prevent_recursion\` 字段
 * await setLorebookEntries(lorebook, entries.map(entry => ({ ...entry, prevent_recursion: true })));
 *
 * // 实际上我们只需要为条目指出它的 uid, 并设置 \`prevent_recursion: true\`
 * const entries = await getLorebookEntries(lorebook);
 * await setLorebookEntries(lorebook, entries.map(entry => ({ uid: entry.uid, prevent_recursion: true })));
 *
 * // 当然你也可以做一些更复杂的事, 比如不再是禁用, 而是反转开关
 * const entries = await getLorebookEntries(lorebook);
 * await setLorebookEntries(lorebook, entries.map(entry => ({ uid: entry.uid, prevent_recursion: !entry.prevent_recursion })));
 */
async function setLorebookEntries(lorebook, entries) {
    return detail.make_iframe_promise({
        request: "[LorebookEntry][setLorebookEntries]",
        lorebook: lorebook,
        entries: entries,
    });
}
/**
 * 向世界书中新增一个条目
 *
 * @param lorebook 世界书名称
 * @param field_values 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值. **不能设置 \`uid\`**.
 *
 * @returns 新条目的 \`uid\`
 *
 * @example
 * const uid = await createLorebookEntry("eramgt少女歌剧", {comment: "revue", content: "歌唱吧跳舞吧相互争夺吧"});
 */
async function createLorebookEntry(lorebook, field_values) {
    return detail.make_iframe_promise({
        request: "[LorebookEntry][createLorebookEntry]",
        lorebook: lorebook,
        field_values: field_values,
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
async function deleteLorebookEntry(lorebook, uid) {
    return detail.make_iframe_promise({
        request: "[LorebookEntry][deleteLorebookEntry]",
        lorebook: lorebook,
        lorebook_uid: uid,
    });
}
;
`;
//# sourceMappingURL=lorebook_entry.js.map