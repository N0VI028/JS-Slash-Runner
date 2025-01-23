import { characters, getOneCharacter, getRequestHeaders, saveCharacterDebounced, saveSettings, saveSettingsDebounced, this_chid } from "../../../../../../script.js";
// @ts-ignore
import { selected_group } from "../../../../../group-chats.js";
import { ensureImageFormatSupported, getCharaFilename } from "../../../../../utils.js";
import { createNewWorldInfo, deleteWorldInfo, getWorldInfoSettings, selected_world_info, setWorldInfoButtonClass, world_info, world_names } from "../../../../../world-info.js";
import { findChar } from "../compatibility.js";
import { getLogPrefix, registerIframeHandler } from "./index.js";
async function editCurrentCharacter() {
    $('#rm_info_avatar').html('');
    const form_data = new FormData($('#form_create').get(0));
    const raw_file = form_data.get('avatar');
    if (raw_file instanceof File) {
        const converted_file = await ensureImageFormatSupported(raw_file);
        form_data.set('avatar', converted_file);
    }
    const headers = getRequestHeaders();
    // @ts-ignore
    delete headers['Content-Type'];
    // TODO: 这里的代码可以用来修改第一条消息!
    form_data.delete('alternate_greetings');
    const chid = $('.open_alternate_greetings').data('chid');
    if (chid && Array.isArray(characters[chid]?.data?.alternate_greetings)) {
        for (const value of characters[chid].data.alternate_greetings) {
            form_data.append('alternate_greetings', value);
        }
    }
    const response = await fetch('/api/characters/edit', {
        method: 'POST',
        headers: headers,
        body: form_data,
        cache: 'no-cache',
    });
    if (!response.ok) {
        return false;
    }
    await getOneCharacter(form_data.get('avatar_url'));
    $('#add_avatar_button').replaceWith($('#add_avatar_button').val('').clone(true));
    $('#create_button').attr('value', 'Save');
    return true;
}
function toLorebookSettings(world_info_settings) {
    return {
        selected_global_lorebooks: world_info_settings.world_info.globalSelect,
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
function assignPartialLorebookSettings(settings) {
    const for_eachs = {
        selected_global_lorebooks: (value) => {
            $('#world_info').find('option[value!=""]').remove();
            world_names.forEach((item, i) => $('#world_info').append(`<option value='${i}'${value.includes(item) ? ' selected' : ''}>${item}</option>`));
            selected_world_info.length = 0;
            selected_world_info.push(...value);
            saveSettings();
        },
        scan_depth: (value) => {
            $('#world_info_depth').val(value).trigger('input');
        },
        context_percentage: (value) => {
            $('#world_info_budget').val(value).trigger('input');
        },
        budget_cap: (value) => {
            $('#world_info_budget_cap').val(value).trigger('input');
        },
        min_activations: (value) => {
            $('#world_info_min_activations').val(value).trigger('input');
        },
        max_depth: (value) => {
            $('#world_info_min_activations_depth_max').val(value).trigger('input');
        },
        max_recursion_steps: (value) => {
            $('#world_info_max_recursion_steps').val(value).trigger('input');
        },
        insertion_strategy: (value) => {
            const converted_value = { 'evenly': 0, 'character_first': 1, 'global_first': 2 }[value];
            $(`#world_info_character_strategy option[value='${converted_value}']`).prop('selected', true);
            $('#world_info_character_strategy').val(converted_value).trigger('change');
        },
        include_names: (value) => {
            $('#world_info_include_names').prop('checked', value).trigger('input');
        },
        recursive: (value) => {
            $('#world_info_recursive').prop('checked', value).trigger('input');
        },
        case_sensitive: (value) => {
            $('#world_info_case_sensitive').prop('checked', value).trigger('input');
        },
        match_whole_words: (value) => {
            $('#world_info_match_whole_words').prop('checked', value).trigger('input');
        },
        use_group_scoring: (value) => {
            $('#world_info_use_group_scoring').prop('checked', value).trigger('change');
        },
        overflow_alert: (value) => {
            $('#world_info_overflow_alert').prop('checked', value).trigger('change');
        },
    };
    Object.entries(settings)
        .filter(([_, value]) => value !== undefined)
        .forEach(([field, value]) => {
        // @ts-ignore
        for_eachs[field]?.(value);
    });
}
export function registerIframeLorebookHandler() {
    registerIframeHandler('[Lorebook][getLorebookSettings]', async (event) => {
        const lorebook_settings = toLorebookSettings(getWorldInfoSettings());
        console.info(`${getLogPrefix(event)}获取世界书全局设置: ${JSON.stringify(lorebook_settings)}`);
        return lorebook_settings;
    });
    registerIframeHandler('[Lorebook][setLorebookSettings]', async (event) => {
        const settings = event.data.settings;
        if (settings.selected_global_lorebooks) {
            const inexisting_lorebooks = settings.selected_global_lorebooks.filter(lorebook => !world_names.includes(lorebook));
            if (inexisting_lorebooks.length > 0) {
                throw Error(`${getLogPrefix(event)}尝试修改要全局启用的世界书, 但未找到以下世界书: ${inexisting_lorebooks}`);
            }
        }
        assignPartialLorebookSettings(settings);
        console.info(`${getLogPrefix(event)}修改世界书全局设置: ${JSON.stringify(settings)}`);
    });
    registerIframeHandler('[Lorebook][getCharLorebooks]', async (event) => {
        const option = event.data.option;
        // @ts-ignore
        if (selected_group && !option.name) {
            throw Error(`${getLogPrefix(event)}不要在群组中调用这个功能`);
        }
        const filename = option.name ?? getCharaFilename(this_chid) ?? null;
        // @ts-ignore
        const character = findChar({ name: filename });
        if (!character) {
            throw Error(`${getLogPrefix(event)}未找到名为 '${filename}' 的角色卡`);
        }
        let books = { primary: null, additional: [] };
        if (character.data?.extensions?.world) {
            books.primary = character.data?.extensions?.world;
        }
        // @ts-ignore
        const extraCharLore = world_info.charLore?.find((e) => e.name === filename);
        if (extraCharLore && Array.isArray(extraCharLore.extraBooks)) {
            books.additional = extraCharLore.extraBooks;
        }
        console.info(`${getLogPrefix(event)}获取角色卡绑定的世界书, 选项: ${JSON.stringify(option)}, 获取结果: ${JSON.stringify(books)}`);
        return books;
    });
    registerIframeHandler('[Lorebook][setCurrentCharLorebooks]', async (event) => {
        const lorebooks = event.data.lorebooks;
        // @ts-ignore
        if (selected_group && !option.name) {
            throw Error(`${getLogPrefix(event)}不要在群组中调用这个功能`);
        }
        const filename = getCharaFilename(this_chid);
        if (!filename) {
            throw Error(`${getLogPrefix(event)}未打开任何角色卡`);
        }
        const inexisting_lorebooks = [
            ...((lorebooks.primary && !world_names.includes(lorebooks.primary)) ? [lorebooks.primary] : []),
            ...(lorebooks.additional ? lorebooks.additional.filter(lorebook => !world_names.includes(lorebook)) : []),
        ];
        if (inexisting_lorebooks.length > 0) {
            throw Error(`${getLogPrefix(event)}尝试修改 '${filename}' 绑定的世界书, 但未找到以下世界书: ${inexisting_lorebooks}`);
        }
        if (lorebooks.primary !== undefined) {
            const previous_primary = String($('#character_world').val());
            $('#character_world').val(lorebooks.primary ? lorebooks.primary : '');
            $('.character_world_info_selector').find('option:selected').val(lorebooks.primary ? world_names.indexOf(lorebooks.primary) : '');
            if (previous_primary && !lorebooks.primary) {
                const data = JSON.parse(String($('#character_json_data').val()));
                if (data?.data?.character_book) {
                    data.data.character_book = undefined;
                }
                $('#character_json_data').val(JSON.stringify(data));
            }
            if (!await editCurrentCharacter()) {
                throw Error(`${getLogPrefix(event)}尝试为 '${filename}' 绑定主要世界书, 但在访问酒馆后端时出错`);
            }
            // @ts-ignore
            setWorldInfoButtonClass(undefined, !!lorebooks.primary);
        }
        if (lorebooks.additional !== undefined) {
            ;
            let char_lore = world_info.charLore ?? [];
            const existing_char_index = char_lore.findIndex((entry) => entry.name === filename);
            if (existing_char_index === -1) {
                char_lore.push({ name: filename, extraBooks: lorebooks.additional });
            }
            else if (lorebooks.additional.length === 0) {
                char_lore.splice(existing_char_index, 1);
            }
            else {
                char_lore[existing_char_index].extraBooks = lorebooks.additional;
            }
            Object.assign(world_info, { charLore: char_lore });
        }
        saveCharacterDebounced();
        saveSettingsDebounced();
        console.info(`${getLogPrefix(event)}修改角色卡绑定的世界书, 要修改的部分: ${JSON.stringify(lorebooks)}${lorebooks.primary === undefined ? ', 主要世界书保持不变' : ''}${lorebooks.additional === undefined ? ', 附加世界书保持不变' : ''}`);
    });
    registerIframeHandler('[Lorebook][getLorebooks]', async (event) => {
        console.info(`${getLogPrefix(event)}获取世界书列表: ${JSON.stringify(world_names)}`);
        return world_names;
    });
    registerIframeHandler('[Lorebook][deleteLorebook]', async (event) => {
        const lorebook = event.data.lorebook;
        const success = await deleteWorldInfo(lorebook);
        console.info(`${getLogPrefix(event)}移除世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
        return success;
    });
    registerIframeHandler('[Lorebook][createLorebook]', async (event) => {
        const lorebook = event.data.lorebook;
        const success = await createNewWorldInfo(lorebook, { interactive: false });
        console.info(`${getLogPrefix(event)}新建世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
        return success;
    });
}
//# sourceMappingURL=lorebook.js.map