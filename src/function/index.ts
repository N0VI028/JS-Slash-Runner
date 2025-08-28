import { registerMacroLike } from '@/component/macrolike';
import { builtin } from '@/function/builtin';
import {
  Character,
  getCharAvatarPath,
  getCharData,
  getChatHistoryBrief,
  getChatHistoryDetail,
} from '@/function/character';
import {
  createChatMessages,
  deleteChatMessages,
  getChatMessages,
  rotateChatMessages,
  setChatMessage,
  setChatMessages,
} from '@/function/chat_message';
import { formatAsDisplayedMessage, retrieveDisplayedMessage } from '@/function/displayed_message';
import {
  _eventClearAll,
  _eventClearEvent,
  _eventClearListener,
  _eventEmit,
  _eventEmitAndWait,
  _eventMakeFirst,
  _eventMakeLast,
  _eventOn,
  _eventOnButton,
  _eventOnce,
  _eventRemoveListener,
  iframe_events,
  tavern_events,
} from '@/function/event';
import { generate, generateRaw, stopAllGeneration, stopGenerationById } from '@/function/generate';

import { builtin_prompt_default_order } from '@/function/generate/types';
import { importRawCharacter, importRawPreset, importRawTavernRegex, importRawWorldbook } from '@/function/import_raw';
import { injectPrompts, uninjectPrompts } from '@/function/inject';
import {
  createLorebook,
  deleteLorebook,
  getCharLorebooks,
  getChatLorebook,
  getCurrentCharPrimaryLorebook,
  getLorebooks,
  getLorebookSettings,
  getOrCreateChatLorebook,
  setChatLorebook,
  setCurrentCharLorebooks,
  setLorebookSettings,
} from '@/function/lorebook';
import {
  createLorebookEntries,
  createLorebookEntry,
  deleteLorebookEntries,
  deleteLorebookEntry,
  getLorebookEntries,
  replaceLorebookEntries,
  setLorebookEntries,
  updateLorebookEntriesWith,
} from '@/function/lorebook_entry';
import {
  createOrReplacePreset,
  createPreset,
  default_preset,
  deletePreset,
  getLoadedPresetName,
  getPreset,
  getPresetNames,
  isPresetNormalPrompt,
  isPresetPlaceholderPrompt,
  isPresetSystemPrompt,
  loadPreset,
  renamePreset,
  replacePreset,
  setPreset,
  updatePresetWith,
} from '@/function/preset';
import {
  _appendInexistentScriptButtons,
  _getButtonEvent,
  _getScriptButtons,
  _getScriptInfo,
  _replaceScriptButtons,
  _replaceScriptInfo,
} from '@/function/script';
import { triggerSlash } from '@/function/slash';
import {
  formatAsTavernRegexedString,
  getTavernRegexes,
  isCharacterTavernRegexesEnabled,
  replaceTavernRegexes,
  updateTavernRegexesWith,
} from '@/function/tavern_regex';
import {
  _getCurrentMessageId,
  _getIframeName,
  _getScriptId,
  errorCatched,
  getLastMessageId,
  getMessageId,
  substitudeMacros,
} from '@/function/util';
import {
  _getAllVariables,
  deleteVariable,
  getVariables,
  insertOrAssignVariables,
  insertVariables,
  replaceVariables,
  updateVariablesWith,
} from '@/function/variables';
import { getTavernHelperVersion, updateTavernHelper } from '@/function/version';
import {
  createOrReplaceWorldbook,
  createWorldbook,
  createWorldbookEntries,
  deleteWorldbook,
  deleteWorldbookEntries,
  getCharWorldbookNames,
  getChatWorldbookName,
  getGlobalWorldbookNames,
  getOrCreateChatWorldbook,
  getWorldbook,
  getWorldbookNames,
  rebindCharWorldbooks,
  rebindChatWorldbook,
  rebindGlobalWorldbooks,
  replaceWorldbook,
  updateWorldbookWith,
} from '@/function/worldbook';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';

function getTavernHelper() {
  return {
    _bind: {
      // event
      _eventOn,
      _eventOnButton,
      _eventMakeLast,
      _eventMakeFirst,
      _eventOnce,
      _eventEmit,
      _eventEmitAndWait,
      _eventRemoveListener,
      _eventClearEvent,
      _eventClearListener,
      _eventClearAll,

      // script
      _getButtonEvent,
      _getScriptButtons,
      _replaceScriptButtons,
      _appendInexistentScriptButtons,
      _getScriptInfo,
      _replaceScriptInfo,

      // variables
      _getAllVariables,

      // util
      _getIframeName,
      _getScriptId,
      _getCurrentMessageId,
    },

    // audio
    audioEnable,
    audioImport,
    audioMode,
    audioPlay,
    audioSelect,

    // builtin
    builtin,

    // character
    Character,
    getCharData,
    getCharAvatarPath,
    getChatHistoryBrief,
    getChatHistoryDetail,

    // chat_message
    getChatMessages,
    setChatMessages,
    setChatMessage,
    createChatMessages,
    deleteChatMessages,
    rotateChatMessages,

    // displayed_message
    formatAsDisplayedMessage,
    retrieveDisplayedMessage,

    // event
    tavern_events,
    iframe_events,

    // import_raw
    importRawCharacter,
    importRawPreset,
    importRawWorldbook,
    importRawTavernRegex,

    // inject
    injectPrompts,
    uninjectPrompts,

    // generate
    builtin_prompt_default_order,
    generate,
    generateRaw,
    stopGenerationById,
    stopAllGeneration,
    // lorebook_entry
    getLorebookEntries,
    replaceLorebookEntries,
    updateLorebookEntriesWith,
    setLorebookEntries,
    createLorebookEntries,
    createLorebookEntry,
    deleteLorebookEntries,
    deleteLorebookEntry,

    // lorebook
    getLorebookSettings,
    setLorebookSettings,
    getCharLorebooks,
    setCurrentCharLorebooks,
    getLorebooks,
    deleteLorebook,
    createLorebook,
    getCurrentCharPrimaryLorebook,
    getChatLorebook,
    setChatLorebook,
    getOrCreateChatLorebook,

    // preset
    isPresetNormalPrompt,
    isPresetSystemPrompt,
    isPresetPlaceholderPrompt,
    default_preset,
    getPresetNames,
    getLoadedPresetName,
    loadPreset,
    createPreset,
    createOrReplacePreset,
    deletePreset,
    renamePreset,
    getPreset,
    replacePreset,
    updatePresetWith,
    setPreset,

    // macrolike
    registerMacroLike,

    // slash
    triggerSlash,
    triggerSlashWithResult: triggerSlash,

    // tavern_regex
    formatAsTavernRegexedString,
    isCharacterTavernRegexesEnabled,
    getTavernRegexes,
    replaceTavernRegexes,
    updateTavernRegexesWith,

    // util
    substitudeMacros,
    getLastMessageId,
    errorCatched,
    getMessageId,

    // variables
    getVariables,
    replaceVariables,
    updateVariablesWith,
    insertOrAssignVariables,
    deleteVariable,
    insertVariables,

    // version
    getTavernHelperVersion,
    updateTavernHelper,
    getFrontendVersion: getTavernHelperVersion,
    updateFrontendVersion: updateTavernHelper,

    // worldbook
    getWorldbookNames,
    getGlobalWorldbookNames,
    rebindGlobalWorldbooks,
    getCharWorldbookNames,
    rebindCharWorldbooks,
    getChatWorldbookName,
    rebindChatWorldbook,
    getOrCreateChatWorldbook,
    createWorldbook,
    createOrReplaceWorldbook,
    deleteWorldbook,
    getWorldbook,
    replaceWorldbook,
    updateWorldbookWith,
    createWorldbookEntries,
    deleteWorldbookEntries,
  };
}

declare namespace globalThis {
  let TavernHelper: ReturnType<typeof getTavernHelper>;
}

/**
 * 初始化TavernHelper全局对象
 * 将各种功能函数暴露到全局作用域
 */
export function initTavernHelperObject() {
  globalThis.TavernHelper = getTavernHelper();
}
