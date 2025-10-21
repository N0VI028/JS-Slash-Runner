// TODO: 重新设计这里的接口, set 部分直接访问后端
import { characters, getPastCharacterChats, getRequestHeaders, getThumbnailUrl, this_chid } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { LiteralUnion } from 'type-fest';

export class RawCharacter {
  private character_data: v1CharData;

  constructor(character_data: v1CharData) {
    this.character_data = character_data;
  }

  static find({
    name,
    allow_avatar = true,
  }: {
    name: LiteralUnion<'current', string>;
    allow_avatar?: boolean;
  }): v1CharData | null {
    if (!name || name === 'current') {
      if (this_chid === undefined) {
        return null;
      }
      return characters[Number(this_chid)];
    }

    if (allow_avatar) {
      const character_by_avatar = characters.find(char => char.avatar === name);
      if (character_by_avatar) {
        return character_by_avatar;
      }
    }

    const matching_characters = characters.filter(char => char.name === name || (allow_avatar && char.avatar === name));
    if (matching_characters.length > 1) {
      console.warn(`找到多个符合条件的角色, 返回导入时间最早的角色: ${name}`);
    }

    return matching_characters[0] || null;
  }

  static findCharacterIndex(name: string): number {
    const matchTypes = [
      (a: string, b: string) => a === b,
      (a: string, b: string) => a.startsWith(b),
      (a: string, b: string) => a.includes(b),
    ];

    const exactAvatarMatch = characters.findIndex(x => x.avatar === name);

    if (exactAvatarMatch !== -1) {
      return exactAvatarMatch;
    }

    for (const matchType of matchTypes) {
      const index = characters.findIndex(x => matchType(x.name.toLowerCase(), name.toLowerCase()));
      if (index !== -1) {
        return index;
      }
    }

    return -1;
  }

  static async getChatsFromFiles(data: any[], isGroupChat: boolean): Promise<Record<string, any>> {
    const chat_dict: Record<string, any> = {};
    const chat_list = Object.values(data)
      .sort((a, b) => a['file_name'].localeCompare(b['file_name']))
      .reverse();

    const chat_promise = chat_list.map(async ({ file_name }) => {
      // 从文件名中提取角色名称（破折号前的部分）
      const ch_name = isGroupChat ? '' : file_name.split(' - ')[0];

      // 使用Character.find方法查找角色，获取头像
      let characterData = null;
      let avatar_url = '';

      if (!isGroupChat && ch_name) {
        characterData = RawCharacter.find({ name: ch_name });
        if (characterData) {
          avatar_url = characterData.avatar;
        }
      }

      const endpoint = isGroupChat ? '/api/chats/group/get' : '/api/chats/get';
      const requestBody = isGroupChat
        ? JSON.stringify({ id: file_name })
        : JSON.stringify({
            ch_name: ch_name,
            file_name: file_name.replace('.jsonl', ''),
            avatar_url: avatar_url,
          });

      const chatResponse = await fetch(endpoint, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: requestBody,
        cache: 'no-cache',
      });

      if (!chatResponse.ok) {
        return;
      }

      const currentChat = await chatResponse.json();
      if (!isGroupChat) {
        // remove the first message, which is metadata, only for individual chats
        currentChat.shift();
      }
      chat_dict[file_name] = currentChat;
    });

    await Promise.all(chat_promise);

    return chat_dict;
  }

  getCardData(): v1CharData {
    return this.character_data;
  }

  getAvatarId(): string {
    return this.character_data.avatar || '';
  }

  getRegexScripts(): Array<{
    id: string;
    scriptName: string;
    findRegex: string;
    replaceString: string;
    trimStrings: string[];
    placement: number[];
    disabled: boolean;
    markdownOnly: boolean;
    promptOnly: boolean;
    runOnEdit: boolean;
    substituteRegex: number | boolean;
    minDepth: number;
    maxDepth: number;
  }> {
    return this.character_data.data?.extensions?.regex_scripts || [];
  }

  getCharacterBook(): {
    name: string;
    entries: Array<{
      keys: string[];
      secondary_keys?: string[];
      comment: string;
      content: string;
      constant: boolean;
      selective: boolean;
      insertion_order: number;
      enabled: boolean;
      position: string;
      extensions: any;
      id: number;
    }>;
  } | null {
    return this.character_data.data?.character_book || null;
  }

  getWorldName(): string {
    return this.character_data.data?.extensions?.world || '';
  }
}

export function getCharData(name: LiteralUnion<'current', string>, allowAvatar: boolean = true): v1CharData | null {
  try {
    // backward compatibility
    name = !name ? 'current' : name;

    const characterData = RawCharacter.find({ name, allow_avatar: allowAvatar });
    if (!characterData) return null;

    const character = new RawCharacter(characterData);
    return character.getCardData();
  } catch (err) {
    const error = err as Error;
    throw Error(`获取${name ? ` '${name}' ` : '未知'}角色卡数据失败: ${error.message}`);
  }
}

export function getCharAvatarPath(name: LiteralUnion<'current', string>, allowAvatar: boolean = true): string | null {
  // backward compatibility
  name = !name ? 'current' : name;

  const characterData = RawCharacter.find({ name, allow_avatar: allowAvatar });
  if (!characterData) {
    return null;
  }

  const character = new RawCharacter(characterData);
  const avatarId = character.getAvatarId();

  // 使用 getThumbnailUrl 获取缩略图URL，然后提取实际文件名
  const thumbnailPath = getThumbnailUrl('avatar', avatarId);
  const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);

  return '/characters/' + targetAvatarImg;
}

export async function getChatHistoryBrief(
  name: LiteralUnion<'current', string>,
  allowAvatar: boolean = true,
): Promise<any[] | null> {
  // backward compatibility
  name = !name ? 'current' : name;

  const character_data = RawCharacter.find({ name, allow_avatar: allowAvatar });
  if (!character_data) {
    return null;
  }

  const character = new RawCharacter(character_data);
  const index = RawCharacter.findCharacterIndex(character.getAvatarId());
  if (index === -1) {
    return null;
  }

  const chats = await getPastCharacterChats(index);
  return chats;
}

export async function getChatHistoryDetail(
  data: any[],
  isGroupChat: boolean = false,
): Promise<Record<string, any> | null> {
  const result = await RawCharacter.getChatsFromFiles(data, isGroupChat);
  return result;
}
