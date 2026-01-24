// TODO: 重新设计这里的接口, set 部分直接访问后端
import { characters, getPastCharacterChats, getRequestHeaders, getThumbnailUrl, this_chid } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { LiteralUnion } from 'type-fest';

export class RawCharacter {
  private character_data: v1CharData;

  constructor(character_data: v1CharData) {
    this.character_data = character_data;
  }

  static find({ name }: { name: LiteralUnion<'current', string> }): v1CharData | null {
    const index = this.findIndex(name);
    if (index !== -1) {
      return characters[index];
    }
    return null;
  }

  static findIndex(name: LiteralUnion<'current', string>): number {
    if (name === 'current') {
      return this_chid === undefined ? -1 : Number(this_chid);
    }

    const lowered_name = name.toLowerCase();
    return characters.findIndex(
      character => character.name.toLowerCase() === lowered_name || character.avatar.toLowerCase() === lowered_name,
    );
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

export function getCharData(name: LiteralUnion<'current', string>): v1CharData | null {
  try {
    // backward compatibility
    name = !name ? 'current' : name;

    const characterData = RawCharacter.find({ name });
    if (!characterData) return null;

    const character = new RawCharacter(characterData);
    return character.getCardData();
  } catch (err) {
    const error = err as Error;
    throw Error(`获取${name ? ` '${name}' ` : '未知'}角色卡数据失败: ${error.message}`);
  }
}

export function getCharAvatarPath(name: LiteralUnion<'current', string>): string | null {
  // backward compatibility
  name = !name ? 'current' : name;

  const characterData = RawCharacter.find({ name });
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

export async function getChatHistoryBrief(name: LiteralUnion<'current', string>): Promise<any[] | null> {
  // backward compatibility
  name = !name ? 'current' : name;

  const character_data = RawCharacter.find({ name });
  if (!character_data) {
    return null;
  }

  const character = new RawCharacter(character_data);
  const index = RawCharacter.findIndex(character.getAvatarId());
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
