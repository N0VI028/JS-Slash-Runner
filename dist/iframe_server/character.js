import { characters, this_chid, getThumbnailUrl } from '../../../../../../script.js';
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
    /**
     * 获取指定键的值，支持点号路径
     * @param path 属性路径，如 "data.extensions.world"
     * @param defaultValue 默认值
     * @returns 属性值或默认值
     */
    getProperty(path, defaultValue) {
        if (!path)
            return defaultValue;
        const parts = path.split('.');
        let value = this.charData;
        for (const part of parts) {
            if (value === undefined || value === null) {
                return defaultValue;
            }
            value = value[part];
        }
        return (value !== undefined ? value : defaultValue);
    }
    /**
     * 提取多个属性
     * @param paths 属性路径数组
     * @returns 包含请求属性的对象
     */
    extractProperties(paths) {
        const result = {};
        for (const path of paths) {
            const value = this.getProperty(path);
            if (value !== undefined) {
                // 取路径的最后部分作为键名
                const key = path.split('.').pop() || path;
                result[key] = value;
            }
        }
        return result;
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
            if (logMessage) {
                console.info(`${getLogPrefix(event)}${logMessage(event, result, displayName)}`);
            }
            return result;
        });
    }
    createCharacterHandler('[Character][findCharacter]', character => character, null, (_event, _result, displayName) => `查找到角色 '${displayName || '未知'}' `);
    createCharacterHandler('[Character][getCardData]', character => character.getCardData(), null, (_event, _result, displayName) => `获取角色卡在角色管理器中的数据, 角色: ${displayName || '未知'}, 数据: ${_result}`);
    createCharacterHandler('[Character][getAvatarPath]', character => {
        const thumbnailPath = getThumbnailUrl('avatar', character.getAvatarId());
        const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
        return charsPath + targetAvatarImg;
    }, null, (_event, _result, displayName) => `获取角色头像路径, 角色: ${displayName || '未知'}, 路径: ${_result}`);
}
//# sourceMappingURL=character.js.map