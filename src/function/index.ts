import {
  appendAudioList,
  getAudioList,
  getAudioSettings,
  pauseAudio,
  playAudio,
  replaceAudioList,
  setAudioSettings,
} from '@/function/audio';
import { builtin } from '@/function/builtin';
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
import {
  getExtensionInstallationInfo,
  getExtensionType,
  getTavernHelperExtensionId,
  installExtension,
  isAdmin,
  isInstalledExtension,
  reinstallExtension,
  uninstallExtension,
  updateExtension,
} from '@/function/extension';
import { generate, generateRaw, stopAllGeneration, stopGenerationById } from '@/function/generate';
import { builtin_prompt_default_order } from '@/function/generate/types';
import { _initializeGlobal, _waitGlobalInitialized, initializeGlobal, waitGlobalInitialized } from '@/function/global';
import {
  importRawCharacter,
  importRawChat,
  importRawPreset,
  importRawTavernRegex,
  importRawWorldbook,
} from '@/function/import_raw';
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
import { registerMacroLike, unregisterMacroLike } from '@/function/macro_like';
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
  getCharAvatarPath,
  getCharData,
  getChatHistoryBrief,
  getChatHistoryDetail,
  RawCharacter,
} from '@/function/raw_character';
import {
  _appendInexistentScriptButtons,
  _getButtonEvent,
  _getScriptButtons,
  _getScriptInfo,
  _replaceScriptButtons,
  _replaceScriptInfo,
  getAllEnabledScriptButtons,
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
  _reloadIframe,
  errorCatched,
  getLastMessageId,
  getMessageId,
  substitudeMacros,
} from '@/function/util';
import {
  _deleteVariable,
  _getAllVariables,
  _getVariables,
  _insertOrAssignVariables,
  _insertVariables,
  _replaceVariables,
  _updateVariablesWith,
  deleteVariable,
  getVariables,
  insertOrAssignVariables,
  insertVariables,
  replaceVariables,
  updateVariablesWith,
} from '@/function/variables';
import { getTavernHelperVersion, getTavernVersion, updateTavernHelper } from '@/function/version';
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

      // global
      _initializeGlobal,
      _waitGlobalInitialized,

      // script
      _getButtonEvent,
      _getScriptButtons,
      _replaceScriptButtons,
      _appendInexistentScriptButtons,
      _getScriptInfo,
      _replaceScriptInfo,

      // variables
      _getVariables,
      _getAllVariables,
      _replaceVariables,
      _updateVariablesWith,
      _insertOrAssignVariables,
      _insertVariables,
      _deleteVariable,

      // util
      _reloadIframe,
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
    playAudio,
    pauseAudio,
    getAudioList,
    replaceAudioList,
    insertAudioList: appendAudioList,
    getAudioSettings,
    setAudioSettings,

    // builtin
    builtin,

    // character
    Character: RawCharacter,

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

    // extension
    isAdmin,
    getTavernHelperExtensionId,
    getExtensionType,
    getExtensionStatus: getExtensionInstallationInfo,
    isInstalledExtension,
    installExtension,
    uninstallExtension,
    reinstallExtension,
    updateExtension,

    // import_raw
    importRawCharacter,
    importRawPreset,
    importRawChat,
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

    // global
    initializeGlobal,
    waitGlobalInitialized,

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

    // raw_character
    RawCharacter,
    getCharData,
    getCharAvatarPath,
    getChatHistoryBrief,
    getChatHistoryDetail,

    // macro_like
    registerMacroLike,
    unregisterMacroLike,

    // script
    getAllEnabledScriptButtons,

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
    getFrontendVersion: getTavernHelperVersion,
    updateTavernHelper,
    updateFrontendVersion: updateTavernHelper,
    getTavernVersion,

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

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
  let TavernHelper: ReturnType<typeof getTavernHelper>;
}

export function initTavernHelperObject() {
  globalThis.TavernHelper = getTavernHelper();
}
