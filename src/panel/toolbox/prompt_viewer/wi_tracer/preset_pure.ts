/**
 * 预设条目溯源 · 纯计算与视图模型（纯函数，无 ST/Vue 依赖，可单测）
 *
 * 处理预设条目判定、相对条目内容校验、绝对注入块内拼接偏移计算、未定位原因分类与内联标记视图生成。
 */
import type { WiMark } from './marks';
import type { PresetEntrySnapshot, PresetTraceSummary, PresetUnlocatedGroup, WiTraceSegment } from './types';

/** 预设内容标记条目的标识符集合（内容由预设提供而非角色卡或系统生成的标记条目） */
export const PRESET_MARKER_IDENTIFIERS = new Set(['main', 'nsfw', 'jailbreak', 'enhanceDefinitions']);

/** 徽章中条目名的最大码点数（超长截断，完整名称见 title） */
const LABEL_MAX_CODEPOINTS = 12;

/**
 * 判断条目是否属于预设条目渠道（用户自定义条目 + 内容由预设提供的标记条目）
 * @param prompt 待判断的条目对象
 */
export function isPresetPrompt(prompt: { identifier?: string; system_prompt?: boolean }): boolean {
  if (!prompt?.identifier) return false;
  if (PRESET_MARKER_IDENTIFIERS.has(prompt.identifier)) return true;
  return prompt.system_prompt !== true;
}

/**
 * 相对预设条目内容校验（纯函数，含宏替换与角色卡覆盖检测）
 */
export function verifyRelativePresetContentPure(
  identifier: string,
  presetContent: string,
  displayText: string,
  options?: {
    substituteFn?: (text: string, params?: Record<string, unknown>) => string;
    cardFields?: { system?: string; jailbreak?: string };
    preferCharacterPrompt?: boolean;
    preferCharacterJailbreak?: boolean;
  },
): { verified: boolean; note?: string } {
  if (displayText === presetContent) return { verified: true };

  // 1. 检查是否匹配宏替换后的内容
  if (options?.substituteFn) {
    try {
      const substituted = options.substituteFn(presetContent);
      if (displayText === substituted) return { verified: true };
    } catch {
      // 宏替换失败忽略
    }
  }

  // 2. 检查主提示词/越狱提示词是否被角色卡覆盖
  const cardFields = options?.cardFields;
  const preferPrompt = options?.preferCharacterPrompt !== false;
  const preferJailbreak = options?.preferCharacterJailbreak !== false;

  if (identifier === 'main' && cardFields?.system && preferPrompt) {
    const cardMain = cardFields.system;
    const substitutedCard = options?.substituteFn
      ? options.substituteFn(cardMain, { original: presetContent })
      : cardMain;
    if (displayText === substitutedCard || displayText === cardMain) {
      return { verified: true, note: '内容被角色卡覆盖' };
    }
  }

  if (identifier === 'jailbreak' && cardFields?.jailbreak && preferJailbreak) {
    const cardJailbreak = cardFields.jailbreak;
    const substitutedJailbreak = options?.substituteFn
      ? options.substituteFn(cardJailbreak, { original: presetContent })
      : cardJailbreak;
    if (displayText === substitutedJailbreak || displayText === cardJailbreak) {
      return { verified: true, note: '内容被角色卡覆盖' };
    }
  }

  return { verified: false, note: '消息内容与预设原文存在差异（可能经宏替换或被覆盖）' };
}

/**
 * 判断条目是否属于指定 order 与 role 的绝对注入块
 * @param prompt 预设条目
 * @param targetOrder 目标优先级（数字或 '100'）
 * @param targetRole 目标角色（'system' | 'user' | 'assistant'）
 */
export function isPromptInAbsoluteOrderBlock(
  prompt: { injection_order?: number | string; role?: string },
  targetOrder: number | '100',
  targetRole: string,
): boolean {
  if (prompt.role !== targetRole) return false;
  const promptOrder = Number(prompt.injection_order ?? 100);
  if (targetOrder === 100 || targetOrder === '100') {
    return promptOrder === 100;
  }
  return promptOrder === targetOrder;
}

/** 绝对注入块内单个条目的区间偏移结果 */
export type AbsolutePromptSpan = {
  index: number;
  start: number;
  end: number;
  text: string;
};

/**
 * 计算绝对注入块内各预设条目的字符区间偏移
 * 镜像 openai.js:833-839 populationInjectionPrompts 的 join('\n') 与 trim 处理
 * @param contents 块内属于该角色的各条目内容列表
 */
export function calculateAbsolutePromptOffsets(contents: string[]): AbsolutePromptSpan[] {
  const raw = contents.join('\n');
  const lead_trim = raw.length - raw.trimStart().length;
  let cursor = 0;
  return contents.map((text, index) => {
    const raw_start = cursor;
    cursor += text.length + 1; // 加上换行符
    const start = Math.max(0, raw_start - lead_trim);
    return {
      index,
      start,
      end: start + text.length,
      text,
    };
  });
}

/** 未定位预设条目的原因分类结果 */
export type PresetUnlocatedReason = {
  label: string;
  reason: string;
};

/**
 * 判断未定位预设条目的归类原因
 * @param prompt 预设条目简要信息
 * @param options 运行态上下文（禁用状态、触发器匹配、生成类型）
 */
export function classifyUnlocatedPreset(
  prompt: { identifier: string; content?: string },
  options: { disabled: boolean; trigger_matched: boolean; type: string },
): PresetUnlocatedReason {
  if (options.disabled) {
    return { label: '已禁用', reason: '条目在当前角色下被禁用' };
  }
  if (!options.trigger_matched) {
    return { label: '触发器不匹配', reason: `触发器条件不满足（当前类型为 ${options.type}）` };
  }
  if (!prompt.content || !prompt.content.trim()) {
    return { label: '空内容', reason: '条目内容为空' };
  }
  return { label: '未定位', reason: '未出现在消息中（可能被Token预算截断或未被注入）' };
}

/**
 * 把未定位的预设条目按原因归类成组
 * @param items 带归类原因的预设条目快照列表
 */
export function groupUnlocatedPresets(
  items: Array<{ entry: PresetEntrySnapshot; reason: PresetUnlocatedReason }>,
): PresetUnlocatedGroup[] {
  const map = new Map<string, { label: string; entries: PresetEntrySnapshot[]; reason: string }>();
  for (const { entry, reason } of items) {
    let group = map.get(reason.label);
    if (!group) {
      group = { label: reason.label, entries: [], reason: reason.reason };
      map.set(reason.label, group);
    }
    group.entries.push(entry);
  }
  return [...map.values()];
}

/**
 * 组装预设条目溯源摘要统计对象
 */
export function buildPresetSummary(
  totalCount: number,
  locatedCount: number,
  verifiedCount: number,
  unlocated: PresetUnlocatedGroup[],
): PresetTraceSummary {
  const unlocatedCount = unlocated.reduce((sum, group) => sum + group.entries.length, 0);
  return {
    totalCount,
    locatedCount,
    verifiedCount,
    unlocatedCount,
    unlocated,
  };
}

/**
 * 格式化预设条目的内联标记
 * @param segment 预设条目溯源段
 */
export function toPresetMark(segment: WiTraceSegment): WiMark {
  const name = segment.presetEntry?.name || segment.presetEntry?.identifier || '预设条目';
  const codepoints = [...name];
  const clipped =
    codepoints.length > LABEL_MAX_CODEPOINTS ? `${codepoints.slice(0, LABEL_MAX_CODEPOINTS).join('')}…` : name;
  const role = segment.presetEntry?.role ?? 'system';
  const lines = [
    `预设条目 · ${name} (${role})`,
    `位置 ${segment.positionLabel}${segment.presetEntry?.injection_order !== undefined ? ` · order=${segment.presetEntry.injection_order}` : ''}`,
    segment.verified ? '等值校验 ✓（结构重放定位，非文字匹配）' : '等值校验 ✗（偏移仅供参考）',
  ];
  if (segment.note) lines.push(segment.note);
  return {
    start: segment.start,
    end: segment.end,
    label: clipped,
    icon: 'fa-solid fa-sliders',
    title: lines.join('\n'),
    verified: segment.verified,
    source: 'preset',
  };
}
