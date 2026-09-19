/**
 * 预设条目溯源
 * 遍历预设条目集合，通过 identifier 直查与算术编号定位消息，
 * 未定位的条目直接跳过，不产生标记。
 */
import { getCharacterCardFields, substituteParams } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';
import {
  calculateAbsolutePromptOffsets,
  isPresetPrompt,
  verifyRelativePresetContentPure,
} from './preset_pure';
import { textContent } from './pure_replay';
import {
  absolutePromptsAt,
  addSegment,
  countAllInjections,
  countInjectionsBefore,
  enumerateInjectionBlocks,
  findDisplayTarget,
  getMaxChatHistoryNumber,
  getPresetCollection,
  getRelevantDepths,
  promptBelongsToBlock,
  type InjectionBlock,
  resolveDepthBlockTarget,
} from './trace_helpers';
import type { DisplayTarget, PresetEntrySnapshot, TraceContext } from './types';

/**
 * 运行预设条目溯源全流程
 * @param ctx 溯源共享上下文
 */
export async function resolvePresetChannels(ctx: TraceContext): Promise<void> {
  const preset = getPresetCollection();
  resolveRelativePresets(preset, ctx);
  await resolveAbsolutePresets(ctx);
}

/**
 * 相对位置预设条目溯源
 * @param preset 预设条目集合
 * @param ctx 溯源共享上下文
 */
function resolveRelativePresets(preset: Array<Record<string, unknown>>, ctx: TraceContext): void {
  const relative = preset.filter(
    prompt =>
      isPresetPrompt(prompt as { identifier: string; system_prompt?: boolean }) &&
      Number(prompt.injection_position ?? 0) !== 1,
  );

  for (const prompt of relative) {
    resolveSingleRelativePreset(prompt, ctx);
  }
}

/**
 * 将原始预设条目转换为相对位置预设快照
 * @param prompt 预设条目原始对象
 * @param identifier 标识符
 */
function toRelativePresetEntry(prompt: Record<string, unknown>, identifier: string): PresetEntrySnapshot {
  return {
    identifier,
    name: typeof prompt.name === 'string' ? prompt.name : undefined,
    role: String(prompt.role ?? 'system'),
    injection_depth: prompt.injection_depth !== undefined ? Number(prompt.injection_depth) : undefined,
  };
}

/**
 * 获取当前角色的条目覆盖配置
 */
function getCharacterOverrideConfig(): {
  card_system: string | null;
  card_jailbreak: string | null;
  prefer_system: boolean;
  prefer_jailbreak: boolean;
} {
  try {
    const card = getCharacterCardFields();
    return {
      card_system: card?.system ?? null,
      card_jailbreak: card?.jailbreak ?? null,
      prefer_system: power_user?.prefer_character_prompt !== false,
      prefer_jailbreak: power_user?.prefer_character_jailbreak !== false,
    };
  } catch {
    return {
      card_system: null,
      card_jailbreak: null,
      prefer_system: true,
      prefer_jailbreak: true,
    };
  }
}

/**
 * 相对条目内容是否与预设原文等价（含宏替换与角色卡覆盖判定）
 * @param display_text 消息显示文本
 * @param content 预设原文
 * @param identifier 条目标识符
 */
function isRelativePresetVerified(display_text: string, content: string, identifier: string): boolean {
  const cfg = getCharacterOverrideConfig();
  return verifyRelativePresetContentPure(
    display_text,
    content,
    identifier,
    cfg.card_system,
    cfg.card_jailbreak,
    cfg.prefer_system,
    cfg.prefer_jailbreak,
    substituteParams,
  );
}

/**
 * 解析单条相对位置预设条目
 * @param prompt 预设条目原始对象
 * @param ctx 溯源共享上下文
 */
function resolveSingleRelativePreset(prompt: Record<string, unknown>, ctx: TraceContext): void {
  const identifier = String(prompt.identifier ?? '');
  const content = String(prompt.content ?? '');
  if (!identifier || !content.trim()) return;

  const role = typeof prompt.role === 'string' ? prompt.role : null;
  const target = findDisplayTarget(ctx.by_identifier, identifier, role);
  if (!target) return;

  const display_text = textContent(target.child.info.content);
  const snapshot = toRelativePresetEntry(prompt, identifier);
  addSegment(ctx, {
    index: target.display.index,
    start: target.child.start,
    text: display_text,
    source: 'preset',
    presetEntry: snapshot,
    label: `相对位置 (${snapshot.role})`,
    verified_override: isRelativePresetVerified(display_text, content, identifier),
  });
}

/**
 * 绝对深度注入预设条目溯源
 * @param ctx 溯源共享上下文
 */
async function resolveAbsolutePresets(ctx: TraceContext): Promise<void> {
  const max_number = getMaxChatHistoryNumber(ctx.display);
  const total_injections = await countAllInjections();
  const chat_count = Math.max(0, max_number - total_injections);
  const depths = getRelevantDepths();

  for (const depth of depths) {
    const prompts = absolutePromptsAt(depth);
    if (!prompts.length) continue;

    const before_count = await countInjectionsBefore(depth);
    const blocks = await enumerateInjectionBlocks(depth);

    resolveDepthBlocks(prompts, blocks, depth, before_count, max_number, chat_count, ctx);
  }
}

/**
 * 处理当前深度所有统一降序注入块中的预设条目
 * 镜像 openai.js:824-855 统一按 (order, role) 定位目标消息
 */
function resolveDepthBlocks(
  prompts: Array<Record<string, unknown>>,
  blocks: InjectionBlock[],
  depth: number,
  before_count: number,
  max_number: number,
  chat_count: number,
  ctx: TraceContext,
): void {
  for (let block_index = 0; block_index < blocks.length; block_index++) {
    const block = blocks[block_index];
    const block_prompts = prompts.filter(prompt => promptBelongsToBlock(prompt, block.order, block.role));
    if (!block_prompts.length) continue;

    const target = resolveDepthBlockTarget({
      by_identifier: ctx.by_identifier,
      max_number,
      chat_count,
      before_count,
      depth,
      block_index,
      role: block.role,
    });
    if (!target) continue;

    dispatchAbsolutePromptSegments(block_prompts, target, ctx);
  }
}

/**
 * 将某个注入块内的预设提示词按换行拼接偏移生成溯源段
 * @param prompts 块内提示词列表
 * @param target 显示目标
 * @param ctx 溯源上下文
 */
function dispatchAbsolutePromptSegments(
  prompts: Array<Record<string, unknown>>,
  target: DisplayTarget,
  ctx: TraceContext,
): void {
  const contents = prompts.map(prompt => String(prompt.content ?? ''));
  const offsets = calculateAbsolutePromptOffsets(contents);

  for (const [i, prompt] of prompts.entries()) {
    const snapshot: PresetEntrySnapshot = {
      identifier: String(prompt.identifier ?? ''),
      name: typeof prompt.name === 'string' ? prompt.name : undefined,
      role: String(prompt.role ?? 'system'),
      injection_depth: prompt.injection_depth !== undefined ? Number(prompt.injection_depth) : undefined,
    };

    addSegment(ctx, {
      index: target.display.index,
      start: target.child.start + offsets[i].start,
      text: offsets[i].text,
      source: 'preset',
      presetEntry: snapshot,
      label: `depth=${snapshot.injection_depth} (${snapshot.role})`,
    });
  }
}
