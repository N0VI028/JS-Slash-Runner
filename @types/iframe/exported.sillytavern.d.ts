/* eslint-disable @typescript-eslint/no-unsafe-function-type */
declare namespace SillyTavern {
  type ChatMessage = {
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

    swipe_info?: Record<string, any>[];
    extra?: Record<string, any>;

    variables?: Record<string, any>[] | { [swipe_id: number]: Record<string, any> };
  };

  type SendingMessage = {
    role: 'user' | 'assistant' | 'system';
    content:
      | string
      | Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string; detail: 'auto' | 'low' | 'high' } }
          | { type: 'video_url'; video_url: { url: string } }
        >;
  };

  type FlattenedWorldInfoEntry = {
    uid: number;
    displayIndex: number;
    comment?: string;
    disable: boolean;

    constant: boolean;
    selective: boolean;
    key: string[];
    /** 0: and_any, 1: not_all, 2: not_any, 3: and_all */
    selectiveLogic: 0 | 1 | 2 | 3;
    keysecondary: string[];
    scanDepth: number | null;
    vectorized: boolean;
    position: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    /** 0: system, 1: user, 2: assistant */
    role: 0 | 1 | 2 | null;
    depth: number;
    order: number;

    content: string;

    useProbability: boolean;
    probability: number;
    excludeRecursion: boolean;
    preventRecursion: boolean;
    delayUntilRecursion: boolean | number;
    sticky: number | null;
    cooldown: number | null;
    delay: number | null;

    extra?: Record<string, any>;
  };

  /**
   * V1 character data structure.
   */
  type v1CharData = {
    /** the name of the character */
    name: string;
    /** the description of the character */
    description: string;
    /** a short personality description of the character */
    personality: string;
    /** a scenario description of the character */
    scenario: string;
    /** the first message in the conversation */
    first_mes: string;
    /** the example message in the conversation */
    mes_example: string;
    /** creator's notes of the character */
    creatorcomment: string;
    /** the tags of the character */
    tags: string[];
    /** talkativeness */
    talkativeness: number;
    /** fav */
    fav: boolean | string;
    /** create_date */
    create_date: string;
    /** v2 data extension */
    data: v2CharData;
    // Non-standard extensions added by the ST server (not part of the original data)
    /** name of the current chat file chat */
    chat: string;
    /** file name of the avatar image (acts as a unique identifier) */
    avatar: string;
    /** the full raw JSON data of the character */
    json_data: string;
    /** if the data is shallow (lazy-loaded) */
    shallow?: boolean;
  };

  /**
   * V2 character data structure.
   */
  type v2CharData = {
    /** The character's name. */
    name: string;
    /** A brief description of the character. */
    description: string;
    /** The character's data version. */
    character_version: string;
    /** A short summary of the character's personality traits. */
    personality: string;
    /** A description of the character's background or setting. */
    scenario: string;
    /** The character's opening message in a conversation. */
    first_mes: string;
    /** An example message demonstrating the character's conversation style. */
    mes_example: string;
    /** Internal notes or comments left by the character's creator. */
    creator_notes: string;
    /** A list of keywords or labels associated with the character. */
    tags: string[];
    /** The system prompt used to interact with the character. */
    system_prompt: string;
    /** Instructions for handling the character's conversation history. */
    post_history_instructions: string;
    /** The name of the person who created the character. */
    creator: string;
    /** Additional greeting messages the character can use. */
    alternate_greetings: string[];
    /** Data about the character's world or story (if applicable). */
    character_book: v2WorldInfoBook;
    /** Additional details specific to the character. */
    extensions: v2CharDataExtensionInfos;
  };

  /**
   * A world info book containing entries.
   */
  type v2WorldInfoBook = {
    /** the name of the book */
    name: string;
    /** the entries of the book */
    entries: v2DataWorldInfoEntry[];
  };

  /**
   * A world info entry object.
   */
  type v2DataWorldInfoEntry = {
    /** An array of primary keys associated with the entry. */
    keys: string[];
    /** An array of secondary keys associated with the entry (optional). */
    secondary_keys: string[];
    /** A human-readable description or explanation for the entry. */
    comment: string;
    /** The main content or data associated with the entry. */
    content: string;
    /** Indicates if the entry's content is fixed and unchangeable. */
    constant: boolean;
    /** Indicates if the entry's inclusion is controlled by specific conditions. */
    selective: boolean;
    /** Defines the order in which the entry is inserted during processing. */
    insertion_order: number;
    /** Controls whether the entry is currently active and used. */
    enabled: boolean;
    /** Specifies the location or context where the entry applies. */
    position: string;
    /** An object containing additional details for extensions associated with the entry. */
    extensions: v2DataWorldInfoEntryExtensionInfos;
    /** A unique identifier assigned to the entry. */
    id: number;
  };

  /**
   * An object containing additional details for extensions associated with the entry.
   */
  type v2DataWorldInfoEntryExtensionInfos = {
    /** The order in which the extension is applied relative to other extensions. */
    position: number;
    /** Prevents the extension from being applied recursively. */
    exclude_recursion: boolean;
    /** The chance (between 0 and 1) of the extension being applied. */
    probability: number;
    /** Determines if the `probability` property is used. */
    useProbability: boolean;
    /** The maximum level of nesting allowed for recursive application of the extension. */
    depth: number;
    /** Defines the logic used to determine if the extension is applied selectively. */
    selectiveLogic: number;
    /** A category or grouping for the extension. */
    group: string;
    /** Overrides any existing group assignment for the extension. */
    group_override: boolean;
    /** A value used for prioritizing extensions within the same group. */
    group_weight: number;
    /** Completely disallows recursive application of the extension. */
    prevent_recursion: boolean;
    /** Will only be checked during recursion. */
    delay_until_recursion: boolean;
    /** The maximum depth to search for matches when applying the extension. */
    scan_depth: number;
    /** Specifies if only entire words should be matched during extension application. */
    match_whole_words: boolean;
    /** Indicates if group weight is considered when selecting extensions. */
    use_group_scoring: boolean;
    /** Controls whether case sensitivity is applied during matching for the extension. */
    case_sensitive: boolean;
    /** An identifier used for automation purposes related to the extension. */
    automation_id: string;
    /** The specific function or purpose of the extension. */
    role: number;
    /** Indicates if the extension is optimized for vectorized processing. */
    vectorized: boolean;
    /** The order in which the extension should be displayed for user interfaces. */
    display_index: number;
    /** Wether to match against the persona description. */
    match_persona_description: boolean;
    /** Wether to match against the persona description. */
    match_character_description: boolean;
    /** Wether to match against the character personality. */
    match_character_personality: boolean;
    /** Wether to match against the character depth prompt. */
    match_character_depth_prompt: boolean;
    /** Wether to match against the character scenario. */
    match_scenario: boolean;
    /** Wether to match against the character creator notes. */
    match_creator_notes: boolean;
  };

  /**
   * Additional details specific to the character.
   */
  type v2CharDataExtensionInfos = {
    /** A numerical value indicating the character's propensity to talk. */
    talkativeness: number;
    /** A flag indicating whether the character is a favorite. */
    fav: boolean;
    /** The fictional world or setting where the character exists (if applicable). */
    world: string;
    /** Prompts used to explore the character's depth and complexity. */
    depth_prompt: {
      /** The level of detail or nuance targeted by the prompt. */
      depth: number;
      /** The actual prompt text used for deeper character interaction. */
      prompt: string;
      /** The role the character takes on during the prompted interaction (system, user, or assistant). */
      role: 'system' | 'user' | 'assistant';
    };
    /** Custom regex scripts for the character. */
    regex_scripts: RegexScriptData[];
    // Non-standard extensions added by external tools
    /** The unique identifier assigned to the character by the Pygmalion.chat. */
    pygmalion_id?: string;
    /** The gitHub repository associated with the character. */
    github_repo?: string;
    /** The source URL associated with the character. */
    source_url?: string;
    /** The Chub-specific data associated with the character. */
    chub?: { full_path: string };
    /** The RisuAI-specific data associated with the character. */
    risuai?: { source: string[] };
    /** SD-specific data associated with the character. */
    sd_character_prompt?: { positive: string; negative: string };
  };

  /**
   * Regex script data for character processing.
   */
  type RegexScriptData = {
    /** UUID of the script */
    id: string;
    /** The name of the script */
    scriptName: string;
    /** The regex to find */
    findRegex: string;
    /** The string to replace */
    replaceString: string;
    /** The strings to trim */
    trimStrings: string[];
    /** The placement of the script */
    placement: number[];
    /** Whether the script is disabled */
    disabled: boolean;
    /** Whether the script only applies to Markdown */
    markdownOnly: boolean;
    /** Whether the script only applies to prompts */
    promptOnly: boolean;
    /** Whether the script runs on edit */
    runOnEdit: boolean;
    /** Whether the regex should be substituted */
    substituteRegex: number;
    /** The minimum depth */
    minDepth: number;
    /** The maximum depth */
    maxDepth: number;
  };

  type PopupOptions = {
    /** Custom text for the OK button, or `true` to use the default (If set, the button will always be displayed, no matter the type of popup) */
    okButton?: string | boolean;
    /** Custom text for the Cancel button, or `true` to use the default (If set, the button will always be displayed, no matter the type of popup) */
    cancelButton?: string | boolean;
    /** The number of rows for the input field */
    rows?: number;
    /** Whether to display the popup in wide mode (wide screen, 1/1 aspect ratio) */
    wide?: boolean;
    /** Whether to display the popup in wider mode (just wider, no height scaling) */
    wider?: boolean;
    /** Whether to display the popup in large mode (90% of screen) */
    large?: boolean;
    /** Whether to display the popup in transparent mode (no background, border, shadow or anything, only its content) */
    transparent?: boolean;
    /** Whether to allow horizontal scrolling in the popup */
    allowHorizontalScrolling?: boolean;
    /** Whether to allow vertical scrolling in the popup */
    allowVerticalScrolling?: boolean;
    /** Whether the popup content should be left-aligned by default */
    leftAlign?: boolean;
    /** Animation speed for the popup (opening, closing, ...) */
    animation?: 'slow' | 'fast' | 'none';
    /** The default result of this popup when Enter is pressed. Can be changed from `POPUP_RESULT.AFFIRMATIVE`. */
    defaultResult?: number;
    /** Custom buttons to add to the popup. If only strings are provided, the buttons will be added with default options, and their result will be in order from `2` onward. */
    customButtons?: CustomPopupButton[] | string[];
    /** Custom inputs to add to the popup. The display below the content and the input box, one by one. */
    customInputs?: CustomPopupInput[];
    /** Handler called before the popup closes, return `false` to cancel the close */
    onClosing?: (popup: InstanceType<typeof SillyTavern.Popup>) => Promise<boolean | void>;
    /** Handler called after the popup closes, but before the DOM is cleaned up */
    onClose?: (popup: InstanceType<typeof SillyTavern.Popup>) => Promise<void>;
    /** Handler called after the popup opens */
    onOpen?: (popup: InstanceType<typeof SillyTavern.Popup>) => Promise<void>;
    /** Aspect ratio for the crop popup */
    cropAspect?: number;
    /** Image URL to display in the crop popup */
    cropImage?: string;
  };

  type CustomPopupButton = {
    /** The text of the button */
    text: string;
    /** The result of the button - can also be a custom result value to make be able to find out that this button was clicked. If no result is specified, this button will **not** close the popup. */
    result?: number;
    /** Optional custom CSS classes applied to the button */
    classes?: string[] | string;
    /** Optional action to perform when the button is clicked */
    action?: () => void;
    /** Whether to append the button to the end of the popup - by default it will be prepended */
    appendAtEnd?: boolean;
  };

  type CustomPopupInput = {
    /** The id for the html element */
    id: string;
    /** The label text for the input */
    label: string;
    /** Optional tooltip icon displayed behind the label */
    tooltip?: string;
    /** The default state when opening the popup (false if not set) */
    defaultState?: boolean;
    /** The type of the input (default is checkbox) */
    type?: string;
  };
}

/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 SillyTavern/public/scripts/st-context.js 或 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.SillyTavern.getContext()` 来查看当前酒馆所提供的接口
 */
declare const SillyTavern: {
  readonly accountStorage: any;
  readonly chat: Array<SillyTavern.ChatMessage>;
  readonly characters: SillyTavern.v1CharData[];
  readonly groups: any;
  readonly name1: string;
  readonly name2: string;
  /* this_chid */
  readonly characterId: string;
  readonly groupId: string;
  readonly chatId: string;
  readonly getCurrentChatId: () => string;
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
    on: typeof eventOn;
    makeLast: typeof eventMakeLast;
    makeFirst: typeof eventMakeFirst;
    removeListener: typeof eventRemoveListener;
    emit: typeof eventEmit;
    emitAndWait: typeof eventEmitAndWait;
    once: typeof eventOnce;
  };
  readonly eventTypes: typeof tavern_events;
  readonly addOneMessage: (mes: object, options: any) => Promise<void>;
  readonly deleteLastMessage: () => Promise<void>;
  readonly generate: Function;
  readonly sendStreamingRequest: (type: string, data: object) => Promise<void>;
  readonly sendGenerationRequest: (type: string, data: object) => Promise<void>;
  readonly stopGeneration: () => boolean;
  readonly tokenizers: any;
  readonly getTextTokens: (tokenizer_type: number, string: string) => Promise<number>;
  readonly getTokenCountAsync: (string: string, padding?: number | undefined) => Promise<number>;
  /**  `/inject`、`setExtensionPrompt` 等注入的所有额外提示词 */
  readonly extensionPrompts: Record<
    string,
    {
      value: string;
      position: number;
      depth: number;
      scan: boolean;
      role: number;
      filter: () => Promise<boolean> | boolean;
    }
  >;
  /**
   * 注入一段额外的提示词
   *
   * @param prompt_id id, 重复则会替换原本的内容
   * @param content 内容
   * @param position 位置. -1 为不注入 (配合 scan=true 来仅用于激活绿灯), 1 为插入到聊天中
   * @param depth 深度
   * @param scan 是否作为欲扫描文本, 加入世界书绿灯条目扫描文本中
   * @param role 消息角色. 0 为 system, 1 为 user, 2 为 assistant
   * @param filter 提示词在什么情况下启用
   */
  readonly setExtensionPrompt: (
    prompt_id: string,
    content: string,
    position: -1 | 1,
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
    content: string,
    name1?: string,
    name2?: string,
    original?: string,
    group?: string,
    replace_character_card?: boolean,
    additional_macro?: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly substituteParamsExtended: (
    content: string,
    additional_macro?: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly SlashCommandParser: any;
  readonly SlashCommand: any;
  readonly SlashCommandArgument: any;
  readonly SlashCommandNamedArgument: any;
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
  readonly executeSlashCommandsWithOptions: (
    text: string,
    options?: any,
  ) => Promise<{
    interrupt: boolean;
    pipe: string;
    isBreak: boolean;
    isAborted: boolean;
    isQuietlyAborted: boolean;
    abortReason: string;
    isError: boolean;
    errorMessage: string;
  }>;
  readonly timestampToMoment: (timestamp: string | number) => any;
  readonly registerMacro: (key: string, value: string | ((uid: string) => string), description?: string) => void;
  readonly unregisterMacro: (key: string) => void;
  readonly registerFunctionTool: (tool: {
    /** 工具名称 */
    name: string;
    /** 工具显示名称 */
    displayName: string;
    /** 工具描述 */
    description: string;
    /** 对函数参数的 JSON schema 定义, 可以通过 zod 的 z.toJSONSchema 来得到 */
    parameters: Record<string, any>;
    /** 要注册的函数调用工具 */
    action: ((args: any) => string) | ((args: any) => Promise<string>);

    /** 要如何格式化函数调用结果消息; 默认不进行任何操作, 显示为 `'Invoking tool: 工具显示名称'` */
    formatMessage?: (args: any) => string;
    /** 在下次聊天补全请求时是否注册本工具; 默认为始终注册 */
    shouldRegister?: (() => boolean) | (() => Promise<boolean>);
    /** 是否不在楼层中用一层楼显示函数调用结果, `true` 则不显示且将不会触发生成; 默认为 false */
    stealth?: boolean;
  }) => void;
  readonly unregisterFunctionTool: (name: string) => void;
  readonly isToolCallingSupported: () => boolean;
  readonly canPerformToolCalls: (type: string) => boolean;
  readonly ToolManager: any;
  readonly registerDebugFunction: (function_id: string, name: string, description: string, fn: Function) => void;
  readonly renderExtensionTemplateAsync: (
    extension_name: string,
    template_id: string,
    template_data?: object,
    sanitize?: boolean,
    localize?: boolean,
  ) => Promise<string>;
  readonly registerDataBankScraper: (scraper: any) => Promise<void>;
  readonly showLoader: () => void;
  readonly hideLoader: () => Promise<any>;
  readonly mainApi: any;
  /** extension_settings */
  readonly extensionSettings: Record<string, any>;
  readonly ModuleWorkerWrapper: any;
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
  readonly createCharacterData: Record<string, any>;
  readonly Popup: {
    new (
      content: JQuery<HTMLElement> | string | Element,
      type: number,
      inputValue?: string,
      popupOptions?: SillyTavern.PopupOptions,
    ): {
      dlg: HTMLDialogElement;

      show: () => Promise<void>;
      complete: (result: number) => Promise<void>;
      completeAffirmative: () => Promise<void>;
      completeNegative: () => Promise<void>;
      completeCancelled: () => Promise<void>;
    };
  };
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
    CANCELLED: number;
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
  readonly callGenericPopup: (
    content: JQuery<HTMLElement> | string | Element,
    type: number,
    inputValue?: string,
    popupOptions?: SillyTavern.PopupOptions,
  ) => Promise<number | string | boolean | undefined>;
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
  readonly ChatCompletionService: any;
  readonly TextCompletionService: any;
  readonly ConnectionManagerRequestService: any;
  readonly updateReasoningUI: (
    message_id_or_element: number | JQuery<HTMLElement> | HTMLElement,
    { reset }?: { reset?: boolean },
  ) => void;
  readonly parseReasoningFromString: (string: string, { strict }?: { strict?: boolean }) => any | null;
  readonly unshallowCharacter: (character_id?: string) => Promise<void>;
  readonly unshallowGroupMembers: (group_id: string) => Promise<void>;
  readonly symbols: {
    ignore: any;
  };
};
