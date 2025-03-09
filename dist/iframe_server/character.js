import { characters, this_chid, getThumbnailUrl, getPastCharacterChats, getRequestHeaders, } from '../../../../../../script.js';
import { getLogPrefix, registerIframeHandler } from './index.js';
import { charsPath } from '../component/message_iframe.js';
/**
 * 角色卡管理类
 * 用于封装角色卡数据操作和提供便捷的访问方法
 */
export class Character {
    /**
     * v1CharData类型的角色卡数据
     * @see char-data.js 中的 v1CharData 类型定义
     */
    charData;
    constructor(characterData) {
        this.charData = characterData;
    }
    /**
     * 根据名称或头像id查找角色卡数据
     * @param options 查找选项
     * @returns 找到的角色卡数据，找不到为null
     */
    static find({ name, allowAvatar = true } = {}) {
        if (name === undefined) {
            const currentChar = characters[this_chid];
            if (currentChar) {
                name = currentChar.avatar;
                // 确保allowAvatar为true，以便可以通过avatar准确查找角色
                allowAvatar = true;
            }
        }
        const matches = (char) => !name || char.name === name || (allowAvatar && char.avatar === name);
        let filteredCharacters = characters;
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
            console.warn('[Character] 找到多个符合条件的角色，返回导入时间最早的角色');
        }
        if (matchingCharacters.length === 0) {
            throw new Error(`提供的名称或头像ID为: ${name}，未找到符合条件的角色`);
        }
        return matchingCharacters[0];
    }
    /**
     * 根据名称查找角色卡数据在characters数组中的索引（类似this_chid）
     * @param name 角色名称
     * @returns 角色卡数据在characters数组中的索引，未找到返回-1
     */
    static findCharacterIndex(name) {
        const matchTypes = [
            (a, b) => a === b,
            (a, b) => a.startsWith(b),
            (a, b) => a.includes(b),
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
    static async getChatsFromFiles(data, isGroupChat) {
        let chat_dict = {};
        let chat_list = Object.values(data)
            .sort((a, b) => a['file_name'].localeCompare(b['file_name']))
            .reverse();
        let chat_promise = chat_list.map(({ file_name }) => {
            return new Promise(async (res, _rej) => {
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
                }
                catch (error) {
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
    getCardData() {
        return this.charData;
    }
    /**
     * 获取角色头像ID
     * @returns 头像ID/文件名
     */
    getAvatarId() {
        return this.charData.avatar || '';
    }
    /**
     * 获取正则脚本
     * @returns 正则脚本数组
     */
    getRegexScripts() {
        return this.charData.data?.extensions?.regex_scripts || [];
    }
    /**
     * 获取角色书
     * @returns 角色书数据对象或null
     */
    getCharacterBook() {
        return this.charData.data?.character_book || null;
    }
    /**
     * 获取角色世界名称
     * @returns 世界名称
     */
    getWorldName() {
        return this.charData.data?.extensions?.world || '';
    }
}
export function registerIframeCharacterHandler() {
    function withCharacter(callback, defaultValue = null, name, allowAvatar = true) {
        const characterData = Character.find({ name, allowAvatar });
        const character = characterData ? new Character(characterData) : null;
        return character ? callback(character) : defaultValue;
    }
    // 通用包装函数，用于处理角色相关的iframe消息
    function createCharacterHandler(eventType, handler, defaultValue = null, logMessage) {
        registerIframeHandler(eventType, async (event) => {
            const { name, allowAvatar = true } = event.data;
            let displayName = name;
            if (displayName === undefined) {
                const currentChar = characters[this_chid];
                if (currentChar) {
                    displayName = currentChar.name;
                }
            }
            const result = withCharacter(character => handler(character, event), defaultValue, name, allowAvatar);
            // 日志打印
            if (logMessage) {
                const logText = logMessage(event, null, displayName);
                if (result instanceof Promise) {
                    result
                        .then(resolvedResult => {
                        console.info(`${getLogPrefix(event)}${logText}`, resolvedResult);
                    })
                        .catch(error => {
                        throw Error(`${getLogPrefix(event)}${logText} - 发生错误: ${error}`);
                    });
                }
                else {
                    console.info(`${getLogPrefix(event)}${logText}`, result);
                }
            }
            return result;
        });
    }
    createCharacterHandler('[Character][getCharCardData]', character => character.getCardData(), null, (_event, _result, displayName) => `获取角色卡在角色管理器中的数据, 角色: ${displayName || '未知'}`);
    createCharacterHandler('[Character][getCharAvatarPath]', character => {
        const thumbnailPath = getThumbnailUrl('avatar', character.getAvatarId());
        const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
        return charsPath + targetAvatarImg;
    }, null, (_event, _result, displayName) => `获取角色头像路径, 角色: ${displayName || '未知'}`);
    createCharacterHandler('[Character][getChatHistoryBrief]', async (character) => {
        const index = Character.findCharacterIndex(character.getAvatarId());
        const chats = await getPastCharacterChats(index);
        return chats;
    }, null, (_event, _result, displayName) => {
        return `获取角色聊天历史摘要, 角色: ${displayName || '未知'}`;
    });
    registerIframeHandler('[Character][getChatHistoryDetail]', async (event) => {
        const data = event.data.data;
        const isGroupChat = event.data.isGroupChat || false;
        try {
            const result = await Character.getChatsFromFiles(data, isGroupChat);
            console.info(`${getLogPrefix(event)}获取聊天文件详情`, result);
            return result;
        }
        catch (error) {
            throw Error(`${getLogPrefix(event)}获取聊天文件详情 - 发生错误: ${error}`);
        }
    });
}
//# sourceMappingURL=character.js.map