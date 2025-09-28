import { characters, getThumbnailUrl, this_chid, user_avatar } from '@sillytavern/script';
import { MacrosParser } from '@sillytavern/scripts/macros';

const macros = {
  userAvatarPath: () => `./User Avatars/${user_avatar}`,
  charAvatarPath: () => {
    const character = characters.at(this_chid as unknown as number);
    const thumbnail_path = getThumbnailUrl('avatar', character?.avatar || character?.name || '');
    const avatar_img = thumbnail_path.substring(thumbnail_path.lastIndexOf('=') + 1);
    return '/characters/' + avatar_img;
  },
};

export function registerMacros() {
  for (const [key, value] of Object.entries(macros)) {
    MacrosParser.registerMacro(key, value);
  }
}
