import { getCharAvatarPath, getUserAvatarPath } from '@/util/tavern';
import { MacrosParser } from '@sillytavern/scripts/macros';

const macros = {
  userAvatarPath: getUserAvatarPath,
  charAvatarPath: getCharAvatarPath,
};

export function registerMacros() {
  for (const [key, value] of Object.entries(macros)) {
    MacrosParser.registerMacro(key, value);
  }
}
