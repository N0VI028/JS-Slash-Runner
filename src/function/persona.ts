import {
  chat_metadata,
  default_user_avatar,
  getRequestHeaders,
  saveMetadata,
  saveSettingsDebounced,
  setUserName,
} from '@sillytavern/script';
import { getUserAvatar, getUserAvatars, setUserAvatar, user_avatar } from '@sillytavern/scripts/personas';
import { persona_description_positions, power_user } from '@sillytavern/scripts/power-user';
import isBlob from 'is-blob';
import { LiteralUnion, PartialDeep } from 'type-fest';

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

type PersonaDescriptor = {
  description?: string;
  position?: number;
  depth?: number;
  role?: number;
  lorebook?: string;
  connections?: PersonaConnection[];
  title?: string;
};

type ReplacePersonaOptions = {
  render?: 'debounced' | 'immediate' | 'none';
};

const DEFAULT_DEPTH = 2;
const DEFAULT_ROLE = 0;

/**
 * 获取 persona 的名称列表
 */
export function getPersonaNames(): string[] {
  return Object.values(power_user.personas).map(String);
}

/**
 * 获取 persona 的头像 id 列表
 */
export function getPersonaIds(): string[] {
  return Object.keys(power_user.personas);
}

/**
 * 获取当前 persona 的名称
 */
export function getCurrentPersonaName(): string | null {
  return user_avatar ? (power_user.personas[user_avatar] ?? null) : null;
}

/**
 * 获取当前 persona 的头像 id
 */
export function getCurrentPersonaId(): string | null {
  return user_avatar || null;
}

/**
 * 根据名称查找 persona 头像 id
 */
function findPersonaIdsByName(name: string): string[] {
  const lowered_name = name.toLowerCase();
  return Object.entries(power_user.personas)
    .filter(([, persona_name]) => String(persona_name).toLowerCase() === lowered_name)
    .map(([avatar_id]) => avatar_id);
}

/**
 * 根据名称或头像 id 查找唯一 persona
 */
function findPersonaId(persona_id: LiteralUnion<'current', string>): string | null {
  if (!persona_id || persona_id === 'current') {
    return user_avatar || null;
  }
  if (power_user.personas[persona_id] !== undefined) {
    return persona_id;
  }

  const matches = findPersonaIdsByName(persona_id);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * 生成新 persona 使用的头像 id
 */
function makePersonaAvatarId(persona_name: string): `${string}.png` {
  const safe_name = persona_name.replace(/[^a-zA-Z0-9]/g, '') || 'persona';
  return `${Date.now()}-${safe_name}.png`;
}

/**
 * 获取 persona 描述对象的默认值
 */
function getDefaultDescriptor(): Required<PersonaDescriptor> {
  return {
    description: '',
    position: persona_description_positions.IN_PROMPT,
    depth: DEFAULT_DEPTH,
    role: DEFAULT_ROLE,
    lorebook: '',
    connections: [],
    title: '',
  };
}

/**
 * 把酒馆 persona 数据转换为接口数据
 */
function toPersona(avatar_id: string): Persona {
  const descriptor = { ...getDefaultDescriptor(), ...power_user.persona_descriptions[avatar_id] };

  return {
    avatar_id,
    avatar: avatar_id as `${string}.png`,
    name: String(power_user.personas[avatar_id] ?? ''),
    title: descriptor.title,
    description: descriptor.description,
    position: descriptor.position,
    depth: descriptor.depth,
    role: descriptor.role,
    lorebook: descriptor.lorebook,
    connections: klona(descriptor.connections),
    is_default: power_user.default_persona === avatar_id,
  };
}

/**
 * 根据局部更新合成 persona 描述对象
 */
function toPersonaDescriptor(persona: PartialDeep<Persona>, old_data?: PersonaDescriptor): Required<PersonaDescriptor> {
  const old_descriptor = { ...getDefaultDescriptor(), ...old_data };
  return {
    description: persona.description ?? old_descriptor.description,
    position: persona.position ?? old_descriptor.position,
    depth: persona.depth ?? old_descriptor.depth,
    role: persona.role ?? old_descriptor.role,
    lorebook: persona.lorebook ?? old_descriptor.lorebook,
    connections: persona.connections ?? old_descriptor.connections,
    title: persona.title ?? old_descriptor.title,
  };
}

/**
 * 获取可上传头像的二进制文件
 */
async function getAvatarFile(avatar: `${string}.png` | Blob | undefined, avatar_id: string): Promise<File> {
  if (isBlob(avatar)) {
    return new File([avatar], avatar_id);
  }

  const source = avatar ? getUserAvatar(avatar) : default_user_avatar;
  const blob = await fetch(source).then(response => response.blob());
  return new File([blob], avatar_id, { type: blob.type || 'image/png' });
}

/**
 * 获取后端现有 persona 头像 id 列表
 */
async function getExistingAvatarIds(): Promise<string[]> {
  const avatars = await getUserAvatars(false);
  if (!Array.isArray(avatars)) {
    throw new Error('获取 persona 头像列表失败');
  }
  return avatars;
}

/**
 * 判断头像参数是否表示复用当前头像文件
 */
function shouldReuseExistingAvatar(avatar: `${string}.png` | Blob | undefined, avatar_id: string): boolean {
  return !avatar || avatar === avatar_id;
}

/**
 * 上传或补齐 persona 头像文件
 */
async function ensurePersonaAvatar(avatar_id: string, avatar?: `${string}.png` | Blob): Promise<void> {
  if (shouldReuseExistingAvatar(avatar, avatar_id)) {
    const avatars = await getExistingAvatarIds();
    if (avatars.includes(avatar_id)) {
      return;
    }
  }

  const form_data = new FormData();
  form_data.append('avatar', await getAvatarFile(avatar, avatar_id));
  form_data.append('overwrite_name', avatar_id);

  const response = await fetch('/api/avatars/upload', {
    method: 'POST',
    headers: getRequestHeaders({ omitContentType: true }),
    cache: 'no-cache',
    body: form_data,
  });

  if (!response.ok) {
    throw new Error(`上传 persona 头像 '${avatar_id}' 失败: (${response.status}) ${await response.text()}`);
  }
}

/**
 * 同步当前 persona 的前端状态
 */
function syncCurrentPersona(avatar_id: string, descriptor: Required<PersonaDescriptor>): void {
  if (avatar_id !== user_avatar) {
    return;
  }

  power_user.persona_description = descriptor.description;
  power_user.persona_description_position = descriptor.position;
  power_user.persona_description_depth = descriptor.depth;
  power_user.persona_description_role = descriptor.role;
  power_user.persona_description_lorebook = descriptor.lorebook;
  setUserName(power_user.personas[avatar_id], { toastPersonaNameChange: false });
}

/**
 * 写入 persona 的名称和描述数据
 */
function writePersona(avatar_id: string, persona: PartialDeep<Persona>, old_data?: PersonaDescriptor): void {
  const descriptor = toPersonaDescriptor(persona, old_data);
  power_user.personas[avatar_id] = persona.name ?? power_user.personas[avatar_id] ?? avatar_id;
  power_user.persona_descriptions[avatar_id] = descriptor;

  if (persona.is_default !== undefined) {
    power_user.default_persona = persona.is_default
      ? avatar_id
      : power_user.default_persona === avatar_id
        ? null
        : power_user.default_persona;
  }

  syncCurrentPersona(avatar_id, descriptor);
  saveSettingsDebounced();
}

/**
 * 删除 persona 的设置数据
 */
async function removePersonaData(avatar_id: string): Promise<void> {
  delete power_user.personas[avatar_id];
  delete power_user.persona_descriptions[avatar_id];
  if (power_user.default_persona === avatar_id) {
    power_user.default_persona = null;
  }
  if (chat_metadata['persona'] === avatar_id) {
    delete chat_metadata['persona'];
    await saveMetadata();
  }
  saveSettingsDebounced();
}

/**
 * 当前 persona 被删除后选择下一个可用 persona
 */
async function selectNextPersonaIfNeeded(avatar_id: string): Promise<void> {
  if (avatar_id !== user_avatar) {
    return;
  }

  const next_avatar = Object.keys(power_user.personas)[0];
  if (next_avatar) {
    await setUserAvatar(next_avatar, { toastPersonaNameChange: false, navigateToCurrent: true });
  }
}

/**
 * 渲染 persona 管理列表
 */
async function renderPersona(avatar_id: string, { render = 'debounced' }: ReplacePersonaOptions = {}): Promise<void> {
  switch (render) {
    case 'debounced':
      renderPersonaDebounced(avatar_id);
      break;
    case 'immediate':
      await getUserAvatars(true, avatar_id);
      break;
    case 'none':
      break;
  }
}

const renderPersonaDebounced = _.debounce((avatar_id: string) => void getUserAvatars(true, avatar_id), 1000);

/**
 * 获取 persona 的头像路径
 */
export function getPersonaAvatarPath(persona_id: LiteralUnion<'current', string> = 'current'): string | null {
  const avatar_id = findPersonaId(persona_id);
  return avatar_id ? `./User Avatars/${avatar_id}` : null;
}

/**
 * 获取 persona 的内容
 */
export function getPersona(persona_id: LiteralUnion<'current', string>): Persona {
  const avatar_id = findPersonaId(persona_id);
  if (!avatar_id) {
    throw Error(`persona '${persona_id}' 不存在或名称不唯一`);
  }

  return klona(toPersona(avatar_id));
}

/**
 * 新建 persona
 */
export async function createPersona(
  persona_name: Exclude<string, 'current'>,
  persona: PartialDeep<Persona> = {},
  options: ReplacePersonaOptions = {},
): Promise<boolean> {
  const avatar_id = persona.avatar_id ?? makePersonaAvatarId(persona_name);
  if (
    persona_name === 'current' ||
    power_user.personas[avatar_id] !== undefined ||
    findPersonaIdsByName(persona_name).length > 0
  ) {
    return false;
  }

  await ensurePersonaAvatar(avatar_id, persona.avatar);
  writePersona(avatar_id, { ...persona, name: persona_name });
  await renderPersona(avatar_id, options);
  return true;
}

/**
 * 创建或替换 persona
 */
export async function createOrReplacePersona(
  persona_name: Exclude<string, 'current'>,
  persona: PartialDeep<Persona> = {},
  options: ReplacePersonaOptions = {},
): Promise<boolean> {
  const avatar_id = findPersonaId(persona_name);
  if (!avatar_id) {
    if (findPersonaIdsByName(persona_name).length > 1) {
      throw Error(`persona '${persona_name}' 不存在或名称不唯一`);
    }
    return await createPersona(persona_name, persona, options);
  }

  await replacePersona(avatar_id, persona, options);
  return false;
}

/**
 * 删除 persona
 */
export async function deletePersona(persona_id: LiteralUnion<'current', string>): Promise<boolean> {
  const avatar_id = findPersonaId(persona_id);
  if (!avatar_id) {
    return false;
  }

  const response = await fetch('/api/avatars/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ avatar: avatar_id }),
  });

  if (!response.ok) {
    throw new Error(`删除 persona '${persona_id}' 失败: (${response.status}) ${await response.text()}`);
  }

  await removePersonaData(avatar_id);
  await getUserAvatars(true);
  await selectNextPersonaIfNeeded(avatar_id);
  return true;
}

/**
 * 完全替换 persona 的内容
 */
export async function replacePersona(
  persona_id: LiteralUnion<'current', string>,
  persona: PartialDeep<Persona>,
  options: ReplacePersonaOptions = {},
): Promise<void> {
  const avatar_id = findPersonaId(persona_id);
  if (!avatar_id) {
    throw Error(`persona '${persona_id}' 不存在或名称不唯一`);
  }

  await ensurePersonaAvatar(avatar_id, persona.avatar);
  writePersona(avatar_id, persona, power_user.persona_descriptions[avatar_id]);
  await renderPersona(avatar_id, options);
}

type PersonaUpdater = ((persona: Persona) => Persona) | ((persona: Persona) => Promise<Persona>);

/**
 * 用 updater 函数更新 persona
 */
export async function updatePersonaWith(
  persona_id: LiteralUnion<'current', string>,
  updater: PersonaUpdater,
  options: ReplacePersonaOptions = {},
): Promise<Persona> {
  const persona = await updater(getPersona(persona_id));
  await replacePersona(persona_id, persona, options);
  return persona;
}
