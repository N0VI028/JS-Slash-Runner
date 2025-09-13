interface Window {
  /**
   * 酒馆助手提供的额外功能, 具体内容见于 https://n0vi028.github.io/JS-Slash-Runner-Doc
   * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.TavernHelper` 来查看当前酒馆助手所提供的接口
   */
  TavernHelper: {
    // audio
    readonly audioEnable: typeof audioEnable;
    readonly audioImport: typeof audioImport;
    readonly audioMode: typeof audioMode;
    readonly audioPlay: typeof audioPlay;
    readonly audioSelect: typeof audioSelect;

    // builtin
    readonly builtin: typeof builtin;

    // character
    readonly Character: typeof RawCharacter;

    // chat_message
    readonly getChatMessages: typeof getChatMessages;
    readonly setChatMessages: typeof setChatMessages;
    readonly deleteChatMessages: typeof deleteChatMessages;
    readonly rotateChatMessages: typeof rotateChatMessages;
    readonly createChatMessages: typeof createChatMessages;

    // displayed_message
    readonly formatAsDisplayedMessage: typeof formatAsDisplayedMessage;
    readonly retrieveDisplayedMessage: typeof retrieveDisplayedMessage;

    // import_raw
    readonly importRawCharacter: typeof importRawCharacter;
    readonly importRawChat: typeof importRawChat;
    readonly importRawPreset: typeof importRawPreset;
    readonly importRawWorldbook: typeof importRawWorldbook;
    readonly importRawTavernRegex: typeof importRawTavernRegex;

    // inject
    readonly injectPrompts: typeof injectPrompts;
    readonly uninjectPrompts: typeof uninjectPrompts;

    // generate
    readonly builtin_prompt_default_order: typeof builtin_prompt_default_order;
    readonly generate: typeof generate;
    readonly generateRaw: typeof generateRaw;

    // lorebook_entry
    readonly getLorebookEntries: typeof getLorebookEntries;
    readonly replaceLorebookEntries: typeof replaceLorebookEntries;
    readonly updatelorebookEntriesWith: typeof updateLorebookEntriesWith;
    readonly setLorebookEntries: typeof setLorebookEntries;
    readonly createLorebookEntries: typeof createLorebookEntries;
    readonly deleteLorebookEntries: typeof deleteLorebookEntries;

    // lorebook
    readonly getLorebookSettings: typeof getLorebookSettings;
    readonly setLorebookSettings: typeof setLorebookSettings;
    readonly getLorebooks: typeof getLorebooks;
    readonly deleteLorebook: typeof deleteLorebook;
    readonly createLorebook: typeof createLorebook;
    readonly getCharLorebooks: typeof getCharLorebooks;
    readonly setCurrentCharLorebooks: typeof setCurrentCharLorebooks;
    readonly getCurrentCharPrimaryLorebook: typeof getCurrentCharPrimaryLorebook;
    readonly getOrCreateChatLorebook: typeof getOrCreateChatLorebook;

    // macrolike
    readonly registerMacroLike: typeof registerMacroLike;

    // preset
    readonly isPresetNormalPrompt: typeof isPresetNormalPrompt;
    readonly isPresetSystemPrompt: typeof isPresetSystemPrompt;
    readonly isPresetPlaceholderPrompt: typeof isPresetPlaceholderPrompt;
    readonly default_preset: typeof default_preset;
    readonly getPresetNames: typeof getPresetNames;
    readonly getLoadedPresetName: typeof getLoadedPresetName;
    readonly loadPreset: typeof loadPreset;
    readonly createPreset: typeof createPreset;
    readonly createOrReplacePreset: typeof createOrReplacePreset;
    readonly deletePreset: typeof deletePreset;
    readonly renamePreset: typeof renamePreset;
    readonly getPreset: typeof getPreset;
    readonly replacePreset: typeof replacePreset;
    readonly updatePresetWith: typeof updatePresetWith;
    readonly setPreset: typeof setPreset;

    // raw_character
    readonly RawCharacter: typeof RawCharacter;
    readonly getCharData: typeof getCharData;
    readonly getCharAvatarPath: typeof getCharAvatarPath;
    readonly getChatHistoryBrief: typeof getChatHistoryBrief;
    readonly getChatHistoryDetail: typeof getChatHistoryDetail;

    // script_repository
    readonly getScriptButtons: typeof getScriptButtons;
    readonly replaceScriptButtons: typeof replaceScriptButtons;

    // slash
    readonly triggerSlash: typeof triggerSlash;

    // tavern_regex
    readonly isCharacterTavernRegexesEnabled: typeof isCharacterTavernRegexesEnabled;
    readonly getTavernRegexes: typeof getTavernRegexes;
    readonly replaceTavernRegexes: typeof replaceTavernRegexes;
    readonly updateTavernRegexesWith: typeof updateTavernRegexesWith;

    // util
    readonly substitudeMacros: typeof substitudeMacros;
    readonly getLastMessageId: typeof getLastMessageId;
    readonly errorCatched: typeof errorCatched;

    // variables
    readonly getVariables: typeof getVariables;
    readonly replaceVariables: typeof replaceVariables;
    readonly updateVariablesWith: typeof updateVariablesWith;
    readonly insertOrAssignVariables: typeof insertOrAssignVariables;
    readonly deleteVariable: typeof deleteVariable;
    readonly insertVariables: typeof insertVariables;

    // version
    readonly getTavernHelperVersion: typeof getTavernHelperVersion;
    readonly updateTavernHelper: typeof updateTavernHelper;

    // worldbook
    readonly getWorldbookNames: typeof getWorldbookNames;
    readonly getGlobalWorldbookNames: typeof getGlobalWorldbookNames;
    readonly rebindGlobalWorldbooks: typeof rebindGlobalWorldbooks;
    readonly getCharWorldbookNames: typeof getCharWorldbookNames;
    readonly rebindCharWorldbooks: typeof rebindCharWorldbooks;
    readonly getChatWorldbookName: typeof getChatWorldbookName;
    readonly rebindChatWorldbook: typeof rebindChatWorldbook;
    readonly getOrCreateChatWorldbook: typeof getOrCreateChatWorldbook;
    readonly createWorldbook: typeof createWorldbook;
    readonly createOrReplaceWorldbook: typeof createOrReplaceWorldbook;
    readonly deleteWorldbook: typeof deleteWorldbook;
    readonly getWorldbook: typeof getWorldbook;
    readonly replaceWorldbook: typeof replaceWorldbook;
    readonly updateWorldbookWith: typeof updateWorldbookWith;
  };
}
