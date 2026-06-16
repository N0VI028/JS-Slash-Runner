type PersonaConnection = {
  type: 'character' | 'group';
  id: string;
};

type Persona = {
  avatar_id: string;
  avatar: `${string}.png` | Blob;
  name: string;
  title: string;
  description: string;
  position: number;
  depth: number;
  role: number;
  lorebook: string;
  connections: PersonaConnection[];
  is_default: boolean;
};

type ReplacePersonaOptions = {
  /** 酒馆网页应该防抖渲染 persona 管理列表 (debounced)、立即渲染 (immediate) 还是不刷新前端显示 (none)? 默认为防抖渲染 */
  render?: 'debounced' | 'immediate' | 'none';
};

/**
 * 获取 persona 名称列表
 *
 * @returns persona 名称列表
 */
declare function getPersonaNames(): string[];

/**
 * 获取 persona 头像 id 列表
 *
 * @returns persona 头像 id 列表
 */
declare function getPersonaIds(): string[];

/**
 * 获取当前 persona 名称
 *
 * @returns 当前 persona 名称, 如果当前没有 persona, 则返回 `null`
 */
declare function getCurrentPersonaName(): string | null;

/**
 * 获取当前 persona 头像 id
 *
 * @returns 当前 persona 头像 id, 如果当前没有 persona, 则返回 `null`
 */
declare function getCurrentPersonaId(): string | null;

/**
 * 获取 persona 的头像路径
 *
 * @param persona_id persona 名称、头像 id 或 `'current'`
 *
 * @returns persona 头像路径, 如果 persona 不存在或名称不唯一, 则返回 `null`
 */
declare function getPersonaAvatarPath(persona_id?: TypeFest.LiteralUnion<'current', string>): string | null;

/**
 * 获取 persona 的内容
 *
 * @param persona_id persona 名称、头像 id 或 `'current'`
 *
 * @returns persona 内容
 *
 * @throws 如果 persona 不存在或名称不唯一, 将会抛出异常
 */
declare function getPersona(persona_id: TypeFest.LiteralUnion<'current', string>): Persona;

/**
 * 新建 persona
 *
 * @param persona_name persona 名称
 * @param persona persona 数据; 不填则使用默认头像和默认描述设置
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染、立即渲染还是不刷新前端显示
 *
 * @returns 是否成功创建, 如果已经存在同名 persona、同头像 id persona 或尝试创建名为 `'current'` 的 persona 会失败
 *
 * @throws 如果访问后端失败, 将会抛出异常
 */
declare function createPersona(
  persona_name: Exclude<string, 'current'>,
  persona?: TypeFest.PartialDeep<Persona>,
  options?: ReplacePersonaOptions,
): Promise<boolean>;

/**
 * 创建或替换名为 `persona_name` 的 persona
 *
 * @param persona_name persona 名称或头像 id
 * @param persona persona 数据; 不填则使用默认头像和默认描述设置
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染、立即渲染还是不刷新前端显示
 *
 * @returns 如果发生创建, 则返回 `true`; 如果发生替换, 则返回 `false`
 *
 * @throws 如果 persona 名称不唯一, 将会抛出异常
 * @throws 如果访问后端失败, 将会抛出异常
 */
declare function createOrReplacePersona(
  persona_name: Exclude<string, 'current'>,
  persona?: TypeFest.PartialDeep<Persona>,
  options?: ReplacePersonaOptions,
): Promise<boolean>;

/**
 * 删除 persona
 *
 * @param persona_id persona 名称、头像 id 或 `'current'`
 *
 * @returns 是否成功删除, 可能因 persona 不存在或名称不唯一等原因而失败
 *
 * @throws 如果访问后端失败, 将会抛出异常
 */
declare function deletePersona(persona_id: TypeFest.LiteralUnion<'current', string>): Promise<boolean>;

/**
 * 完全替换 persona 的内容
 *
 * @param persona_id persona 名称、头像 id 或 `'current'`
 * @param persona persona 数据
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染、立即渲染还是不刷新前端显示
 *
 * @throws 如果 persona 不存在或名称不唯一, 将会抛出异常
 * @throws 如果访问后端失败, 将会抛出异常
 *
 * @example
 * const persona = getPersona('玩家');
 * persona.description = '新的玩家描述';
 * await replacePersona('玩家', persona);
 */
declare function replacePersona(
  persona_id: TypeFest.LiteralUnion<'current', string>,
  persona: TypeFest.PartialDeep<Persona>,
  options?: ReplacePersonaOptions,
): Promise<void>;

type PersonaUpdater = ((persona: Persona) => Persona) | ((persona: Persona) => Promise<Persona>);

/**
 * 用 `updater` 函数更新 persona
 *
 * @param persona_id persona 名称、头像 id 或 `'current'`
 * @param updater 用于更新 persona 的函数. 它应该接收 persona 内容作为参数, 并返回更新后的 persona 内容.
 * @param options 可选选项
 *   - `render:'debounced'|'immediate'|'none'`: 酒馆网页应该防抖渲染、立即渲染还是不刷新前端显示
 *
 * @returns 更新后的 persona 内容
 *
 * @throws 如果 persona 不存在或名称不唯一, 将会抛出异常
 * @throws 如果访问后端失败, 将会抛出异常
 *
 * @example
 * await updatePersonaWith('玩家', persona => {
 *   persona.title = '旁白显示标题';
 *   return persona;
 * });
 */
declare function updatePersonaWith(
  persona_id: TypeFest.LiteralUnion<'current', string>,
  updater: PersonaUpdater,
  options?: ReplacePersonaOptions,
): Promise<Persona>;
