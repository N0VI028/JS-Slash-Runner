import { RawCharacter } from '@/function/raw_character';
import { from_tavern_regex, TavernRegex, to_tavern_regex } from '@/function/tavern_regex';
import { getCharWorldbookNames } from '@/function/worldbook';
import { useCharacterSettingsStore } from '@/store/settings';
import { getFirstMessage } from '@/util/tavern';
import {
  characters,
  chat,
  chat_metadata,
  clearChat,
  deleteCharacter as deleteCharacterInternal,
  event_types,
  eventSource,
  getCharacters,
  getOneCharacter,
  getRequestHeaders,
  getThumbnailUrl,
  name2,
  printCharacters,
  printMessages,
  saveChatConditional,
  selectCharacterById,
  unshallowCharacter,
} from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { favsToHotswap } from '@sillytavern/scripts/RossAscends-mods';
import { delay } from '@sillytavern/scripts/utils';
import isBlob from 'is-blob';
import { serialize } from 'object-to-formdata';
import { LiteralUnion, PartialDeep } from 'type-fest';

type Character = {
  avatar: `${string}.png` | Blob;
  version: string;
  creator: string;
  creator_notes: string;

  worldbook: string | null;
  description: string;
  first_messages: string[];

  extensions: {
    regex_scripts: TavernRegex[];
    tavern_helper: {
      scripts: Record<string, any>[];
      variables: Record<string, any>;
    };
    [other: string]: any;
  };
};

export function getCharacterNames(): string[] {
  return characters.map(character => character.name);
}

export function getCharacterIds(): string[] {
  return characters.map(character => character.avatar);
}

export function getCurrentCharacterName(): string | null {
  return name2 === '' ? null : name2;
}

export function getCurrentCharacterId(): string | null {
  const current_character = RawCharacter.find({ name: 'current' });
  return current_character?.avatar ?? null;
}

function toCharacter(character: v1CharData): Character {
  const data = character.data;

  const first_messages = [character.first_mes ?? data.first_mes, ...data.alternate_greetings];

  let extensions = klona(data.extensions as Record<string, any>);
  if (_.has(extensions, 'regex_scripts')) {
    _.set(extensions, 'regex_scripts', _.get(extensions, 'regex_scripts', []).map(to_tavern_regex));
  }
  if (_.has(extensions, 'tavern_helper')) {
    const tavern_helper = _.get(extensions, 'tavern_helper', {});
    // 依旧处理一下旧的存储格式, 保证格式正确
    _.set(
      extensions,
      'tavern_helper',
      Array.isArray(tavern_helper) ? Object.fromEntries(tavern_helper) : tavern_helper,
    );
  }
  extensions = _.omit(extensions, [
    'TavernHelper_scripts',
    'TavernHelper_characterScriptVariables',
    'fav',
    'talkativeness',
    'world',
    'depth_prompt',
    'pygmalion_id',
    'github_repo',
    'source_url',
    'chub',
    'risuai',
    'sd_character_prompt',
  ]);

  return {
    avatar: (character.avatar as `${string}.png`) ?? `${data.name}.png`,
    version: data.character_version ?? '',
    creator: data.creator ?? '',
    creator_notes: character.creatorcomment ?? data.creator_notes ?? '',
    description: character.description ?? data.description ?? '',
    first_messages: first_messages,
    worldbook: getCharWorldbookNames(character.avatar ?? character.name).primary,
    // @ts-expect-error 类型是正确的, extensions 里必然有 regex_scripts 和 tavern_helper
    extensions: extensions,
  };
}

type Payload = {
  ch_name: string;
  avatar_url: string;
  avatar?: File;
  character_version?: string;
  creator?: string;
  creator_notes?: string;
  extensions?: string;

  description?: string;
  first_mes?: string;
  alternate_greetings?: string[];

  world?: string;

  chat?: string;
  create_date?: string;
  personality?: string;
  scenario?: string;
  mes_example?: string;
  talkativeness?: number;
  fav?: boolean;
  tags?: string[];
};
function fromCharacterToPayload(
  character_name_or_id: string | `${string}.png`,
  new_data: PartialDeep<Character>,
  old_data?: v1CharData,
): Payload {
  let world = old_data?.data?.extensions?.world;
  if (new_data.worldbook !== undefined) {
    world = new_data.worldbook || undefined;
  }

  const extensions = klona({ ...old_data?.data?.extensions, ...new_data.extensions });
  if (new_data.extensions?.regex_scripts !== undefined) {
    _.set(extensions, 'regex_scripts', new_data.extensions.regex_scripts.map(from_tavern_regex));
  }

  const is_id = character_name_or_id.endsWith('.png');
  const display_name = old_data?.name ?? (is_id ? character_name_or_id.replace('.png', '') : character_name_or_id);
  const unique_name = old_data?.avatar ?? (is_id ? character_name_or_id : character_name_or_id + '.png');

  return {
    ch_name: display_name,
    avatar_url: unique_name,
    avatar: isBlob(new_data.avatar) ? new File([new_data.avatar], unique_name) : undefined,
    character_version: new_data.version ?? old_data?.data.character_version,
    creator: new_data.creator ?? old_data?.data.creator,
    creator_notes: new_data.creator_notes ?? old_data?.data.creator_notes,
    description: new_data.description ?? old_data?.data.description,
    first_mes: (new_data.first_messages?.[0] ?? old_data?.data.first_mes) || '',
    alternate_greetings: (new_data.first_messages?.slice(1) ?? old_data?.data.alternate_greetings) || [],
    world,
    extensions: JSON.stringify(extensions),

    chat: old_data?.chat,
    create_date: old_data?.create_date,
    personality: old_data?.data?.personality,
    scenario: old_data?.data?.scenario,
    mes_example: old_data?.data?.mes_example,
    talkativeness: old_data?.data?.extensions?.talkativeness,
    fav: old_data?.data?.extensions?.fav,
    tags: old_data?.data?.tags,
  };
}

export async function createCharacter(
  character_name_or_id: Exclude<string | `${string}.png`, 'current'>,
  character: PartialDeep<Character> = {},
): Promise<boolean> {
  if (character_name_or_id === 'current' || RawCharacter.findIndex(character_name_or_id) !== -1) {
    return false;
  }

  const payload = fromCharacterToPayload(character_name_or_id, character);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

  const response = await fetch('/api/characters/create', {
    method: 'POST',
    headers: headers,
    body: serialize(payload),
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`创建角色卡 '${character_name_or_id}' 失败: (${response.status}) ${await response.text()}`);
  }

  await getCharacters();

  return true;
}

export async function createOrReplaceCharacter(
  character_name_or_id: LiteralUnion<'current', string | `${string}.png`>,
  character: PartialDeep<Character> = {},
  options: ReplaceCharacterOptions = {},
): Promise<boolean> {
  const index = RawCharacter.findIndex(character_name_or_id);
  if (index !== -1) {
    await replaceCharacter(character_name_or_id, character, options);
    return false;
  } else {
    await createCharacter(character_name_or_id, character);
    return true;
  }
}

export async function deleteCharacter(
  character_name_or_id: LiteralUnion<'current', string | `${string}.png`>,
  option: { delete_chats?: boolean } = {},
): Promise<boolean> {
  const character = RawCharacter.find({ name: character_name_or_id });
  if (!character) {
    return false;
  }
  await deleteCharacterInternal(character.avatar, { deleteChats: option.delete_chats ?? true });
  return true;
}

export async function getCharacter(
  character_name_or_id: LiteralUnion<'current', string | `${string}.png`>,
): Promise<Character> {
  const index = RawCharacter.findIndex(character_name_or_id);
  if (index === -1) {
    throw Error(`角色卡 '${character_name_or_id}' 不存在`);
  }

  await unshallowCharacter(String(index));
  return klona(toCharacter(characters[index]));
}

type ReplaceCharacterOptions = {
  render?: 'debounced' | 'immediate' | 'none';
};

export async function render_character(
  character_name: string,
  character_id: `${string}.png`,
  character: PartialDeep<Character>,
  is_current: boolean,
) {
  if (isBlob(character.avatar)) {
    const avatar_url = getThumbnailUrl('avatar', character_id);
    await fetch(avatar_url, {
      method: 'GET',
      cache: 'reload',
    });
    $('#add_avatar_button').replaceWith($('#add_avatar_button').val('').clone(true));

    const $mes_image = $(`.mes[ch_name=${character_name}]`).find('img');
    const $avatar_load_preview = $('#avatar_load_preview');

    const default_avatar = 'img/ai4.png';
    $avatar_load_preview.attr('src', default_avatar);
    $mes_image.attr('src', default_avatar);
    await delay(1);
    $mes_image.attr('src', avatar_url);
    $avatar_load_preview.attr('src', avatar_url);
  }

  favsToHotswap();

  const message = getFirstMessage();
  const should_regenerate_message =
    message.mes &&
    !chat_metadata.tainted &&
    (chat.length === 0 || (chat.length === 1 && !chat[0].is_user && !chat[0].is_system));

  if (is_current && should_regenerate_message) {
    chat.splice(0, chat.length, message);
    const message_id = chat.length - 1;
    await eventSource.emit(event_types.MESSAGE_RECEIVED, message_id, 'first_message');
    await clearChat();
    await printMessages();
    await eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, message_id, 'first_message');
    await saveChatConditional();
  }

  if (is_current) {
    await selectCharacterById(RawCharacter.findIndex(character_id));
  }
  await printCharacters(true);
}
const renderCharacterDebounced = _.debounce(render_character, 1000);

export async function replaceCharacter(
  character_name_or_id: LiteralUnion<'current', string | `${string}.png`>,
  character: PartialDeep<Character>,
  { render = 'debounced' }: ReplaceCharacterOptions = {},
): Promise<void> {
  const index = RawCharacter.findIndex(character_name_or_id);
  if (index === -1) {
    throw Error(`角色卡 '${character_name_or_id}' 不存在`);
  }

  const target = characters[index];
  const payload = fromCharacterToPayload(character_name_or_id, character, target);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

  const response = await fetch('/api/characters/edit', {
    method: 'POST',
    headers: headers,
    body: serialize(payload),
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`修改角色卡 '${character_name_or_id}' 失败: (${response.status}) ${await response.text()}`);
  }

  const store = useCharacterSettingsStore();
  const is_current = target.avatar === store.avatar;

  // TODO: 可以直接更新 `target` 里的内容
  await getOneCharacter(target.avatar);

  if (is_current) {
    if (character.extensions?.tavern_helper !== undefined) {
      store.forceReload();
    }
  }

  switch (render) {
    case 'debounced':
      renderCharacterDebounced(target.name, target.avatar, character, is_current);
      break;
    case 'immediate':
      await render_character(target.name, target.avatar, character, is_current);
      break;
    case 'none':
      break;
  }
}

type CharacterUpdater = ((character: Character) => Character) | ((character: Character) => Promise<Character>);

export async function updateCharacterWith(
  character_name_or_id: LiteralUnion<'current', string | `${string}.png`>,
  updater: CharacterUpdater,
): Promise<Character> {
  const character = await updater(await getCharacter(character_name_or_id)!);
  await replaceCharacter(character_name_or_id, character);
  return character;
}
