export { handleLorebook };
import { characters, this_chid } from "../../../../../../script.js";
// @ts-ignore
import { selected_group } from "../../../../../group-chats.js";
import { getCharaFilename, onlyUnique } from "../../../../../utils.js";
import { createNewWorldInfo, deleteWorldInfo, getWorldInfoSettings, world_info, world_names } from "../../../../../world-info.js";
import { findChar } from "./compatibility.js";
// TODO: don't repeat this in all files
function getIframeName(event) {
    const window = event.source;
    return window.frameElement?.id;
}
function toLorebookSettings(world_info_settings) {
    return {
        scan_depth: world_info_settings.world_info_depth,
        context_percentage: world_info_settings.world_info_budget,
        budget_cap: world_info_settings.world_info_budget_cap,
        min_activations: world_info_settings.world_info_min_activations,
        max_depth: world_info_settings.world_info_min_activations_depth_max,
        max_recursion_steps: world_info_settings.world_info_max_recursion_steps,
        insertion_strategy: ({ 0: 'evenly', 1: 'character_first', 2: 'global_first' }[world_info_settings.world_info_character_strategy]),
        include_names: world_info_settings.world_info_include_names,
        recursive: world_info_settings.world_info_recursive,
        case_sensitive: world_info_settings.world_info_case_sensitive,
        match_whole_words: world_info_settings.world_info_match_whole_words,
        use_group_scoring: world_info_settings.world_info_use_group_scoring,
        overflow_alert: world_info_settings.world_info_overflow_alert,
    };
}
const event_handlers = {
    iframe_get_lorebook_settings: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        const lorebook_settings = toLorebookSettings(getWorldInfoSettings());
        event.source.postMessage({
            request: 'iframe_get_lorebook_settings_callback',
            uid: uid,
            result: lorebook_settings,
        }, { targetOrigin: "*" });
        console.info(`[Lorebook][getLorebookSettings](${iframe_name}) 获取世界书全局设置: ${JSON.stringify(lorebook_settings)}`);
    },
    iframe_get_char_lorebooks: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        const option = event.data.option;
        if (!['all', 'primary', 'additional'].includes(option.type)) {
            throw Error(`[Lorebook][getCharLorebooks](${iframe_name}) 提供的 type 无效, 请提供 'all', 'primary' 或 'additional', 你提供的是: ${option.type}`);
        }
        // @ts-ignore
        if (selected_group && !option.name) {
            throw new Error(`[Lorebook][getCharLorebooks](${iframe_name}) 不要在群组中调用这个功能`);
        }
        option.name = option.name ?? characters[this_chid]?.avatar ?? null;
        // @ts-ignore
        const character = findChar({ name: option.name });
        if (!character) {
            throw new Error(`[Lorebook][getCharLorebooks](${iframe_name}) 未找到名为 '${option.name}' 的角色卡`);
        }
        let books = [];
        if (option.type === 'all' || option.type === 'primary') {
            books.push(character.data?.extensions?.world);
        }
        if (option.type === 'all' || option.type === 'additional') {
            const fileName = getCharaFilename(characters.indexOf(character));
            // @ts-ignore 2339
            const extraCharLore = world_info.charLore?.find((e) => e.name === fileName);
            if (extraCharLore && Array.isArray(extraCharLore.extraBooks)) {
                books.push(...extraCharLore.extraBooks);
            }
        }
        books = books.filter(onlyUnique);
        event.source.postMessage({
            request: 'iframe_get_char_lorebooks_callback',
            uid: uid,
            result: books,
        }, { targetOrigin: "*" });
        console.info(`[Lorebook][getCharLorebooks](${iframe_name}) 获取角色卡绑定的世界书, 选项: ${JSON.stringify(option)}, 获取结果: ${JSON.stringify(books)}`);
    },
    iframe_get_lorebooks: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        event.source.postMessage({
            request: 'iframe_get_lorebooks_callback',
            uid: uid,
            result: world_names,
        }, { targetOrigin: "*" });
        console.info(`[Lorebook][getLorebooks](${iframe_name}) 获取世界书列表: ${JSON.stringify(world_names)}`);
    },
    iframe_delete_lorebook: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        const lorebook = event.data.lorebook;
        const success = await deleteWorldInfo(lorebook);
        event.source.postMessage({
            request: 'iframe_delete_lorebook_callback',
            uid: uid,
            result: success,
        }, { targetOrigin: "*" });
        console.info(`[Lorebook][deleteLorebook](${iframe_name}) 移除世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
    },
    iframe_create_lorebook: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        const lorebook = event.data.lorebook;
        const success = await createNewWorldInfo(lorebook, { interactive: false });
        event.source.postMessage({
            request: 'iframe_create_lorebook_callback',
            uid: uid,
            result: success,
        }, { targetOrigin: "*" });
        console.info(`[Lorebook][createLorebook](${iframe_name}) 新建世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
    },
};
async function handleLorebook(event) {
    if (!event.data)
        return;
    try {
        const handler = event_handlers[event.data.request];
        if (handler) {
            handler(event);
        }
    }
    catch (error) {
        console.error(`${error}`);
        throw error;
    }
}
//# sourceMappingURL=lorebook.js.map