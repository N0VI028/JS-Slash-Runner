type Character = {
  avatar: `${string}.png` | Blob;
  version: string;
  creator: string;
  creator_notes: string;

  worldbook: string | null;
  description: string;
  first_messages: string[];

  extensions: {
    regex_scripts: TavernRegex[];
    tavern_helper: {
      scripts: Record<string, any>[];
      variables: Record<string, any>;
    };
    [other: string]: any;
  };
};

/**
 * 获取角色卡名称列表
 *
 * @returns 角色卡名称列表
 */
declare function getCharacterNames(): string[];

/**
 * 获取当前角色卡名称
 *
 * @returns 当前角色卡名称, 如果当前没有角色卡, 则返回 `null`
 */
declare function getCurrentCharacterName(): string | null;

/**
 * 新建 `character_name` 角色卡, 内容为 `character`
 *
 * @param character_name 角色卡名称
 * @param character 角色卡数据; 不填则使用默认数据
 *
 * @returns 是否成功创建, 如果已经存在同名角色卡或尝试创建名为 `'current'` 的角色卡会失败
 *
 * @throws 如果访问后端失败, 将会抛出异常
 */
declare function createCharacter(
  character_name: Exclude<string, 'current'>,
  character?: PartialDeep<Character>,
): Promise<boolean>;

/**
 * 创建或替换名为 `character_name` 的角色卡, 内容为 `character`
 *
 * @param character_name 角色卡名称
 * @param character 角色卡数据; 不填则使用默认数据
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为性能更好的防抖渲染
 *
 * @returns 如果发生创建, 则返回 `true`; 如果发生替换, 则返回 `false`
 *
 * @throws 如果访问后端失败, 将会抛出异常
 */
declare function createOrReplaceCharacter(
  character_name: Exclude<string, 'current'>,
  character?: PartialDeep<Character>,
  options?: ReplaceCharacterOptions,
): Promise<boolean>;

/**
 * 删除 `character_name` 角色卡
 *
 * @param character_name 角色卡名称
 *
 * @returns 是否成功删除, 可能因角色卡不存在等原因而失败
 */
declare function deleteCharacter(character_name: LiteralUnion<'current', string>): Promise<boolean>;

/**
 * 获取 `character_name` 角色卡的内容
 *
 * @param character_name 角色卡名称
 *
 * @returns 角色卡内容
 *
 * @throws 如果角色卡不存在, 将会抛出异常
 */
declare function getCharacter(character_name: LiteralUnion<'current', string>): Promise<Character>;

type ReplaceCharacterOptions = {
  /** 酒馆网页应该防抖渲染 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为性能更好的防抖渲染 */
  render?: 'debounced' | 'immediate' | 'none';
};

/**
 * 完全替换 `character_name` 角色卡的内容为 `character`
 *
 * @param character_name 角色卡名称
 * @param character 角色卡数据
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为性能更好的防抖渲染
 *
 * @throws 如果角色卡不存在, 将会抛出异常
 * @throws 如果访问后端失败, 将会抛出异常
 *
 * @example
 * // 为角色卡更改开场白
 * const character = await getCharacter('角色卡名称');
 * character.first_messages = ['新的开场白1', '新的开场白2'];
 * await replaceCharacter('角色卡名称', character);
 *
 * @example
 * // 清空角色卡的局部正则
 * const character = await getCharacter('角色卡名称');
 * character.extensions.regex_scripts = [];
 * await replaceCharacter('角色卡名称', character);
 *
 * @example
 * // 更换角色卡头像
 * const character = await getCharacter('角色卡名称');
 * character.avatar = await fetch('https://example.com/avatar.png').then(response => response.blob());
 * await replaceCharacter('角色卡名称', character);
 */
declare function replaceCharacter(
  character_name: Exclude<string, 'current'>,
  character: PartialDeep<Character>,
  options?: ReplaceCharacterOptions,
): Promise<void>;

type CharacterUpdater = ((character: Character) => Character) | ((character: Character) => Promise<Character>);

/**
 * 用 `updater` 函数更新 `character_name` 角色卡
 *
 * @param character_name 角色卡名称
 * @param updater 用于更新角色卡的函数. 它应该接收角色卡内容作为参数, 并返回更新后的角色卡内容.
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 如果对角色卡进行操作, 应该防抖渲染 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为性能更好的防抖渲染
 *
 * @returns 更新后的角色卡内容
 *
 * @throws 如果角色卡不存在, 将会抛出异常
 * @throws 如果访问后端失败, 将会抛出异常
 *
 * @example
 * // 为角色卡添加一个开场白
 * await updateCharacterWith('角色卡名称', character => {
 *   character.first_messages.push('新的开场白');
 *   return character;
 * });
 *
 * @example
 * // 清空角色卡的局部正则
 * await updateCharacterWith('角色卡名称', character => {
 *   character.extensions.regex_scripts = [];
 *   return character;
 * });
 *
 * @example
 * // 更换角色卡头像
 * await updateCharacterWith('角色卡名称', async character => {
 *   character.avatar = await fetch('https://example.com/avatar.png').then(response => response.blob());
 *   return character;
 * });
 */
declare function updateCharacterWith(
  character_name: LiteralUnion<'current', string>,
  updater: CharacterUpdater,
): Promise<Character>;
