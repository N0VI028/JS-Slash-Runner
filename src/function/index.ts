import { getCharAvatarPath, getCharData, getChatHistoryBrief, getChatHistoryDetail } from '@/function/character';
import { getChatMessages, setChatMessage } from '@/function/chat_message';
import { formatAsDisplayedMessage, retrieveDisplayedMessage } from '@/function/displayed_message';
import { updateFrontendVersion, getFrontendVersion } from '@/function/frontend_version';
import { generate, generateRaw } from '@/function/generate';
import {
  createLorebook,
  deleteLorebook,
  getCharLorebooks,
  getLorebooks,
  getLorebookSettings,
  getOrCreateChatLorebook,
  setCurrentCharLorebooks,
  setLorebookSettings,
  getCurrentCharPrimaryLorebook,
} from '@/function/lorebook';
import {
  activateLorebookEntries,
  createLorebookEntry,
  deleteLorebookEntry,
  getLorebookEntries,
  setLorebookEntries,
} from '@/function/lorebook_entry';
import { triggerSlash, triggerSlashWithResult } from '@/function/slash';
import { getTavernRegexes, isCharacterTavernRegexesEnabled, replaceTavernRegexes, updateTavernRegexesWith } from '@/function/tavern_regex';
import {
  substitudeMacros,
  errorCatched,
  getLastMessageId,
} from '@/function/util';
import {
  getVariables,
  replaceVariables,
  updateVariablesWith,
  insertOrAssignVariables,
  deleteVariable,
  insertVariables,
} from '@/function/variables';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';
import { getCharacterScriptVariables } from '@/component/script_repository/index';

/**
 * 初始化TavernHelper全局对象
 * 将各种功能函数暴露到全局作用域
 */
export function initTavernHelperObject() {
  (globalThis as unknown as { TavernHelper: Record<string, any> }).TavernHelper = {
    // 变量
    getVariables,
    replaceVariables,
    updateVariablesWith,
    insertOrAssignVariables,
    deleteVariable,
    insertVariables,
    // 音频
    audioEnable,
    audioImport,
    audioMode,
    audioPlay,
    audioSelect,
    // 角色
    getCharData,
    getCharAvatarPath,
    getChatHistoryBrief,
    getChatHistoryDetail,
    // 消息
    getChatMessages,
    setChatMessage,
    // 显示消息
    formatAsDisplayedMessage,
    retrieveDisplayedMessage,
    // 更新前端版本
    getFrontendVersion,
    updateFrontendVersion,
    // 工具
    substitudeMacros,
    errorCatched,
    getLastMessageId,
    // getCurrentMessageId,
    // getIframeName,
    // getMessageId,
    // 生成
    generate,
    generateRaw,
    // 世界书条目
    getLorebookEntries,
    setLorebookEntries,
    createLorebookEntry,
    deleteLorebookEntry,
    activateLorebookEntries,
    // 世界书设置
    getLorebookSettings,
    getCharLorebooks,
    setCurrentCharLorebooks,
    setLorebookSettings,
    getLorebooks,
    deleteLorebook,
    createLorebook,
    getCurrentCharPrimaryLorebook,
    getOrCreateChatLorebook,
    // 触发命令
    triggerSlash,
    triggerSlashWithResult,
    // 酒馆正则
    isCharacterTavernRegexesEnabled,
    getTavernRegexes,
    replaceTavernRegexes,
    updateTavernRegexesWith,
    // 脚本库
    getCharacterScriptVariables,
  };
}
