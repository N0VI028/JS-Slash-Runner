import { getVariables, replaceVariables } from '@/function/variables';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';
import { getCharData, getCharAvatarPath, getChatHistoryBrief, getChatHistoryDetail } from '@/function/character';
import { getChatMessages, setChatMessage } from '@/function/chat_message';
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
};
