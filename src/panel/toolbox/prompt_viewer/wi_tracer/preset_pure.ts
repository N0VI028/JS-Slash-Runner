/**
 * 预设条目溯源
 * 处理预设条目判定、相对条目内容校验、绝对注入块内拼接偏移计算与内联标记生成
 */
import type { WiMark } from './marks';
import { joinWithSpans } from './spans';
import type { WiTraceSegment } from './types';

/** 预设内容标记条目的标识符集合 */
export const PRESET_MARKER_IDENTIFIERS = new Set(['main', 'nsfw', 'jailbreak', 'enhanceDefinitions']);

/**
 * 判断条目是否属于预设条目渠道
 * @param prompt 待判断的条目对象
 */
export function isPresetPrompt(prompt: { identifier?: string; system_prompt?: boolean }): boolean {
  if (!prompt?.identifier) return false;
  if (PRESET_MARKER_IDENTIFIERS.has(prompt.identifier)) return true;
  return prompt.system_prompt !== true;
}

/**
 * 相对预设条目内容校验：原文等值、宏替换后等值、角色卡覆盖三选一即通过
 * @param display_text 消息显示文本
 * @param preset_content 预设原文
 * @param identifier 条目标识符
 * @param card_system 角色卡 system 字段（main 覆盖检测）
 * @param card_jailbreak 角色卡 jailbreak 字段（jailbreak 覆盖检测）
 * @param prefer_system 是否优先角色卡 system 提示词
 * @param prefer_jailbreak 是否优先角色卡 jailbreak 提示词
 * @param substitute_fn 宏替换函数
 */
export function verifyRelativePresetContentPure(
  display_text: string,
  preset_content: string,
  identifier: string,
  card_system: string | null,
  card_jailbreak: string | null,
  prefer_system: boolean,
  prefer_jailbreak: boolean,
  substitute_fn: (text: string, params?: Record<string, unknown>) => string,
): boolean {
  if (display_text === preset_content) return true;
  try {
    if (display_text === substitute_fn(preset_content)) return true;
  } catch {
    // 宏替换失败忽略
  }

  // 角色卡覆盖：main/jailbreak 条目内容被角色卡对应字段取代
  const is_main = identifier === 'main' && card_system && prefer_system;
  const is_jailbreak = identifier === 'jailbreak' && card_jailbreak && prefer_jailbreak;
  const card_text = is_main ? card_system : is_jailbreak ? card_jailbreak : null;
  if (!card_text) return false;

  return display_text === card_text || display_text === substitute_fn(card_text, { original: preset_content });
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
 * 镜像 openai.js:833-839 populationInjectionPrompts 的 join('\n') 与整体 trimStart
 * @param contents 块内各条目内容列表
 */
export function calculateAbsolutePromptOffsets(contents: string[]): AbsolutePromptSpan[] {
  const joined = joinWithSpans(contents, { trim: 'whole' });
  return contents.map((text, index) => ({ index, text, ...joined.spans[index] }));
}

/**
 * 格式化预设条目的内联标记
 * @param segment 预设条目溯源段
 */
export function toPresetMark(segment: WiTraceSegment): WiMark {
  return {
    start: segment.start,
    end: segment.end,
    label: segment.presetEntry?.name || segment.presetEntry?.identifier || '预设条目',
    icon: 'fa-solid fa-sliders',
    source: 'preset',
  };
}
