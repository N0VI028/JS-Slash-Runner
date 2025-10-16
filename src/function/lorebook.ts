import { RawCharacter } from '@/function/raw_character';
import {
  characters,
  chat_metadata,
  getCurrentChatId,
  getOneCharacter,
  getRequestHeaders,
  saveCharacterDebounced,
  saveMetadata,
  saveSettings,
  saveSettingsDebounced,
  this_chid,
} from '@sillytavern/script';
import { ensureImageFormatSupported, getCharaFilename } from '@sillytavern/scripts/utils';
import {
  createNewWorldInfo,
  deleteWorldInfo,
  getWorldInfoSettings,
  METADATA_KEY,
  selected_world_info,
  setWorldInfoButtonClass,
  world_info,
  world_names,
} from '@sillytavern/scripts/world-info';

type LorebookSettings = {
  selected_global_lorebooks: string[];

  scan_depth: number;
  context_percentage: number;
  budget_cap: number; // 0 表示禁用
  min_activations: number;
  max_depth: number; // 0 表示无限制
  max_recursion_steps: number;

  insertion_strategy: 'evenly' | 'character_first' | 'global_first';

  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;
};

async function editCurrentCharacter(): Promise<boolean> {
  $('#rm_info_avatar').html('');
  const form_data = new FormData(($('#form_create') as JQuery<HTMLFormElement>).get(0));

  const raw_file = form_data.get('avatar');
  if (raw_file instanceof File) {
    const converted_file = await ensureImageFormatSupported(raw_file);
    form_data.set('avatar', converted_file);
  }

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

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

function toLorebookSettings(world_info_settings: ReturnType<typeof getWorldInfoSettings>): LorebookSettings {
  return {
    selected_global_lorebooks: (world_info_settings.world_info as { globalSelect: string[] }).globalSelect,

    scan_depth: world_info_settings.world_info_depth,
    context_percentage: world_info_settings.world_info_budget,
    budget_cap: world_info_settings.world_info_budget_cap,
    min_activations: world_info_settings.world_info_min_activations,
    max_depth: world_info_settings.world_info_min_activations_depth_max,
    max_recursion_steps: world_info_settings.world_info_max_recursion_steps,

    insertion_strategy: { 0: 'evenly', 1: 'character_first', 2: 'global_first' }[
      world_info_settings.world_info_character_strategy
    ] as 'evenly' | 'character_first' | 'global_first',

    include_names: world_info_settings.world_info_include_names,
    recursive: world_info_settings.world_info_recursive,
    case_sensitive: world_info_settings.world_info_case_sensitive,
    match_whole_words: world_info_settings.world_info_match_whole_words,
    use_group_scoring: world_info_settings.world_info_use_group_scoring,
    overflow_alert: world_info_settings.world_info_overflow_alert,
  };
}

function assignPartialLorebookSettings(settings: Partial<LorebookSettings>): void {
  let $inputs = $();
  let $changes = $();
  const for_eachs = {
    selected_global_lorebooks: (value: LorebookSettings['selected_global_lorebooks']) => {
      $('#world_info').find('option[value!=""]').remove();
      world_names.forEach((item, i) =>
        $('#world_info').append(`<option value='${i}'${value.includes(item) ? ' selected' : ''}>${item}</option>`),
      );

      selected_world_info.length = 0;
      selected_world_info.push(...value);
      saveSettings();
    },

    scan_depth: (value: LorebookSettings['scan_depth']) => {
      $inputs = $inputs.add($('#world_info_depth').val(value));
    },
    context_percentage: (value: LorebookSettings['context_percentage']) => {
      $inputs = $inputs.add($('#world_info_budget').val(value));
    },
    budget_cap: (value: LorebookSettings['budget_cap']) => {
      $inputs = $inputs.add($('#world_info_budget_cap').val(value));
    },
    min_activations: (value: LorebookSettings['min_activations']) => {
      $inputs = $inputs.add($('#world_info_min_activations').val(value));
    },
    max_depth: (value: LorebookSettings['max_depth']) => {
      $inputs = $inputs.add($('#world_info_min_activations_depth_max').val(value));
    },
    max_recursion_steps: (value: LorebookSettings['max_recursion_steps']) => {
      $inputs = $inputs.add($('#world_info_max_recursion_steps').val(value));
    },

    insertion_strategy: (value: LorebookSettings['insertion_strategy']) => {
      const converted_value = { evenly: 0, character_first: 1, global_first: 2 }[value];
      $(`#world_info_character_strategy option[value='${converted_value}']`).prop('selected', true);
      $changes = $changes.add($('#world_info_character_strategy').val(converted_value));
    },

    include_names: (value: LorebookSettings['include_names']) => {
      $inputs = $inputs.add($('#world_info_include_names').prop('checked', value));
    },
    recursive: (value: LorebookSettings['recursive']) => {
      $inputs = $inputs.add($('#world_info_recursive').prop('checked', value));
    },
    case_sensitive: (value: LorebookSettings['case_sensitive']) => {
      $inputs = $inputs.add($('#world_info_case_sensitive').prop('checked', value));
    },
    match_whole_words: (value: LorebookSettings['match_whole_words']) => {
      $inputs = $inputs.add($('#world_info_match_whole_words').prop('checked', value));
    },
    use_group_scoring: (value: LorebookSettings['use_group_scoring']) => {
      $changes = $changes.add($('#world_info_use_group_scoring').prop('checked', value));
    },
    overflow_alert: (value: LorebookSettings['overflow_alert']) => {
      $changes = $changes.add($('#world_info_overflow_alert').prop('checked', value));
    },
  } as const;

  Object.entries(settings)
    .filter(([_, value]) => value !== undefined)
    .forEach(([field, value]) => {
      // @ts-expect-error 未知类型报错
      for_eachs[field]?.(value);
    });
  $inputs.trigger('input');
  $changes.trigger('change');
}

type GetCharLorebooksOption = {
  name?: string;
  type?: 'all' | 'primary' | 'additional';
};

export function getLorebookSettings(): LorebookSettings {
  return klona(toLorebookSettings(getWorldInfoSettings()));
}

export function setLorebookSettings(settings: Partial<LorebookSettings>): void {
  if (settings.selected_global_lorebooks) {
    const inexisting_lorebooks = settings.selected_global_lorebooks.filter(lorebook => !world_names.includes(lorebook));
    if (inexisting_lorebooks.length > 0) {
      throw Error(`尝试修改要全局启用的世界书, 但未找到以下世界书: ${JSON.stringify(inexisting_lorebooks)}`);
    }
  }

  const original_settings = getLorebookSettings();
  settings = _.omitBy(settings, (value, key) => value === original_settings[key as keyof LorebookSettings]);
  assignPartialLorebookSettings(settings);
}

export function getLorebooks(): string[] {
  return klona(world_names);
}

export async function deleteLorebook(lorebook: string): Promise<boolean> {
  return deleteWorldInfo(lorebook);
}

export async function createLorebook(lorebook: string): Promise<boolean> {
  return createNewWorldInfo(lorebook, { interactive: false });
}

type CharLorebooks = {
  primary: string | null;
  additional: string[];
};

export function getCharLorebooks({
  name = (characters as any)[this_chid as string]?.avatar ?? null,
}: GetCharLorebooksOption = {}): CharLorebooks {
  const character = RawCharacter.find({ name: name ?? 'current' });
  if (!character) {
    throw Error(`未找到${name === 'current' ? '当前打开' : `名为 '${name}' `}的角色卡`);
  }

  const books: CharLorebooks = { primary: null, additional: [] };

  if (character.data?.extensions?.world) {
    books.primary = character.data?.extensions?.world;
  }

  // TODO: 提取成函数
  const filename = character.avatar.replace(/\.[^/.]+$/, '');
  const extra_charlore = (world_info as { charLore: { name: string; extraBooks: string[] }[] }).charLore?.find(
    e => e.name === filename,
  );
  if (extra_charlore && Array.isArray(extra_charlore.extraBooks)) {
    books.additional = extra_charlore.extraBooks;
  }

  return klona(books);
}

export function getCurrentCharPrimaryLorebook(): string | null {
  return getCharLorebooks().primary;
}

export async function setCurrentCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void> {
  const filename = getCharaFilename(this_chid);
  if (!filename) {
    throw Error(`未打开任何角色卡`);
  }

  const inexisting_lorebooks = _(_.concat(lorebooks.primary ? [lorebooks.primary] : [], lorebooks.additional))
    .reject(_.isNull)
    .reject(lorebook_name => getLorebooks().some(value => value === lorebook_name))
    .value();
  if (inexisting_lorebooks.length > 0) {
    throw Error(`尝试修改 '${filename}' 绑定的世界书, 但未找到以下世界书: ${inexisting_lorebooks}`);
  }

  if (lorebooks.primary !== undefined) {
    const previous_primary = String($('#character_world').val());
    $('#character_world').val(lorebooks.primary ? lorebooks.primary : '');

    $('.character_world_info_selector')
      .find('option:selected')
      .val(lorebooks.primary ? world_names.indexOf(lorebooks.primary) : '');

    if (previous_primary && !lorebooks.primary) {
      const data = JSON.parse(String($('#character_json_data').val()));
      if (data?.data?.character_book) {
        data.data.character_book = undefined;
      }
      $('#character_json_data').val(JSON.stringify(data));
    }

    if (!(await editCurrentCharacter())) {
      throw Error(`尝试为 '${filename}' 绑定主要世界书, 但在访问酒馆后端时出错`);
    }

    // @ts-expect-error 类型是正确的
    setWorldInfoButtonClass(undefined, !!lorebooks.primary);
  }

  if (lorebooks.additional !== undefined) {
    type CharLoreEntry = {
      name: string;
      extraBooks: string[];
    };
    const char_lore = (world_info as { charLore: CharLoreEntry[] }).charLore ?? [];

    const existing_char_index = char_lore.findIndex(entry => entry.name === filename);
    if (existing_char_index === -1) {
      char_lore.push({ name: filename, extraBooks: lorebooks.additional });
    } else if (lorebooks.additional.length === 0) {
      char_lore.splice(existing_char_index, 1);
    } else {
      char_lore[existing_char_index].extraBooks = lorebooks.additional;
    }

    Object.assign(world_info, { charLore: char_lore });
  }

  saveCharacterDebounced();
  saveSettingsDebounced();
}

export function getChatLorebook(): string | null {
  const chat_id = getCurrentChatId();
  if (!chat_id) {
    throw Error(`未打开任何聊天, 不可获取聊天世界书`);
  }

  const existing_lorebook = _.get(chat_metadata, METADATA_KEY, '') as string;
  if (world_names.includes(existing_lorebook)) {
    return existing_lorebook;
  }
  _.unset(chat_metadata, METADATA_KEY);
  return null;
}

export async function setChatLorebook(lorebook: string | null): Promise<void> {
  if (lorebook === null) {
    _.unset(chat_metadata, METADATA_KEY);
    $('.chat_lorebook_button').removeClass('world_set');
  } else {
    if (!world_names.includes(lorebook)) {
      throw new Error(`尝试为角色卡绑定聊天世界书, 但该世界书 '${lorebook}' 不存在`);
    }

    _.set(chat_metadata, METADATA_KEY, lorebook);
    $('.chat_lorebook_button').addClass('world_set');
  }
  await saveMetadata();
}

export async function getOrCreateChatLorebook(lorebook?: string): Promise<string> {
  const existing_lorebook = await getChatLorebook();
  if (existing_lorebook !== null) {
    return existing_lorebook;
  }

  const new_lorebook = (() => {
    if (lorebook) {
      if (world_names.includes(lorebook)) {
        throw new Error(`尝试创建聊天世界书, 但该名称 '${lorebook}' 已存在`);
      }
      return lorebook;
    }

    return `Chat Book ${getCurrentChatId()}`
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 64);
  })();
  await createNewWorldInfo(new_lorebook);

  await setChatLorebook(new_lorebook);
  return new_lorebook;
}
