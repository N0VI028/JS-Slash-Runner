import { characters, getThumbnailUrl, saveSettingsDebounced, this_chid, user_avatar } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { setValueByPath } from '@sillytavern/scripts/utils';

export const extensionName = 'JS-Slash-Runner';
export const extensionSettingName = 'TavernHelper';
//TODO: 修改名称
export const extensionFolderPath = `third-party/${extensionName}`;

// 获取头像原图
export const charsPath = '/characters/';
export const getUserAvatarPath = () => `./User Avatars/${user_avatar}`;
export const getCharAvatarPath = () => {
  //@ts-ignore
  const thumbnailPath = getThumbnailUrl('avatar', characters[this_chid].avatar);
  const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
  return charsPath + targetAvatarImg;
};

/**
 * 获取扩展设置变量的值
 * @returns 设置变量的值
 */
export function getSettingValue(key: string) {
  const keys = key.split('.');
  //@ts-ignore
  let value = extension_settings[extensionSettingName];

  for (const k of keys) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[k];
  }

  return value;
}

/**
 * 保存扩展设置变量的值
 * @param key 设置变量的键
 * @param value 设置变量的值
 */
export async function saveSettingValue(key: string, value: any) {
  //@ts-ignore
  setValueByPath(extension_settings[extensionSettingName], key, value);
  await saveSettingsDebounced();
}
