/**
 * 获取世界书名称列表
 *
 * @returns 世界书名称列表
 */
declare function getWorldbookNames(): string[];

/**
 * 获取当前全局开启的世界书名称列表
 *
 * @returns 全局世界书名称列表
 */
declare function getGlobalWorldbookNames(): string[];
/**
 * 重新绑定全局世界书
 *
 * @param worldbook_names 要全局开启的世界书
 */
declare function rebindGlobalWorldbooks(worldbook_names: string[]): Promise<void>;

type CharWorldbooks = {
  primary: string | null;
  additional: string[];
};
/**
 * 获取角色卡绑定的世界书
 *
 * @param character_name 要查询的角色卡名称, 'current' 表示当前打开的角色卡
 *
 * @returns 角色卡绑定的世界书
 */
declare function getCharWorldbookNames(character_name: LiteralUnion<'current' | string>): CharWorldbooks;
/**
 * 重新绑定角色卡世界书
 *
 * @param character_name 角色卡名称, 'current' 表示当前打开的角色卡
 * @param char_worldbooks 要对该角色卡绑定的世界书
 */
declare function rebindCharWorldbooks(character_name: 'current', char_worldbooks: CharWorldbooks): Promise<void>;

/**
 * 获取聊天文件绑定的世界书
 *
 * @param chat_name 聊天文件名称
 *
 * @returns 聊天文件绑定的世界书, 如果没有则为 `null`
 */
declare function getChatWorldbookName(chat_name: 'current'): string | null;
/**
 * 重新绑定聊天文件世界书
 *
 * @param character_name 聊天文件名称, 'current' 表示当前打开的聊天
 * @param char_worldbooks 要对该聊天文件绑定的世界书
 */
declare function rebindChatWorldbook(chat_name: 'current', worldbook_name: string): Promise<void>;
/**
 * 获取或新建聊天文件世界书
 *
 * @param chat_name 聊天文件名称, 'current' 表示当前打开的聊天
 * @param worldbook_name 世界书名称; 不填则根据当前时间创建
 */
declare function getOrCreateChatWorldbook(chat_name: 'current', worldbook_name?: string): Promise<string>;

type WorldbookEntry = {
  /** uid 是相对于世界书内部的, 不要跨世界书使用 */
  uid: number;
  name: string;
  enabled: boolean;

  /** 激活策略: 条目应该何时激活 */
  strategy: {
    /**
     * 激活策略类型:
     * - `'constant'`: 常量🔵, 俗称蓝灯. 只需要满足 "启用"、"激活概率%" 等别的要求即可.
     * - `'selective'`: 可选项🟢, 俗称绿灯. 除了蓝灯条件, 还需要满足 `keys` 扫描条件
     * - `'vectorized'`: 向量化🔗. 一般不使用
     */
    type: 'constant' | 'selective' | 'vectorized';
    /** 主要关键字. 绿灯条目必须在欲扫描文本中扫描到其中任意一个关键字才能激活 */
    keys: (string | RegExp)[];
    /**
     * 次要关键字. 如果次要关键字的 `keys` 数组不为空, 则条目除了在主要关键字中匹配到任意一个关键字外, 还需要满足 `logic`:
     * - `'and_any'`: 次要关键字中任意一个关键字能在欲扫描文本中匹配到
     * - `'and_all'`: 次要关键字中所有关键字都能在欲扫描文本中匹配到
     * - `'not_all'`: 次要关键字中至少有一个关键字没能在欲扫描文本中匹配到
     * - `'not_any'`: 次要关键字中所有关键字都没能欲扫描文本中匹配到
     */
    keys_secondary: { logic: 'and_any' | 'and_all' | 'not_all' | 'not_any'; keys: (string | RegExp)[] };
    /** 扫描深度: 1 为仅扫描最后一个楼层, 2 为扫描最后两个楼层, 以此类推 */
    scan_depth: 'same_as_global' | number;
  };
  /** 插入位置: 如果条目激活应该插入到什么地方 */
  position: {
    /**
     * 位置类型:
     * - `'before_character_definition'`: 角色定义之前
     * - `'after_character_definition'`: 角色定义之后
     * - `'before_example_messages'`: 示例消息之前
     * - `'after_example_messages'`: 示例消息之后
     * - `'before_author_note'`: 作者注释之前
     * - `'after_author_note'`: 作者注释之后
     * - `'at_depth'`: 插入到指定深度
     */
    type:
      | 'before_character_definition'
      | 'after_character_definition'
      | 'before_example_messages'
      | 'after_example_messages'
      | 'before_author_note'
      | 'after_author_note'
      | 'at_depth'
      | 'outlet';
    /** 该条目的消息身份, 仅位置类型为 `'at_depth'` 时有效 */
    role: 'system' | 'assistant' | 'user';
    /** 该条目要插入的深度, 仅位置类型为 `'at_depth'` 时有效 */
    depth: number;
    // TODO: 世界书条目的插入: 文档链接
    order: number;
  };

  content: string;

  probability: number;
  /** 递归表示某世界书条目被激活后, 该条目的提示词又激活了其他条目 */
  recursion: {
    /** 禁止其他条目递归激活本条目 */
    prevent_incoming: boolean;
    /** 禁止本条目递归激活其他条目 */
    prevent_outgoing: boolean;
    /** 延迟到第 n 级递归检查时才能激活本条目 */
    delay_until: null | number;
  };
  effect: {
    /** 黏性: 条目激活后, 在之后 n 条消息内始终激活, 无视激活策略、激活概率% */
    sticky: null | number;
    /** 冷却: 条目激活后, 在之后 n 条消息内不能再激活 */
    cooldown: null | number;
    /** 延迟: 聊天中至少有 n 楼消息时, 才能激活条目 */
    delay: null | number;
  };

  /** 额外字段, 用于为世界书条目绑定额外数据 */
  extra?: Record<string, any>;
};

/**
 * 获取 `worldbook_name` 世界书的内容
 *
 * @param worldbook_name 世界书名称
 *
 * @returns 世界书内容
 *
 * @throws 如果世界书不存在, 将会抛出错误
 */
declare function getWorldbook(worldbook_name: string): Promise<WorldbookEntry[]>;

/**
 * 创建新的世界书
 *
 * @param worldbook_name 世界书名称
 * @param worldbook 世界书内容; 不填则没有任何条目
 *
 * @returns 如果发生创建, 则返回 `true`; 如果发生替换, 则返回 `false`
 */
declare function createWorldbook(worldbook_name: string, worldbook?: WorldbookEntry[]): Promise<boolean>;

/**
 * 创建或替换名为 `worldbook_name` 的世界书, 内容为 `worldbook`
 *
 * @param worldbook_name 世界书名称
 * @param worldbook 世界书内容; 不填则没有任何条目
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为性能更好的防抖渲染
 *
 * @returns 如果发生创建, 则返回 `true`; 如果发生替换, 则返回 `false`
 */
declare function createOrReplaceWorldbook(
  worldbook_name: string,
  worldbook?: PartialDeep<WorldbookEntry>[],
  { render }?: ReplaceWorldbookOptions,
): Promise<boolean>;

/**
 * 删除 `worldbook_name` 世界书
 *
 * @param worldbook_name 世界书名称
 *
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
declare function deleteWorldbook(worldbook_name: string): Promise<boolean>;

// TODO: rename 需要处理世界书绑定
// export function renameWorldbook(old_name: string, new_name: string): boolean;

interface ReplaceWorldbookOptions {
  /** 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染 */
  render?: 'debounced' | 'immediate';
}
/**
 * 完全替换 `worldbook_name` 世界书的内容为 `worldbook`
 *
 * @param worldbook_name 世界书名称
 * @param worldbook 世界书内容
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @throws 如果世界书不存在, 将会抛出错误
 *
 * @example
 * // 禁止所有条目递归, 保持其他设置不变
 * const worldbook = await getWorldbook("eramgt少女歌剧");
 * await replaceWorldbook(
 *   'eramgt少女歌剧',
 *   worldbook.map(entry => ({
 *     ...entry,
 *     recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
 *   })),
 * );
 *
 * @example
 * // 删除所有名字中包含 `'神乐光'` 的条目
 * const worldbook = await getWorldbook("eramgt少女歌剧");
 * _.remove(worldbook, entry => entry.name.includes('神乐光'));
 * await replaceWorldbook("eramgt少女歌剧", worldbook);
 */
declare function replaceWorldbook(
  worldbook_name: string,
  worldbook: PartialDeep<WorldbookEntry>[],
  { render }?: ReplaceWorldbookOptions,
): Promise<void>;

type WorldbookUpdater =
  | ((worldbook: WorldbookEntry[]) => PartialDeep<WorldbookEntry>[])
  | ((worldbook: WorldbookEntry[]) => Promise<PartialDeep<WorldbookEntry>[]>);
/**
 * 用 `updater` 函数更新世界书 `worldbook_name`
 *
 * @param worldbook_name 世界书名称
 * @param updater 用于更新世界书的函数. 它应该接收世界书条目作为参数, 并返回更新后的世界书条目
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的世界书条目
 *
 * @throws 如果世界书不存在, 将会抛出错误
 *
 * @example
 * // 禁止所有条目递归, 保持其他设置不变
 * await updateWorldbookWith('eramgt少女歌剧', worldbook => {
 *   return worldbook.map(entry => ({
 *     ...entry,
 *     recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
 *   }));
 * });
 *
 * @example
 * // 删除所有名字中包含 "神乐光" 的条目
 * await updateWorldbookWith('eramgt少女歌剧', worldbook => {
 *   _.remove(worldbook, entry => entry.name.includes('神乐光'));
 *   return worldbook;
 * });
 */
declare function updateWorldbookWith(
  worldbook_name: string,
  updater: WorldbookUpdater,
  { render }?: ReplaceWorldbookOptions,
): Promise<WorldbookEntry[]>;

/**
 * 向世界书中新增条目
 *
 * @param worldbook_name 世界书名称
 * @param new_entries 要新增的条目, 对于不设置的字段将会采用酒馆给的默认值
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的世界书条目, 以及新增条目补全字段后的结果
 *
 * @throws 如果世界书不存在, 将会抛出错误
 *
 * @example
 * // 创建两个条目, 一个标题叫 `'神乐光'`, 一个留白
 * const { worldbook, new_entries } = await createWorldbookEntries('eramgt少女歌剧', [{ name: '神乐光' }, {}]);
 */
declare function createWorldbookEntries(
  worldbook_name: string,
  new_entries: PartialDeep<WorldbookEntry>[],
  { render }?: ReplaceWorldbookOptions,
): Promise<{ worldbook: WorldbookEntry[]; new_entries: WorldbookEntry[] }>;

/**
 * 删除世界书中的条目
 *
 * @param worldbook_name 世界书名称
 * @param predicate 判断函数, 如果返回 `true` 则删除该条目
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'`: 对于对世界书的更改, 世界书编辑器应该防抖渲染 (debounced) 还是立即渲染 (immediate)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的世界书条目, 以及被删除的条目
 *
 * @throws 如果世界书不存在, 将会抛出错误
 *
 * @example
 * // 删除所有名字中包含 `'神乐光'` 的条目
 * const { worldbook, deleted_entries } = await deleteWorldbookEntries('eramgt少女歌剧', entry => entry.name.includes('神乐光'));
 */
declare function deleteWorldbookEntries(
  worldbook_name: string,
  predicate: (entry: WorldbookEntry) => boolean,
  { render }?: ReplaceWorldbookOptions,
): Promise<{ worldbook: WorldbookEntry[]; deleted_entries: WorldbookEntry[] }>;
