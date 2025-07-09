import { charsPath } from '@/util/extension_variables';

import { characters, getPastCharacterChats, getRequestHeaders, getThumbnailUrl, this_chid } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';

import log from 'loglevel';

export class Character {
  private charData: v1CharData;

  constructor(characterData: v1CharData) {
    this.charData = characterData;
  }

  static find({ name, allowAvatar = true }: { name?: string; allowAvatar?: boolean } = {}): v1CharData {
    if (name === undefined) {
      // @ts-ignore
      const currentChar = characters[this_chid];
      if (currentChar) {
        name = currentChar.avatar;
        // 确保allowAvatar为true，以便可以通过avatar准确查找角色
        allowAvatar = true;
      }
    }

    const matches = (char: { avatar: string; name: string }) =>
      !name || char.name === name || (allowAvatar && char.avatar === name);

    const filteredCharacters = characters;

    // 如果有确定的角色头像id提供，则返回该角色
    if (allowAvatar && name) {
      const characterByAvatar = filteredCharacters.find(char => char.avatar === name);
      if (characterByAvatar) {
        return characterByAvatar;
      }
    }

    // 查找所有匹配的角色
    const matchingCharacters = name ? filteredCharacters.filter(matches) : filteredCharacters;
    if (matchingCharacters.length > 1) {
      log.warn(`找到多个符合条件的角色，返回导入时间最早的角色: ${name}`);
    }

    if (matchingCharacters.length === 0) {
      throw new Error(`提供的名称或头像ID为: ${name}，未找到符合条件的角色`);
    }

    return matchingCharacters[0];
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
        characterData = Character.find({ name: ch_name });
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
    return this.charData;
  }

  getAvatarId(): string {
    return this.charData.avatar || '';
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
    return this.charData.data?.extensions?.regex_scripts || [];
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
    return this.charData.data?.character_book || null;
  }

  getWorldName(): string {
    return this.charData.data?.extensions?.world || '';
  }
}

export function getCharData(name?: string, allowAvatar: boolean = true): v1CharData | null {
  try {
    const characterData = Character.find({ name, allowAvatar });
    if (!characterData) return null;

    const character = new Character(characterData);
    log.info(`获取角色卡数据成功, 角色: ${name || '未知'}`);
    return character.getCardData();
  } catch (error) {
    log.error(`获取角色卡数据失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

export function getCharAvatarPath(name?: string, allowAvatar: boolean = true): string | null {
  try {
    const characterData = Character.find({ name, allowAvatar });
    if (!characterData) return null;

    const character = new Character(characterData);
    const avatarId = character.getAvatarId();

    // 使用getThumbnailUrl获取缩略图URL，然后提取实际文件名
    const thumbnailPath = getThumbnailUrl('avatar', avatarId);
    const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);

    // 假设charsPath在其他地方定义
    log.info(`获取角色头像路径成功, 角色: ${name || '未知'}`);
    return charsPath + targetAvatarImg;
  } catch (error) {
    log.error(`获取角色头像路径失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

export async function getChatHistoryBrief(name?: string, allowAvatar: boolean = true): Promise<any[] | null> {
  try {
    const characterData = Character.find({ name, allowAvatar });
    if (!characterData) return null;

    const character = new Character(characterData);
    const index = Character.findCharacterIndex(character.getAvatarId());

    if (index === -1) return null;

    const chats = await getPastCharacterChats(index);
    log.info(`获取角色聊天历史摘要成功, 角色: ${name || '未知'}`);
    return chats;
  } catch (error) {
    log.error(`获取角色聊天历史摘要失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

export async function getChatHistoryDetail(
  data: any[],
  isGroupChat: boolean = false,
): Promise<Record<string, any> | null> {
  try {
    const result = await Character.getChatsFromFiles(data, isGroupChat);
    log.info(`获取聊天文件详情成功`);
    return result;
  } catch (error) {
    log.error(`获取聊天文件详情失败`, error);
    return null;
  }
}
