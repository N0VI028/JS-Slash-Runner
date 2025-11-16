import {
  characters,
  clearChat,
  event_types,
  eventSource,
  getThumbnailUrl,
  printMessages,
  reloadMarkdownProcessor,
  saveChatConditional,
  this_chid,
  user_avatar,
} from '@sillytavern/script';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';
import { getImageSizeFromDataURL } from '@sillytavern/scripts/utils';

export const version = await fetch('/version')
  .then(res => res.json())
  .then(data => data.pkgVersion)
  .catch(() => '1.0.0');

export const APP_READY_EVENTS = [event_types.APP_READY, 'chatLoaded', event_types.SETTINGS_UPDATED];

export const preset_manager = getPresetManager('openai');

export function highlight_code(element: HTMLElement) {
  const $node = $(element);
  if ($node.hasClass('hljs') || $node.text().includes('<body')) {
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

export function getCharAvatarPath() {
  const character = characters.at(this_chid as unknown as number);
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
