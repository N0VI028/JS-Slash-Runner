/** @deprecated 请使用内置库 "世界书强制用推荐的全局设置" */
type LorebookSettings = {
  selected_global_lorebooks: string[];
  scan_depth: number;
  context_percentage: number;
  budget_cap: number;
  min_activations: number;
  max_depth: number;
  max_recursion_steps: number;
  insertion_strategy: 'evenly' | 'character_first' | 'global_first';
  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;
}

/** @deprecated 请使用内置库 "世界书强制用推荐的全局设置" */
declare function getLorebookSettings(): LorebookSettings;
/** @deprecated 请使用内置库 "世界书强制用推荐的全局设置" */
declare function setLorebookSettings(settings: Partial<LorebookSettings>): void;

/** @deprecated 请使用 `getWorldbookNames` */
declare function getLorebooks(): string[];

/** @deprecated 请使用 `deleteWorldbook` */
declare function deleteLorebook(lorebook: string): Promise<boolean>;

/** @deprecated 请使用 `createWorldbook` */
declare function createLorebook(lorebook: string): Promise<boolean>;

/** @deprecated 请使用 `getCharWorldbookNames` */
type CharLorebooks = {
  primary: string | null;
  additional: string[];
}

/** @deprecated 请使用 `getCharWorldbookNames` */
type GetCharLorebooksOption = {
  name?: string;
  type?: 'all' | 'primary' | 'additional';
}

/** @deprecated 请使用 `getCharWorldbookNames` */
declare function getCharLorebooks({ name, type }?: GetCharLorebooksOption): CharLorebooks;

/** @deprecated 请使用 `getCharWorldbookNames` */
declare function getCurrentCharPrimaryLorebook(): string | null;

/** @deprecated 请使用 `rebindCharWorldbook` */
declare function setCurrentCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void>;

/** @deprecated 请使用 `getChatWorldbook` */
declare function getChatLorebook(): string | null;

/** @deprecated 请使用 `rebindChatWorldbook` */
declare function setChatLorebook(lorebook: string | null): Promise<void>;

/** @deprecated 请使用 `getOrCreateChatWorldbook` */
declare function getOrCreateChatLorebook(lorebook?: string): Promise<string>;
