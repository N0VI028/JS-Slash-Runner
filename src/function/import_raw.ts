import { render_tavern_regexes_debounced } from '@/function/tavern_regex';
import { useCharacterSettingsStore } from '@/store/settings';
import { updateWorldInfoList } from '@/util/compatibility';
import { characters, getOneCharacter, getRequestHeaders, name1, this_chid } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { convertCharacterBook, saveWorldInfo, world_names } from '@sillytavern/scripts/world-info';

export async function importRawCharacter(name: string, content: Blob): Promise<Response> {
  name = name.replace(/\.(?:png|json)$/, '');
  const avatar = name + '.png';

  const old_worldbook_name = (characters as any[]).find(character => character.avatar === avatar)?.data?.character_book
    ?.name;

  const file = new File([content], name, { type: 'image/png' });

  const form_data = new FormData();
  form_data.append('avatar', file);
  form_data.append('file_type', 'png');
  form_data.append('preserved_name', file.name);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch('/api/characters/import', {
    method: 'POST',
    headers: headers,
    body: form_data,
    cache: 'no-cache',
  }).then(async result => {
    $('#character_search_bar').val('').trigger('input');

    if (old_worldbook_name) {
      await getOneCharacter(avatar);

      const worldbook = (characters as any[]).find(character => character.avatar === avatar)?.data?.character_book;
      if (world_names.includes(old_worldbook_name) && worldbook) {
        await saveWorldInfo(worldbook.name, convertCharacterBook(worldbook), true);
      }
      const store = useCharacterSettingsStore();
      if (store.name === name) {
        store.forceReload();
      }
    }
    return result;
  });
}

export async function importRawChat(name: string, content: string): Promise<Response> {
  if (this_chid === undefined) {
    throw Error('导入聊天文件失败, 请先选择一张角色卡');
  }

  const form_data = new FormData();
  form_data.append('avatar', new File([content], name + '.jsonl', { type: 'application/json' }));
  form_data.append('file_type', 'jsonl');
  form_data.append('avatar_url', characters[this_chid as unknown as number].avatar);
  form_data.append('character_name', characters[this_chid as unknown as number].name);
  form_data.append('user_name', name1);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch(`/api/chats/import`, {
    method: 'POST',
    headers: headers,
    body: form_data,
    cache: 'no-cache',
  });
}

export async function importRawPreset(name: string, content: string): Promise<boolean> {
  try {
    await getPresetManager('openai').savePreset(name, JSON.parse(content));
    return true;
  } catch (error) {
    return false;
  }
}

export async function importRawWorldbook(name: string, content: string): Promise<Response> {
  const file = new File([content], name, { type: 'application/json' });

  const form_data = new FormData();
  form_data.append('avatar', file);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch(`/api/worldinfo/import`, {
    method: 'POST',
    headers: headers,
    body: form_data,
    cache: 'no-cache',
  }).then(result => {
    updateWorldInfoList();
    return result;
  });
}

export function importRawTavernRegex(name: string, content: string): boolean {
  const json = JSON.parse(content);
  if (!_.has(json, 'findRegex')) {
    return false;
  }

  _.set(json, 'id', uuidv4());
  _.set(json, 'scriptName', name);

  extension_settings.regex.push(json);
  render_tavern_regexes_debounced();
  return true;
}
