import { RawCharacter } from '@/function/raw_character';
import { isFrontend } from '@/util/is_frontend';
import {
  characters,
  clearChat,
  event_types,
  eventSource,
  getRequestHeaders,
  getThumbnailUrl,
  name2,
  printMessages,
  reloadMarkdownProcessor,
  saveChatConditional,
  this_chid,
  user_avatar,
} from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { getImageSizeFromDataURL } from '@sillytavern/scripts/utils';
import { serialize } from 'object-to-formdata';
import { LiteralUnion } from 'type-fest';

export const version = await fetch('/version')
  .then(res => res.json())
  .then(data => data.pkgVersion)
  .catch(() => '1.0.0');

export const APP_READY_EVENTS = [event_types.APP_READY, 'chatLoaded', event_types.SETTINGS_UPDATED];

export const preset_manager = getPresetManager('openai');

export function getCompletionPresetByName(name: string): any {
  const { presets, preset_names } = preset_manager.getPresetList();

  let preset;
  if (Array.isArray(preset_names)) {
    if (preset_names.includes(name)) {
      preset = presets[preset_names.indexOf(name)];
    }
  } else if ((preset_names as Record<string, number>)[name] !== undefined) {
    preset = presets[(preset_names as Record<string, number>)[name]];
  }

  if (preset === undefined) {
    console.error(`Preset ${name} not found`);
  }
  return preset;
}

export function highlight_code(element: HTMLElement) {
  const $node = $(element);
  if ($node.hasClass('hljs') || isFrontend($node.text())) {
    return;
  }

  hljs.highlightElement(element);
  $node.append(
    $(`<i class="fa-solid fa-copy code-copy interactable" title="Copy code"></i>`)
      .on('click', function (e) {
        e.stopPropagation();
      })
      .on('pointerup', async function () {
        navigator.clipboard.writeText($(element).text());
        toastr.info(t`已复制!`, '', { timeOut: 2000 });
      }),
  );
}

export const saveChatConditionalDebounced = _.debounce(saveChatConditional, 1000);

export async function reloadChatWithoutEvents() {
  if (characters.at(this_chid as unknown as number)) {
    await saveChatConditional();
    await clearChat();
    await printMessages();
  }
}

export function invokeMessageRenders() {
  $('#chat > .mes').each((_index, element) => {
    eventSource.emit(
      $(element).attr('is_user') ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
      $(element).attr('mesid'),
    );
  });
}

export async function reloadAndRenderChatWithoutEvents() {
  await reloadChatWithoutEvents();
  invokeMessageRenders();
}

export function getUserAvatarPath() {
  return `./User Avatars/${user_avatar}`;
}

export function getCharAvatarPath(character_name: LiteralUnion<'current', string> = 'current') {
  const character = RawCharacter.find({ name: character_name });
  const thumbnail_path = getThumbnailUrl('avatar', character?.avatar || character?.name || '');
  const avatar_img = thumbnail_path.substring(thumbnail_path.lastIndexOf('=') + 1);
  return '/characters/' + avatar_img;
}

export async function getImageTokenCost(data_url: string, quality: 'low' | 'auto' | 'high'): Promise<number> {
  const TOKENS_PER_IMAGE = 85;
  if (quality === 'low') {
    return TOKENS_PER_IMAGE;
  }

  const size = await getImageSizeFromDataURL(data_url);

  // If the image is small enough, we can use the low quality token cost
  if (quality === 'auto' && size.width <= 512 && size.height <= 512) {
    return TOKENS_PER_IMAGE;
  }

  /*
   * Images are first scaled to fit within a 2048 x 2048 square, maintaining their aspect ratio.
   * Then, they are scaled such that the shortest side of the image is 768px long.
   * Finally, we count how many 512px squares the image consists of.
   * Each of those squares costs 170 tokens. Another 85 tokens are always added to the final total.
   * https://platform.openai.com/docs/guides/vision/calculating-costs
   */
  const scale = 2048 / Math.min(size.width, size.height);
  const scaledWidth = Math.round(size.width * scale);
  const scaledHeight = Math.round(size.height * scale);

  const finalScale = 768 / Math.min(scaledWidth, scaledHeight);
  const finalWidth = Math.round(scaledWidth * finalScale);
  const finalHeight = Math.round(scaledHeight * finalScale);

  const squares = Math.ceil(finalWidth / 512) * Math.ceil(finalHeight / 512);
  const tokens = squares * 170 + 85;
  return tokens;
}

export async function getVideoTokenCost(_data_url: string): Promise<number> {
  // Convservative estimate for video token cost without knowing duration
  // Using Gemini calculation (263 tokens per second)
  return 1000; // // ~40 second video (60 seconds max)
}

export function renderMarkdown(markdown: string) {
  return reloadMarkdownProcessor().makeHtml(markdown);
}

export function getFirstMessage() {
  const first_messag = characters[Number(this_chid)]?.first_mes || '';
  const alternate_greetings = characters[Number(this_chid)]?.data?.alternate_greetings;

  const message = {
    name: name2,
    is_user: false,
    is_system: false,
    send_date: new Date().toISOString(),
    mes: getRegexedString(first_messag, regex_placement.AI_OUTPUT),
    extra: {},
  };

  if (Array.isArray(alternate_greetings) && alternate_greetings.length > 0) {
    const swipes = [
      message.mes,
      ...alternate_greetings.map(greeting => getRegexedString(greeting, regex_placement.AI_OUTPUT)),
    ];

    if (!message.mes) {
      swipes.shift();
      message.mes = swipes[0];
    }

    _.set(message, 'swipe_id', 0);
    _.set(message, 'swipes', swipes);
    _.set(
      message,
      'swipe_info',
      swipes.map(_ => ({
        send_date: message.send_date,
        gen_started: void 0,
        gen_finished: void 0,
        extra: {},
      })),
    );
  }

  return message;
}

// 酒馆自带的 writeExtensionField 会合并旧值和新值, 因此自己做一个
export async function writeExtensionField(id: string | undefined, field: string, value: any | undefined) {
  const character = (characters as v1CharData[])[Number(id)];
  if (!character) {
    return;
  }

  if (value === undefined) {
    _.unset(character.data.extensions, field);
  } else {
    _.set(character.data.extensions, field, value);
  }

  if (character.json_data) {
    const json_data = JSON.parse(character.json_data);
    if (value === undefined) {
      _.unset(json_data.data.extensions, field);
    } else {
      _.set(json_data.data.extensions, field, value);
    }
    character.json_data = JSON.stringify(json_data);

    if (Number(id) === Number(this_chid)) {
      $('#character_json_data').val(character.json_data);
    }
  }

  const payload = {
    ch_name: character.name,
    avatar_url: character.name + '.png',
    character_version: character.data.character_version,
    creator: character.data.creator,
    creator_notes: character.data.creator_notes,
    description: character.data.description,
    first_mes: character.data.first_mes,
    alternate_greetings: character.data.alternate_greetings,
    world: character.data.extensions.world,
    extensions: JSON.stringify(character.data.extensions),

    chat: character.chat,
    create_date: character.create_date,
    personality: character.data.personality,
    scenario: character.data.scenario,
    mes_example: character.data.mes_example,
    talkativeness: character.data.extensions?.talkativeness,
    fav: character.data.extensions?.fav,
    tags: character.data.tags,
  };

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');

  const response = await fetch('/api/characters/edit', {
    method: 'POST',
    headers: headers,
    body: serialize(payload),
    cache: 'no-cache',
  });

  if (!response.ok) {
    console.error('Failed to save extension field', await response.text());
  }
}
