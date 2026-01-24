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
  getRequestHeaders,
  getThumbnailUrl,
  printMessages,
  saveChatConditional,
  this_chid,
  unshallowCharacter,
} from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { favsToHotswap } from '@sillytavern/scripts/RossAscends-mods';
import { delay } from '@sillytavern/scripts/utils';
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

function toCharacter(character: v1CharData): Character {
  const data = character.data;

  const first_messages = [character.first_mes ?? data.first_mes, ...data.alternate_greetings];

  let extensions = _(klona(data.extensions as Record<string, any>));
  if (extensions.has('regex_scripts')) {
    extensions = extensions.update('regex_scripts', regex_scripts => regex_scripts.map(to_tavern_regex));
  }
  extensions = extensions.omit([
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
    avatar: `${character.name ?? data.name}.png`,
    version: data.character_version ?? '',
    creator: data.creator ?? '',
    creator_notes: character.creatorcomment ?? data.creator_notes ?? '',
    description: character.description ?? data.description ?? '',
    first_messages: first_messages,
    worldbook: getCharWorldbookNames(character.name).primary,
    // @ts-expect-error 类型是正确的, extensions 里必然有 regex_scripts 和 tavern_helper
    extensions: extensions.value(),
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
  character_name: string,
  new_data: PartialDeep<Character>,
  old_data?: v1CharData,
): Payload {
  let world = old_data?.data?.extensions?.world;
  if (new_data.worldbook !== undefined) {
    world = new_data.worldbook || undefined;
  }

  let extensions = _({ ...old_data?.data?.extensions, ...new_data.extensions });
  if (new_data.extensions?.regex_scripts !== undefined) {
    extensions = extensions.set('regex_scripts', new_data.extensions.regex_scripts.map(from_tavern_regex));
  }

  return {
    ch_name: character_name,
    avatar_url: character_name + '.png',
    avatar: new_data.avatar instanceof Blob ? new File([new_data.avatar], character_name + '.png') : undefined,
    character_version: new_data.version ?? old_data?.data.character_version,
    creator: new_data.creator ?? old_data?.data.creator,
    creator_notes: new_data.creator_notes ?? old_data?.data.creator_notes,
    description: new_data.description ?? old_data?.data.description,
    first_mes: (new_data.first_messages?.[0] ?? old_data?.data.first_mes) || '',
    alternate_greetings: (new_data.first_messages?.slice(1) ?? old_data?.data.alternate_greetings) || [],
    world,
    extensions: JSON.stringify(extensions.value()),

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
  character_name: Exclude<string, 'current'>,
  character: PartialDeep<Character> = {},
): Promise<boolean> {
  if (character_name === 'current' || RawCharacter.findIndex(character_name) !== -1) {
    return false;
  }

  const payload = fromCharacterToPayload(character_name, character);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

  const response = await fetch('/api/characters/create', {
    method: 'POST',
    headers: headers,
    body: serialize(payload),
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`创建角色卡 '${character_name}' 失败: (${response.status}) ${await response.text()}`);
  }

  await getCharacters();

  return true;
}

export async function createOrReplaceCharacter(
  character_name: Exclude<string, 'current'>,
  character: PartialDeep<Character> = {},
  options: ReplaceCharacterOptions = {},
): Promise<boolean> {
  const index = RawCharacter.findIndex(character_name);
  if (index !== -1) {
    await replaceCharacter(character_name, character, options);
    return false;
  } else {
    await createCharacter(character_name, character);
    return true;
  }
}

export async function deleteCharacter(
  character_name: LiteralUnion<'current', string>,
  option: { delete_chats?: boolean } = {},
): Promise<boolean> {
  const character = RawCharacter.find({ name: character_name });
  if (!character) {
    return false;
  }
  await deleteCharacterInternal(character.avatar, { deleteChats: option.delete_chats ?? true });
  return true;
}

export async function getCharacter(name: LiteralUnion<'current', string>): Promise<Character | null> {
  const index = RawCharacter.findIndex(name);
  if (index === -1) {
    return null;
  }

  await unshallowCharacter(String(index));
  return klona(toCharacter(characters[index]));
}

type ReplaceCharacterOptions = {
  render?: 'debounced' | 'immediate' | 'none';
};

async function renderCharacter(character_name: string, character: PartialDeep<Character>, is_current: boolean) {
  if (character.avatar instanceof Blob) {
    const avatar_url = getThumbnailUrl('avatar', character_name + '.png');
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

  await getCharacters();
}
const renderCharacterDebounced = _.debounce(renderCharacter, 1000);

export async function replaceCharacter(
  character_name: Exclude<string, 'current'>,
  character: PartialDeep<Character>,
  { render = 'debounced' }: ReplaceCharacterOptions = {},
): Promise<void> {
  const index = RawCharacter.findIndex(character_name);
  if (index === -1) {
    throw Error(`角色卡 '${character_name}' 不存在`);
  }

  const target = characters[index];
  const payload = fromCharacterToPayload(character_name, character, target);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

  const response = await fetch('/api/characters/edit', {
    method: 'POST',
    headers: headers,
    body: serialize(payload),
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`修改角色卡 '${character_name}' 失败: (${response.status}) ${await response.text()}`);
  }

  const is_current = this_chid === undefined || index !== Number(this_chid);

  if (is_current && character.extensions?.tavern_helper !== undefined) {
    useCharacterSettingsStore().forceReload();
  }

  switch (render) {
    case 'debounced':
      renderCharacterDebounced(character_name, character, is_current);
      break;
    case 'immediate':
      await renderCharacter(character_name, character, is_current);
      break;
    case 'none':
      break;
  }
}

type CharacterUpdater = ((character: Character) => Character) | ((character: Character) => Promise<Character>);

export async function updateCharacterWith(
  character_name: LiteralUnion<'current', string>,
  updater: CharacterUpdater,
): Promise<Character> {
  const character = await updater(await getCharacter(character_name)!);
  await replaceCharacter(character_name, character);
  return character;
}
