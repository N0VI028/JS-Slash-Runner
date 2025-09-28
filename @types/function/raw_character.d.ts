/**
 * 角色卡管理类
 * 用于封装角色卡数据操作和提供便捷的访问方法
 */
declare class RawCharacter {
  constructor(characterData: SillyTavern.v1CharData);

  /**
   * 根据名称或头像id查找角色卡数据
   * @param options 查找选项
   * @returns 找到的角色卡数据，找不到为null
   */
  static find({
    name,
    allowAvatar,
  }?: {
    name: LiteralUnion<'current', string>;
    allowAvatar?: boolean;
  }): SillyTavern.v1CharData;

  /**
   * 根据名称查找角色卡数据在characters数组中的索引（类似this_chid）
   * @param name 角色名称
   * @returns 角色卡数据在characters数组中的索引，未找到返回-1
   */
  static findCharacterIndex(name: string): any;

  /**
   * 从服务器获取每个聊天文件的聊天内容，并将其编译成字典。
   * 该函数遍历提供的聊天元数据列表，并请求每个聊天的实际聊天内容，
   *
   * @param {Array} data - 包含每个聊天的元数据的数组，例如文件名。
   * @param {boolean} isGroupChat - 一个标志，指示聊天是否为群组聊天。
   * @returns {Promise<Object>} chat_dict - 一个字典，其中每个键是文件名，值是
   * 从服务器获取的相应聊天内容。
   */
  static getChatsFromFiles(data: any[], isGroupChat: boolean): Promise<Record<string, any>>;

  /**
   * 获取角色管理内的数据
   * @returns 完整的角色管理内的数据对象
   */
  getCardData(): SillyTavern.v1CharData;

  /**
   * 获取角色头像ID
   * @returns 头像ID/文件名
   */
  getAvatarId(): string;

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
  }>;

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
  } | null;

  /**
   * 获取角色世界名称
   * @returns 世界名称
   */
  getWorldName(): string;
}

/**
 * 获取角色卡数据
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色卡数据
 */
declare function getCharData(
  name: LiteralUnion<'current', string>,
  allowAvatar?: boolean,
): SillyTavern.v1CharData | null;

/**
 * 获取角色头像路径
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色头像路径
 */
declare function getCharAvatarPath(name: LiteralUnion<'current', string>, allowAvatar?: boolean): string | null;

/**
 * 获取角色聊天历史摘要
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 聊天历史摘要数组
 */
declare function getChatHistoryBrief(
  name: LiteralUnion<'current', string>,
  allowAvatar?: boolean,
): Promise<any[] | null>;

/**
 * 获取聊天历史详情
 * @param data 聊天数据数组
 * @param isGroupChat 是否为群组聊天
 * @returns 聊天历史详情
 */
declare function getChatHistoryDetail(data: any[], isGroupChat?: boolean): Promise<Record<string, any> | null>;
