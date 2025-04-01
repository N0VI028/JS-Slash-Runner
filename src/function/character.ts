import { charsPath } from '@/util/extension_variables';
import { characters, getPastCharacterChats, getRequestHeaders, getThumbnailUrl, this_chid } from '@sillytavern/script';

type v1CharData = (typeof characters)[number];

/**
 * 角色卡管理类
 * 用于封装角色卡数据操作和提供便捷的访问方法
 */
export class Character {
  /**
   * v1CharData类型的角色卡数据
   * @see char-data.js 中的 v1CharData 类型定义
   */
  private charData: v1CharData;

  constructor(characterData: v1CharData) {
    this.charData = characterData;
  }

  /**
   * 根据名称或头像id查找角色卡数据
   * @param options 查找选项
   * @returns 找到的角色卡数据，找不到为null
   */
  static find({ name, allowAvatar = true }: { name?: string; allowAvatar?: boolean } = {}): any {
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
      console.warn(`[Character] [findCharacter] 找到多个符合条件的角色，返回导入时间最早的角色: ${name}`);
    }

    if (matchingCharacters.length === 0) {
      throw new Error(`[Character] [findCharacter] 提供的名称或头像ID为: ${name}，未找到符合条件的角色`);
    }

    return matchingCharacters[0];
  }

  /**
   * 根据名称查找角色卡数据在characters数组中的索引（类似this_chid）
   * @param name 角色名称
   * @returns 角色卡数据在characters数组中的索引，未找到返回-1
   */

  static findCharacterIndex(name: string) {
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
  /**
   * 从服务器获取每个聊天文件的聊天内容，并将其编译成字典。
   * 该函数遍历提供的聊天元数据列表，并请求每个聊天的实际聊天内容，
   *
   * @param {Array} data - 包含每个聊天的元数据的数组，例如文件名。
   * @param {boolean} isGroupChat - 一个标志，指示聊天是否为群组聊天。
   * @returns {Promise<Object>} chat_dict - 一个字典，其中每个键是文件名，值是
   * 从服务器获取的相应聊天内容。
   */
  static async getChatsFromFiles(data: any[], isGroupChat: boolean) {
    const chat_dict: Record<string, any> = {};
    const chat_list = Object.values(data)
      .sort((a, b) => a['file_name'].localeCompare(b['file_name']))
      .reverse();

    const chat_promise = chat_list.map(({ file_name }) => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async (res, _rej) => {
        try {
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
            return res();
          }

          const currentChat = await chatResponse.json();
          if (!isGroupChat) {
            // remove the first message, which is metadata, only for individual chats
            currentChat.shift();
          }
          chat_dict[file_name] = currentChat;
        } catch (error) {
          console.error(error);
        }

        return res();
      });
    });

    await Promise.all(chat_promise);

    return chat_dict;
  }

  /**
   * 获取角色管理内的数据
   * @returns 完整的角色管理内的数据对象
   */
  getCardData(): v1CharData {
    return this.charData;
  }

  /**
   * 获取角色头像ID
   * @returns 头像ID/文件名
   */
  getAvatarId(): string {
    return this.charData.avatar || '';
  }

  /**
   * 获取正则脚本
   * @returns 正则脚本数组
   */
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

  /**
   * 获取角色书
   * @returns 角色书数据对象或null
   */
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

  /**
   * 获取角色世界名称
   * @returns 世界名称
   */
  getWorldName(): string {
    return this.charData.data?.extensions?.world || '';
  }
}

/**
 * 获取角色卡数据
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色卡数据
 */
export function getCharData(name?: string, allowAvatar: boolean = true): v1CharData | null {
  try {
    const characterData = Character.find({ name, allowAvatar });
    if (!characterData) return null;

    const character = new Character(characterData);
    console.info(`获取角色卡数据成功, 角色: ${name || '未知'}`);
    return character.getCardData();
  } catch (error) {
    console.error(`获取角色卡数据失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

/**
 * 获取角色头像路径
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色头像路径
 */
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
    console.info(`获取角色头像路径成功, 角色: ${name || '未知'}`);
    return charsPath + targetAvatarImg;
  } catch (error) {
    console.error(`获取角色头像路径失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

/**
 * 获取角色聊天历史摘要
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 聊天历史摘要数组
 */
export async function getChatHistoryBrief(name?: string, allowAvatar: boolean = true): Promise<any[] | null> {
  try {
    const characterData = Character.find({ name, allowAvatar });
    if (!characterData) return null;

    const character = new Character(characterData);
    const index = Character.findCharacterIndex(character.getAvatarId());

    if (index === -1) return null;

    const chats = await getPastCharacterChats(index);
    console.info(`获取角色聊天历史摘要成功, 角色: ${name || '未知'}`);
    return chats;
  } catch (error) {
    console.error(`获取角色聊天历史摘要失败, 角色: ${name || '未知'}`, error);
    return null;
  }
}

/**
 * 获取聊天历史详情
 * @param data 聊天数据数组
 * @param isGroupChat 是否为群组聊天
 * @returns 聊天历史详情
 */
export async function getChatHistoryDetail(
  data: any[],
  isGroupChat: boolean = false,
): Promise<Record<string, any> | null> {
  try {
    const result = await Character.getChatsFromFiles(data, isGroupChat);
    console.info(`获取聊天文件详情成功`);
    return result;
  } catch (error) {
    console.error(`获取聊天文件详情失败`, error);
    return null;
  }
}
