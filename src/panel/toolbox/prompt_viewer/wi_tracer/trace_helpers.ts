/**
 * 提示词查看器
 * 提供注入计数、深度枚举、消息定位、状态快照及分段工具。
 */
import { extension_prompt_types, extension_prompts } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';
import { projectSpan } from './align';
import { textContent } from './pure_replay';
import { replayExtensionPromptPart } from './replay';
import type {
  DisplayMessage,
  DisplayTarget,
  ExtPromptPart,
  ExtPromptSnapshot,
  PresetEntrySnapshot,
  TraceContext,
  WiEntrySnapshot,
  WiTraceReport,
} from './types';

/** 溯源器运行时状态 */
export const tracer_state = {
  entries: null as WiEntrySnapshot[] | null,
  ext: [] as ExtPromptSnapshot[],
  type: 'normal' as string,
};

export type ExtPartReplay = {
  value: string;
  parts: ExtPromptPart[];
};

/** 单次溯源内的重放缓存 */
export const replay_cache = {
  ext_part: new Map<string, ExtPartReplay>(),
  blocks: new Map<number, Array<{ role: number; has_extension: boolean }>>(),
  preset: null as Array<Record<string, unknown>> | null,
};

export const ROLE_NAMES = ['system', 'user', 'assistant'] as const;

/**
 * extension_prompt_roles 枚举值 → 角色名
 * @param role 角色枚举值
 */
export function roleName(role: number): string {
  return ROLE_NAMES[role] ?? String(role);
}

/**
 * 同步快照当前扩展提示词
 * 溯源全程只读该快照，免疫生成终止后的清理
 */
export function snapshotExtensionPrompts(): ExtPromptSnapshot[] {
  return Object.entries(extension_prompts as Record<string, Partial<ExtPromptSnapshot>>).map(([key, prompt]) => ({
    key,
    ...prompt,
  }));
}

/**
 * 从快照中取指定 key 的扩展提示词值
 * @param key 提示词标识键
 */
export function extSnapshotValue(key: string): string {
  return String(tracer_state.ext.find(item => item.key === key)?.value ?? '');
}

/**
 * 在显示消息中定位指定标识符的目标消息
 * @param by_identifier 标识符索引 Map
 * @param identifier 目标标识符
 * @param role 目标角色名（可选）
 */
export function findDisplayTarget(
  by_identifier: Map<string, DisplayMessage[]>,
  identifier: string,
  role: string | null,
): DisplayTarget | null {
  const group = by_identifier.get(identifier);
  const direct = role === null ? group?.[0] : group?.find(item => item.info.role === role);
  if (direct) {
    const child = direct.children.find(item => item.info.identifier === identifier) ?? direct.children[0];
    if (child) return { display: direct, child };
  }
  return null;
}

/** 深度注入块定位所需的编号算术参数 */
export type DepthBlockTargetQuery = {
  by_identifier: Map<string, DisplayMessage[]>;
  /** display 中最大的 chatHistory-N 编号 */
  max_number: number;
  /** 实际聊天消息数（总编号 − 注入块总数） */
  chat_count: number;
  /** 该深度之前累计插入的注入块数 */
  before_count: number;
  depth: number;
  /** 目标块在该深度的块序列中的下标 */
  block_index: number;
  role: number;
};

/**
 * 按 populationInjectionPrompts 的编号算术定位某个注入块所在的显示消息
 * 世界书 atDepth 与预设绝对注入共用此寻址规则
 * @param query 定位参数
 */
export function resolveDepthBlockTarget(query: DepthBlockTargetQuery): DisplayTarget | null {
  const distance = query.before_count + query.block_index + Math.min(query.depth, query.chat_count);
  return findDisplayTarget(query.by_identifier, `chatHistory-${query.max_number - distance}`, roleName(query.role));
}

/** addSegment 的入参 */
export type SegmentInput = {
  index: number;
  start: number;
  text: string;
  entry?: WiEntrySnapshot;
  label: string;
  source?: 'wi' | 'preset' | 'card';
  presetEntry?: PresetEntrySnapshot;
  verified_override?: boolean;
};

/**
 * 插入一个定位段：先在 EJS 前的 display 内容上等值校验，
 * 校验通过后再把区间投影到 EJS 后的最终消息坐标系；任一环节失败即放弃该段
 * @param ctx 溯源上下文
 * @param input 定位段参数
 */
export function addSegment(ctx: TraceContext, input: SegmentInput): void {
  const display_item = ctx.display[input.index];
  if (!display_item) return;

  const pre = textContent(display_item.info.content);
  const end = input.start + input.text.length;
  if (input.verified_override !== true && pre.slice(input.start, end) !== input.text) return;

  const pair = ctx.pairs.get(input.index);
  const projected = pair ? projectSpan(pair.pre, pair.post, input.start, end) : null;
  if (!projected) return;

  ctx.report.segments.push({
    messageIndex: pair.messageIndex,
    start: projected.start,
    end: projected.end,
    entry: input.entry,
    presetEntry: input.presetEntry,
    source: input.source,
    positionLabel: input.label,
  });
}

/**
 * 重建当前预设集合
 */
export function getPresetCollection(): Array<Record<string, unknown>> {
  if (replay_cache.preset !== null) return replay_cache.preset;
  try {
    const pm = promptManager as unknown as {
      getPromptCollection?: (type: string) => { collection?: unknown[] };
    };
    const collection = pm?.getPromptCollection?.(tracer_state.type);
    const preset = (collection?.collection ?? []) as Array<Record<string, unknown>>;
    replay_cache.preset = preset;
    return preset;
  } catch {
    return [];
  }
}

/**
 * 获取指定深度处的绝对注入提示词
 * @param depth 目标深度
 */
export function absolutePromptsAt(depth: number): Array<Record<string, unknown>> {
  return getPresetCollection().filter(
    prompt => prompt?.injection_position === 1 && prompt?.content && Number(prompt.injection_depth ?? 0) === depth,
  );
}

/**
 * 获取存在绝对深度注入提示词的深度集合
 */
export function getAbsoluteInjectionDepths(): number[] {
  return getPresetCollection()
    .filter(prompt => prompt?.injection_position === 1 && prompt?.content)
    .map(prompt => Number(prompt.injection_depth ?? 0));
}

/**
 * 检查某深度某角色是否存在默认优先级(order=100)的绝对注入
 * @param depth 目标深度
 * @param role 角色枚举值
 */
export function hasAbsolutePrompts(depth: number, role: number): boolean {
  return absolutePromptsAt(depth).some(
    prompt => String(prompt.injection_order ?? '100') === '100' && prompt.role === roleName(role),
  );
}

/**
 * 获取非 100 优先级的绝对注入块
 * 镜像 order 降序、role 升序规则
 * @param depth 目标深度
 */
export function getExtraOrderBlocks(depth: number): Array<{ role: number; has_extension: boolean }> {
  const combos = new Set(
    absolutePromptsAt(depth)
      .filter(
        prompt =>
          String(prompt.injection_order ?? '100') !== '100' &&
          typeof prompt.role === 'string' &&
          ROLE_NAMES.includes(prompt.role as (typeof ROLE_NAMES)[number]),
      )
      .map(prompt => `${prompt.injection_order}:${prompt.role}`),
  );

  return [...combos]
    .map(combo => {
      const [order, role_name] = combo.split(':');
      return { order: Number(order), role: ROLE_NAMES.indexOf(role_name as (typeof ROLE_NAMES)[number]) };
    })
    .sort((a, b) => b.order - a.order || a.role - b.role)
    .map(({ role }) => ({ role, has_extension: false }));
}

/**
 * 收集存在注入内容的深度集合
 */
export function getRelevantDepths(): number[] {
  const depths = new Set<number>();
  for (const prompt of tracer_state.ext) {
    if (prompt?.position == extension_prompt_types.IN_CHAT && prompt.value && prompt.depth !== undefined) {
      depths.add(Number(prompt.depth));
    }
  }
  for (const depth of getAbsoluteInjectionDepths()) depths.add(depth);
  return [...depths].filter(depth => depth >= 0).sort((a, b) => a - b);
}

/**
 * replayExtensionPromptPart 的单次溯源内记忆化
 * @param depth 目标深度
 * @param role 目标角色
 */
export async function getMemoizedExtPart(depth: number, role: number): Promise<ExtPartReplay> {
  const key = `${depth}-${role}`;
  const hit = replay_cache.ext_part.get(key);
  if (hit) return hit;
  const result = await replayExtensionPromptPart(depth, role, tracer_state.ext);
  replay_cache.ext_part.set(key, result);
  return result;
}

/**
 * 枚举深度 depth 处由于注入而实际插入的消息块列表
 * 镜像 openai.js:824-850 populationInjectionPrompts 的块创建规则
 * @param depth 目标深度
 */
export async function enumerateInjectionBlocks(
  depth: number,
): Promise<Array<{ role: number; has_extension: boolean }>> {
  const cached = replay_cache.blocks.get(depth);
  if (cached) return cached;

  const result: Array<{ role: number; has_extension: boolean }> = [];
  result.push(...getExtraOrderBlocks(depth));

  for (let r = 0; r < 3; r++) {
    const ext = await getMemoizedExtPart(depth, r);
    const has_preset = hasAbsolutePrompts(depth, r);
    const has_ext = ext.parts.length > 0;
    if (has_preset || has_ext) {
      result.push({ role: r, has_extension: has_ext });
    }
  }

  replay_cache.blocks.set(depth, result);
  return result;
}

/**
 * 计算深度 depth 之前累计插入的消息块总数
 * @param depth 目标深度
 */
export async function countInjectionsBefore(depth: number): Promise<number> {
  let count = 0;
  for (const d of getRelevantDepths()) {
    if (d >= depth) break;
    const blocks = await enumerateInjectionBlocks(d);
    count += blocks.length;
  }
  return count;
}

/**
 * 计算所有深度累计插入的消息块总数
 */
export async function countAllInjections(): Promise<number> {
  let count = 0;
  for (const d of getRelevantDepths()) {
    const blocks = await enumerateInjectionBlocks(d);
    count += blocks.length;
  }
  return count;
}

/**
 * 从显示消息列表扫描最大的 chatHistory-N 编号
 * @param display 显示消息列表
 */
export function getMaxChatHistoryNumber(display: DisplayMessage[]): number {
  let max = -1;
  for (const item of display) {
    const identifier = item?.info?.identifier;
    if (typeof identifier === 'string') {
      const match = identifier.match(/^chatHistory-(\d+)$/);
      if (match) {
        const n = Number(match[1]);
        if (n > max) max = n;
      }
    }
  }
  return max;
}
