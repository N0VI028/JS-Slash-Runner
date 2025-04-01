import { getVariables, replaceVariables } from '@/function/variables';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';
import { getCharData, getCharAvatarPath, getChatHistoryBrief, getChatHistoryDetail } from '@/function/character';
import { getChatMessages, setChatMessage } from '@/function/chat_message';
import { formatAsDisplayedMessage } from '@/function/displayed_message';
import { substitudeMacros } from '@/function/util';
import { updateFrontendVersion } from '@/function/frontend_version';
import { generate, generateRaw } from '@/function/generate';
import { getLorebookEntries, setLorebookEntries, createLorebookEntry, deleteLorebookEntry } from '@/function/lorebook_entry';
import { getLorebookSettings, setLorebookSettings, getCharLorebooks, setCurrentCharLorebooks, getLorebooks, deleteLorebook, createLorebook } from '@/function/lorebook';
import { triggerSlash, triggerSlashWithResult } from '@/function/slash';
import {
  isCharacterTavernRegexesEnabled,
  getTavernRegexes,
  handleGetTavernRegexes,
  handleReplaceTavernRegexes,
} from '@/function/tavern_regex';

(globalThis as unknown as { TavernHelper: Record<string, any> }).TavernHelper = {
  // 变量
  getVariables,
  replaceVariables,
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
  // 更新前端版本
  updateFrontendVersion,
  // 工具
  substitudeMacros,
  // 生成
  generate,
  generateRaw,
  // 世界书
  getLorebookEntries,
  setLorebookEntries,
  createLorebookEntry,
  deleteLorebookEntry,
  // 世界书设置
  getLorebookSettings,
  setLorebookSettings,
  getCharLorebooks,
  setCurrentCharLorebooks,
  getLorebooks,
  deleteLorebook,
  createLorebook,
  // 触发命令
  triggerSlash,
  triggerSlashWithResult,
  // 酒馆正则
  isCharacterTavernRegexesEnabled,
  getTavernRegexes,
  handleGetTavernRegexes,
  handleReplaceTavernRegexes,
};
