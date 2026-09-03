/**
 * 提示词查看器 · 溯源辅助函数与管线算术
 * 提供注入计数、深度枚举、消息定位、状态快照及分段工具。
 */
import type { SendingMessage } from '@/function/event';
import { extension_prompt_types, extension_prompts } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';
import { textContent } from './pure_replay';
import { replayExtensionPromptPart } from './replay';
import type {
  DisplayMessage,
  DisplayTarget,
  ExtPromptPart,
  ExtPromptSnapshot,
  FlatMessageInfo,
  PresetEntrySnapshot,
  StSegmentInfo,
  WiEntrySnapshot,
  WiTraceReport,
} from './types';

/** 溯源器运行时状态（模块级，仅保存最近一次生成的数据） */
export const tracer_state = {
  entries: null as WiEntrySnapshot[] | null,
  squash: null as { root: unknown; pre: FlatMessageInfo[] } | null,
  /** SETTINGS_READY 时刻同步抓取的扩展提示词快照 */
  ext: [] as ExtPromptSnapshot[],
  /** 本次生成类型（getPromptCollection 需按类型重放预设触发器） */
  type: 'normal' as string,
  /** SETTINGS_READY 时刻同步快取的用户 Persona 描述，用于 personaDescription 等值校验 */
  persona_description: '' as string,
};

export type ExtPartReplay = { value: string; parts: ExtPromptPart[] };

/**
 * 单次溯源内的重放缓存（每次溯源开始时重置）
 */
export const replay_cache = {
  ext_part: new Map<string, ExtPartReplay>(),
  blocks: new Map<number, Array<{ role: number; has_extension: boolean }>>(),
  preset: null as Array<Record<string, unknown>> | null,
};

export const ROLE_NAMES = ['system', 'user', 'assistant'] as const;

/** extension_prompt_roles 枚举值 → 角色名（未知值给数字字符串） */
export function roleName(role: number): string {
  return ROLE_NAMES[role] ?? String(role);
}

/** 同步快照当前扩展提示词（溯源全程只读该快照，免疫生成终止后的清理） */
export function snapshotExtensionPrompts(): ExtPromptSnapshot[] {
  return Object.entries(extension_prompts as Record<string, Partial<ExtPromptSnapshot>>).map(([key, prompt]) => ({
    key,
    ...prompt,
  }));
}

/** 从快照中取指定 key 的扩展提示词值 */
export function extSnapshotValue(key: string): string {
  return String(tracer_state.ext.find(item => item.key === key)?.value ?? '');
}

/**
 * 在显示消息中定位指定标识符的目标消息
 * 优先按顶层标识符匹配；squash 合体会把消息吸进相邻 system 消息（标识符保留在子区间），
 * 此时回退扫描各显示消息的 children，返回承载它的显示消息与子区间偏移
 */
export function findDisplayTarget(
  by_identifier: Map<string, DisplayMessage[]> | Record<string, DisplayMessage[]>,
  display: DisplayMessage[],
  identifier: string,
  role: string | null,
): DisplayTarget | null {
  const group = by_identifier instanceof Map ? by_identifier.get(identifier) : by_identifier[identifier];
  const direct = (role === null ? group?.[0] : group?.find(item => item.info.role === role)) ?? group?.[0];
  if (direct) {
    const child = direct.children.find(item => item.info.identifier === identifier) ?? direct.children[0];
    if (child) return { display: direct, child };
  }
  for (const item of display) {
    const child = item.children.find(
      entry => entry.info.identifier === identifier && (role === null || entry.info.role === role),
    );
    if (child) return { display: item, child };
  }
  return null;
}

/** 取查看器消息内容的切片（用于定位段的等值校验） */
export function sliceContent(messages: SendingMessage[], index: number, start: number, end: number): string {
  return textContent(messages[index]?.content).slice(start, end);
}

/** addSegment 的入参 */
export type SegmentInput = {
  index: number;
  start: number;
  text: string;
  entry?: WiEntrySnapshot;
  label: string;
  note?: string;
  source?: 'wi' | 'preset' | 'system';
  presetEntry?: PresetEntrySnapshot;
  stInfo?: StSegmentInfo;
  verified_override?: boolean;
};

/** 插入一个定位段：区间 [start, start+text.length)，等值校验取查看器消息切片（支持 verified_override 显式指定） */
export function addSegment(report: WiTraceReport, messages: SendingMessage[], input: SegmentInput): void {
  const end = input.start + input.text.length;
  const verified =
    input.verified_override !== undefined
      ? input.verified_override
      : sliceContent(messages, input.index, input.start, end) === input.text;
  report.segments.push({
    messageIndex: input.index,
    start: input.start,
    end,
    entry: input.entry,
    positionLabel: input.label,
    verified,
    note: input.note,
    source: input.source,
    presetEntry: input.presetEntry,
    stInfo: input.stInfo,
  });
}

/** 重建当前预设集合（纯计算，无副作用，单次溯源内缓存），失败时返回空 */
export function getPresetCollection(): Array<Record<string, unknown>> {
  if (replay_cache.preset !== null) return replay_cache.preset;
  try {
    const collection = (promptManager as unknown as {
      getPromptCollection?: (type: string) => { collection?: unknown[] };
    })?.getPromptCollection?.(tracer_state.type);
    const preset = (collection?.collection ?? []) as Array<Record<string, unknown>>;
    replay_cache.preset = preset;
    return preset;
  } catch {
    return [];
  }
}

/** 深度 depth 处的绝对注入提示词（injection_position=1 且有内容） */
export function absolutePromptsAt(depth: number): Array<Record<string, unknown>> {
  return getPresetCollection().filter(
    prompt => prompt?.injection_position === 1 && prompt?.content && Number(prompt.injection_depth ?? 0) === depth,
  );
}

/** 绝对深度注入（injection_position=1 且有内容）所在的深度集合 */
export function getAbsoluteInjectionDepths(): number[] {
  return getPresetCollection()
    .filter(prompt => prompt?.injection_position === 1 && prompt?.content)
    .map(prompt => Number(prompt.injection_depth ?? 0));
}

/** 某深度某角色是否存在默认优先级(order=100)的绝对注入 */
export function hasAbsolutePrompts(depth: number, role: number): boolean {
  return absolutePromptsAt(depth).some(
    prompt => String(prompt.injection_order ?? '100') === '100' && prompt.role === roleName(role),
  );
}

/** 非 100 优先级的绝对注入块（每个 order×role 组合一块，镜像 order 降序、role 升序的块顺序） */
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

/** 收集存在注入内容的深度集合（IN_CHAT 扩展提示词深度 ∪ 绝对注入深度） */
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
 * replayExtensionPromptPart 的单次溯源内记忆化（按 depth-role 键）
 */
export async function getMemoizedExtPart(depth: number, role: number): Promise<ExtPartReplay> {
  const key = `${depth}-${role}`;
  const hit = replay_cache.ext_part.get(key);
  if (hit) return hit;
  const result = await replayExtensionPromptPart(depth, role, tracer_state.ext);
  replay_cache.ext_part.set(key, result);
  return result;
}

/** 别名导出以保持与 trace.ts 兼容 */
export const cachedExtensionPromptPart = getMemoizedExtPart;

/**
 * 枚举深度 depth 处由于注入而实际插入的消息块列表
 * 镜像 openai.js:824-850 populationInjectionPrompts 的块创建规则
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

/** 计算深度 depth 之前（严格小于 depth）累计插入的消息块总数 */
export async function countInjectionsBefore(depth: number): Promise<number> {
  let count = 0;
  for (const d of getRelevantDepths()) {
    if (d >= depth) break;
    const blocks = await enumerateInjectionBlocks(d);
    count += blocks.length;
  }
  return count;
}

/** 计算所有深度累计插入的消息块总数 */
export async function countAllInjections(): Promise<number> {
  let count = 0;
  for (const d of getRelevantDepths()) {
    const blocks = await enumerateInjectionBlocks(d);
    count += blocks.length;
  }
  return count;
}

/** 从显示消息列表扫描最大的 chatHistory-N 编号 */
export function getMaxChatHistoryNumber(display: DisplayMessage[]): number {
  let max = -1;
  for (const item of display) {
    const identifier = item?.info?.identifier;
    if (typeof identifier === 'string') {
      const match = identifier.match(/^chatHistory-(\\d+)$/);
      if (match) {
        const n = Number(match[1]);
        if (n > max) max = n;
      }
    }
  }
  return max;
}
