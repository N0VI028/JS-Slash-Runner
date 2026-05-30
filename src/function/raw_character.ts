// TODO: 重新设计这里的接口, set 部分直接访问后端
import { characters, getPastCharacterChats, getRequestHeaders, getThumbnailUrl, this_chid } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { LiteralUnion } from 'type-fest';

type ChatHistoryBriefItem = {
  file_name: string;
  ch_name?: string;
  character_name?: string;
  avatar_url?: string;
};

/**
 * 判断聊天摘要是否包含可读取的文件名
 */
function hasChatFileName(data: any): data is ChatHistoryBriefItem {
  return typeof data?.file_name === 'string' && data.file_name.length > 0;
}

/**
 * 按文件名倒序整理聊天摘要列表
 */
function getSortedChatList(data: any[]): ChatHistoryBriefItem[] {
  return Object.values(data ?? {})
    .filter(hasChatFileName)
    .sort((a, b) => a.file_name.localeCompare(b.file_name))
    .reverse();
}

/**
 * 从聊天摘要解析角色名，保留旧文件名前缀兼容
 */
function getChatCharacterName(chat: ChatHistoryBriefItem): string {
  return chat.ch_name ?? chat.character_name ?? chat.file_name.split(' - ')[0];
}

/**
 * 从聊天摘要解析头像目录，优先使用摘要携带的真实角色头像
 */
function getChatAvatarUrl(chat: ChatHistoryBriefItem, ch_name: string): string {
  return chat.avatar_url || RawCharacter.find({ name: ch_name })?.avatar || '';
}

/**
 * 构造聊天详情读取请求
 */
function buildChatRequest(chat: ChatHistoryBriefItem, isGroupChat: boolean): { endpoint: string; body: string } {
  if (isGroupChat) {
    return { endpoint: '/api/chats/group/get', body: JSON.stringify({ id: chat.file_name }) };
  }

  const ch_name = getChatCharacterName(chat);
  return {
    endpoint: '/api/chats/get',
    body: JSON.stringify({
      ch_name,
      file_name: chat.file_name.replace('.jsonl', ''),
      avatar_url: getChatAvatarUrl(chat, ch_name),
    }),
  };
}

/**
 * 为聊天摘要补充详情读取所需的角色定位字段。
 */
function attachCharacterToChats(chats: any[], character: RawCharacter): ChatHistoryBriefItem[] {
  return chats.map(chat => ({
    ...chat,
    ch_name: character.getCardData().name,
    avatar_url: character.getAvatarId(),
  }));
}

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
    const chat_list = getSortedChatList(data);

    const chat_promise = chat_list.map(async chat => {
      const request = buildChatRequest(chat, isGroupChat);
      const chatResponse = await fetch(request.endpoint, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: request.body,
        cache: 'no-cache',
      });

      if (!chatResponse.ok) {
        return;
      }

      const currentChat = await chatResponse.json();
      if (!Array.isArray(currentChat)) return;

      if (!isGroupChat) {
        currentChat.shift();
      }
      chat_dict[chat.file_name] = currentChat;
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
  return attachCharacterToChats(chats, character);
}

export async function getChatHistoryDetail(
  data: any[],
  isGroupChat: boolean = false,
): Promise<Record<string, any> | null> {
  const result = await RawCharacter.getChatsFromFiles(data, isGroupChat);
  return result;
}
