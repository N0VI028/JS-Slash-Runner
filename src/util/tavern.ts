import {
  characters,
  clearChat,
  event_types,
  eventSource,
  getThumbnailUrl,
  printMessages,
  saveChatConditional,
  this_chid,
  user_avatar,
} from '@sillytavern/script';
import { getPresetManager } from '@sillytavern/scripts/preset-manager';

export const version = await fetch('/version')
  .then(res => res.json())
  .then(data => data.pkgVersion)
  .catch(() => '1.0.0');

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
  $('div .mes').each((_index, element) => {
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
