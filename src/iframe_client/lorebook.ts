// TODO: 没给接口做不到设置世界书全局设置, 服了
// TODO: 查询哪些条目被激活?
// TODO: 绑定/解绑世界书?

interface LorebookSettings {
  selected_global_lorebooks: string[];

  scan_depth: number;
  context_percentage: number;
  budget_cap: number;  // 0 表示禁用
  min_activations: number;
  max_depth: number;  // 0 表示无限制
  max_recursion_steps: number;

  insertion_strategy: 'evenly' | 'character_first' | 'global_first';

  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;
};

/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 *
 * @example
 * // 获取全局启用的世界书
 * const settings = await getLorebookSettings();
 * alert(settings.selected_global_lorebooks);
 */
async function getLorebookSettings(): Promise<LorebookSettings> {
  return detail.make_iframe_promise({
    request: "iframe_get_lorebook_settings",
  });
}

/**
 * 修改世界书全局设置
 *
 * @returns 修改世界书全局设置
 *
 * @example
 * // 修改上下文百分比为 100%, 启用递归扫描
 * await setLorebookSettings({context_percentage: 100, recursive: true});
 */
async function setLorebookSettings(settings: Partial<LorebookSettings>): Promise<void> {
  return detail.make_iframe_promise({
    request: "iframe_set_lorebook_settings",
    settings: settings,
  });
}

interface GetCharLorebooksOption {
  name?: string;  // 要查询的角色卡名称; 不指明则为当前角色卡
};

interface CharLorebooks {
  primary: string | null;
  additional: string[];
}

/**
 * 获取角色卡绑定的世界书
 *
 * @param option 可选选项
 *   - `name?:string`: 要查询的角色卡名称; 默认为当前角色卡
 *
 * @returns 一个 CharLorebook 数组
 */
async function getCharLorebooks(option: GetCharLorebooksOption = {}): Promise<CharLorebooks> {
  option = {
    name: option.name,
  } as Required<GetCharLorebooksOption>;
  return detail.make_iframe_promise({
    request: "iframe_get_char_lorebooks",
    option: option
  });
}

/**
 * 获取当前角色卡绑定的主要世界书
 *
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 `null`
 */
async function getCurrentCharPrimaryLorebook(): Promise<string | null> {
  return (await getCharLorebooks()).primary;
}

/**
 * 将当前角色卡换为绑定 `lorebooks`, 取消原来所有世界书的绑定
 *
 * @param lorebooks 要新绑定的世界书, 不指明 primary 或 additional 字段则表示不变
 */
async function setCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void> {
  return detail.make_iframe_promise({
    request: 'iframe_set_char_lorebooks',
    lorebooks: lorebooks,
  });
}

/**
 * 获取或创建当前聊天绑定的世界书
 *
 * @returns 聊天世界书的名称
 */
async function getOrCreateChatLorebook(): Promise<string> {
  return triggerSlashWithResult("/getchatbook") as Promise<string>;
}

/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
async function getLorebooks(): Promise<string[]> {
  return detail.make_iframe_promise({
    request: "iframe_get_lorebooks",
  });
}

/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
async function createLorebook(lorebook: string): Promise<boolean> {
  return detail.make_iframe_promise({
    request: "iframe_create_lorebook",
    lorebook: lorebook,
  });
}

/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
async function deleteLorebook(lorebook: string): Promise<boolean> {
  return detail.make_iframe_promise({
    request: "iframe_delete_lorebook",
    lorebook: lorebook,
  });;
}
