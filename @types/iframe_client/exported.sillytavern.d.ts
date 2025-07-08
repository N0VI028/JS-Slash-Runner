namespace SillyTavern {
  interface ChatMessage {
    message_id: number;
    name: string;
    /**
     * 实际的 role 为:
     * - 'system': extra?.type === 'narrator' && !is_user
     * - 'user': extra?.type !== 'narrator' && is_user
     * - 'assistant': extra?.type !== 'narrator' && !is_user
     */
    is_user: boolean;
    /**
     * 实际是表示消息是否被隐藏不会发给 llm
     */
    is_system: boolean;
    mes: string;
    swipe_id?: number;
    swipes?: string[];
    variables?: Record<string, any>[];
    extra?: Record<string, any>;
  }
}

/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 SillyTavern/public/scripts/st-context.js 或 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.SillyTavern.getContext()` 来查看当前酒馆所提供的接口
 */
const SillyTavern: {
  readonly accountStorage: any;
  readonly chat: Array<SillyTavern.ChatMessage>;
  readonly characters: any;
  readonly groups: any;
  readonly name1: any;
  readonly name2: any;
  /* this_chid */
  readonly characterId: any;
  readonly groupId: any;
  readonly chatId: any;
  readonly getCurrentChatId: () => any;
  readonly getRequestHeaders: () => {
    'Content-Type': string;
    'X-CSRF-TOKEN': string;
  };
  readonly reloadCurrentChat: () => Promise<void>;
  readonly renameChat: (old_name: string, new_name: string) => Promise<void>;
  readonly saveSettingsDebounced: () => Promise<void>;
  readonly onlineStatus: string;
  readonly maxContext: number;
  /** chat_metadata */
  readonly chatMetadata: Record<string, any>;
  readonly streamingProcessor: any;
  readonly eventSource: {
    on: typeof eventOn,
    makeLast: typeof eventMakeLast,
    makeFirst: typeof eventMakeFirst,
    removeListener: typeof eventRemoveListener,
    emit: typeof eventEmit,
    emitAndWait: typeof eventEmitAndWait,
    once: typeof eventOnce,
  };
  readonly eventTypes: typeof tavern_events;
  readonly addOneMessage: (mes: object, options: any) => Promise<void>;
  readonly deleteLastMessage: () => Promise<void>;
  readonly generate: Function;
  readonly sendStreamingRequest: (type: string, data: object) => Promise<void>;
  readonly sendGenerationRequest: (type: string, data: object) => Promise<void>;
  readonly stopGeneration: () => boolean;
  readonly tokenizers: any;
  readonly getTextTokens: (tokenizer_type: number, string: string) => Promise<void>;
  readonly getTokenCountAsync: (string: string, padding?: number | undefined) => Promise<void>;
  readonly extensionPrompts: any;
  readonly setExtensionPrompt: (
    key: string,
    value: string,
    position: number,
    depth: number,
    scan?: boolean,
    role?: number,
    filter?: () => Promise<boolean> | boolean,
  ) => Promise<void>;
  readonly updateChatMetadata: (new_values: any, reset: boolean) => void;
  readonly saveChat: () => Promise<void>;
  readonly openCharacterChat: (file_name: any) => Promise<void>;
  readonly openGroupChat: (group_id: any, chat_id: any) => Promise<void>;
  readonly saveMetadata: () => Promise<void>;
  readonly sendSystemMessage: (type: any, text: any, extra?: any) => Promise<void>;
  readonly activateSendButtons: () => void;
  readonly deactivateSendButtons: () => void;
  readonly saveReply: (options: any, ...args: any[]) => Promise<void>;
  readonly substituteParams: (
    content,
    name1?: string,
    name2?: string,
    original?: string,
    group?: string,
    replace_character_card?: boolean,
    additional_macro: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly substituteParamsExtended: (
    content: string,
    additional_macro?: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly SlashCommandParser: Type;
  readonly SlashCommand: Type;
  readonly SlashCommandArgument: Type;
  readonly SlashCommandNamedArgument: Type;
  readonly ARGUMENT_TYPE: {
    STRING: string;
    NUMBER: string;
    RANGE: string;
    BOOLEAN: string;
    VARIABLE_NAME: string;
    CLOSURE: string;
    SUBCOMMAND: string;
    LIST: string;
    DICTIONARY: string;
  };
  readonly executeSlashCommandsWithOptions: (text: string, options?: any) => Promise<void>;
  readonly timestampToMoment: (timestamp: string | number) => any;
  readonly registerMacro: (key: string, value: string | ((text: string) => string), description?: string) => void;
  readonly unregisterMacro: (key: string) => void;
  readonly registerFunctionTool: (options: any, ...args: any[]) => void;
  readonly unregisterFunctionTool: (name: string) => void;
  readonly isToolCallingSupported: () => boolean;
  readonly canPerformToolCalls: (type: string) => boolean;
  readonly ToolManager: Type;
  readonly registerDebugFunction: (function_id: string, name: string, description: string, fn: Function) => void;
  readonly renderExtensionTemplateAsync: (
    extension_name: string,
    template_id: string,
    template_data?: object,
    sanitize?: boolean,
    localize?: boolean,
  ) => Promise<string>;
  readonly registerDataBankScraper: (scraper: any) => Promise<void>;
  readonly callGenericPopup: (
    content: JQuery<HTMLElement> | string | Element,
    type: number,
    inputValue?: string,
    popupOptions?: any,
  ) => Promise<number | string | boolean | undefined>;
  readonly showLoader: () => void;
  readonly hideLoader: () => Promise<any>;
  readonly mainApi: any;
  readonly extensionSettings: Record<string, any>;
  readonly ModuleWorkerWrapper: Type;
  readonly getTokenizerModel: () => string;
  readonly generateQuietPrompt: () => (
    quiet_prompt: string,
    quiet_to_loud: boolean,
    skip_wian: boolean,
    quiet_iamge?: string,
    quiet_name?: string,
    response_length?: number,
    force_chid?: number,
  ) => Promise<string>;
  readonly writeExtensionField: (character_id: number, key: string, value: any) => Promise<void>;
  readonly getThumbnailUrl: (type: any, file: any) => string;
  readonly selectCharacterById: (id: number, { switchMenu }?: { switchMenu?: boolean }) => Promise<void>;
  readonly messageFormatting: (
    message: string,
    ch_name: string,
    is_system: boolean,
    is_user: boolean,
    message_id: number,
    sanitizerOverrides?: object,
    isReasoning?: boolean,
  ) => string;
  readonly shouldSendOnEnter: () => boolean;
  readonly isMobile: () => boolean;
  readonly t: (strings: string, ...values: any[]) => string;
  readonly translate: (text: string, key?: string | null) => string;
  readonly getCurrentLocale: () => string;
  readonly addLocaleData: (localeId: string, data: Record<string, string>) => void;
  readonly tags: any[];
  readonly tagMap: {
    [identifier: string]: string[];
  };
  readonly menuType: any;
  readonly createCharacterData: record<string, any>;
  readonly Popup: Type;
  readonly POPUP_TYPE: {
    TEXT: number;
    CONFIRM: number;
    INPUT: number;
    DISPLAY: number;
    CROP: number;
  };
  readonly POPUP_RESULT: {
    AFFIRMATIVE: number;
    NEGATIVE: number;
    CANCELLED: any;
    CUSTOM1: number;
    CUSTOM2: number;
    CUSTOM3: number;
    CUSTOM4: number;
    CUSTOM5: number;
    CUSTOM6: number;
    CUSTOM7: number;
    CUSTOM8: number;
    CUSTOM9: number;
  };
  /** oai_settings */
  readonly chatCompletionSettings: any;
  /** textgenerationwebui_settings */
  readonly textCompletionSettings: any;
  /** power_user */
  readonly powerUserSettings: any;
  readonly getCharacters: () => Promise<void>;
  readonly getCharacterCardFields: ({ chid }?: { chid?: number }) => any;
  readonly uuidv4: () => string;
  readonly humanizedDateTime: () => string;
  readonly updateMessageBlock: (
    message_id: number,
    message: object,
    { rerenderMessage }?: { rerenderMessage?: boolean },
  ) => void;
  readonly appendMediaToMessage: (mes: object, messageElement: JQuery<HTMLElement>, adjust_scroll?: boolean) => void;

  readonly loadWorldInfo: (name: string) => Promise<any | null>;
  readonly saveWorldInfo: (name: string, data: any, immediately?: boolean) => Promise<void>;
  /** reloadEditor */
  readonly reloadWorldInfoEditor: (file: string, loadIfNotSelected?: boolean) => void;
  readonly updateWorldInfoList: () => Promise<void>;
  readonly convertCharacterBook: (character_book: any) => {
    entries: Record<string, any>;
    originalData: Record<string, any>;
  };
  readonly getWorldInfoPrompt: (
    chat: string[],
    max_context: number,
    is_dry_run: boolean,
  ) => Promise<{
    worldInfoString: string;
    worldInfoBefore: string;
    worldInfoAfter: string;
    worldInfoExamples: any[];
    worldInfoDepth: any[];
    anBefore: any[];
    anAfter: any[];
  }>;
  readonly CONNECT_API_MAP: Record<string, any>;
  readonly getTextGenServer: (type?: string) => string;
  readonly extractMessageFromData: (data: object, activateApi?: string) => string;
  readonly getPresetManager: (apiId?: string) => any;
  readonly getChatCompletionModel: (source?: string) => string;
  readonly printMessages: () => Promise<void>;
  readonly clearChat: () => Promise<void>;
  readonly ChatCompletionService: Type;
  readonly TextCompletionService: Type;
  readonly ConnectionManagerRequestService: Type;
  readonly updateReasoningUI: (
    message_id_or_element: number | JQuery<HTMLElement> | HTMLElement,
    { reset }?: { reset?: boolean },
  ) => void;
  readonly parseReasoningFromString: (string: string, { strict }?: { strict?: boolean }) => any | null;
  readonly unshallowCharacter: (character_id?: string) => Promise<void>;
  readonly unshallowGroupMembers: (group_id: string) => Promise<void>;
  readonly symbols: {
    ignore: IGNORE_SYMBOL;
  };
};
