/**
 * 提示词查看器 · 预设条目溯源（通道调度与 ST 管线对接）
 *
 * 遍历预设条目集合（相对条目与绝对注入条目），通过 identifier 直查与算术编号定位消息，
 * 执行等值校验（含角色卡覆盖检测），产出溯源段并汇总未出现条目原因。
 */
import { getCharacterCardFields, substituteParams } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import {
  buildPresetSummary,
  calculateAbsolutePromptOffsets,
  classifyUnlocatedPreset,
  groupUnlocatedPresets,
  isPresetPrompt,
  verifyRelativePresetContentPure,
  type PresetUnlocatedReason,
} from './preset_pure';
import { textContent } from './pure_replay';
import {
  absolutePromptsAt,
  addSegment,
  countAllInjections,
  countInjectionsBefore,
  enumerateInjectionBlocks,
  findDisplayTarget,
  getExtraOrderBlocks,
  getMaxChatHistoryNumber,
  getPresetCollection,
  getRelevantDepths,
  ROLE_NAMES,
  sliceContent,
  tracer_state,
} from './trace_helpers';
import type { DisplayTarget, PresetEntrySnapshot, TraceContext } from './types';

/**
 * 运行预设条目溯源全流程（相对条目 + 绝对注入 + 未定位统计）
 * @param ctx 溯源共享上下文
 */
export async function resolvePresetChannels(ctx: TraceContext): Promise<void> {
  const preset = getPresetCollection();
  resolveRelativePresets(preset, ctx);
  await resolveAbsolutePresets(ctx);
  collectUnlocatedPresetPrompts(ctx);
}

/**
 * 相对位置预设条目溯源
 * identifier 直查 + squash children 回退 + 宏替换/覆盖等值校验
 */
function resolveRelativePresets(preset: Array<Record<string, unknown>>, ctx: TraceContext): void {
  const relative = preset.filter(
    p => isPresetPrompt(p as { identifier: string; system_prompt?: boolean }) && Number(p.injection_position ?? 0) !== 1,
  );
  for (const prompt of relative) {
    const identifier = String(prompt.identifier ?? '');
    const content = String(prompt.content ?? '');
    if (!content.trim()) continue;
    const role = prompt.role ? String(prompt.role) : null;
    const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, role);
    if (!target) continue;

    const display_text = textContent(target.child.info.content);
    const entry: PresetEntrySnapshot = {
      identifier,
      name: prompt.name ? String(prompt.name) : undefined,
      role: String(prompt.role ?? 'system'),
      content,
      system_prompt: prompt.system_prompt === true,
      injection_position: 0,
      injection_trigger: Array.isArray(prompt.injection_trigger) ? (prompt.injection_trigger as string[]) : undefined,
      for_character: prompt.for_character === true,
    };

    const verification = verifyRelativePromptContent(identifier, content, display_text);
    addSegment(ctx.report, ctx.messages, {
      index: target.display.index,
      start: target.child.start,
      text: display_text,
      label: `相对位置 (${prompt.role ?? 'system'})`,
      source: 'preset',
      presetEntry: entry,
      note: verification.note,
      verified_override: verification.verified,
    });
  }
}

/**
 * 相对预设条目内容校验（含角色卡覆盖检测）
 */
function verifyRelativePromptContent(
  identifier: string,
  presetContent: string,
  displayText: string,
): { verified: boolean; note?: string } {
  let cardFields: { system?: string; jailbreak?: string } | undefined;
  try {
    cardFields = getCharacterCardFields?.() as { system?: string; jailbreak?: string } | undefined;
  } catch {
    // 角色卡字段获取失败忽略
  }

  const pu = power_user as Record<string, unknown> | undefined;
  return verifyRelativePresetContentPure(identifier, presetContent, displayText, {
    substituteFn: substituteParams,
    cardFields,
    preferCharacterPrompt: pu?.prefer_character_prompt !== false,
    preferCharacterJailbreak: pu?.prefer_character_jailbreak !== false,
  });
}

/**
 * 绝对深度注入预设条目溯源
 * injection_position === 1，按 (depth, role) 算术映射至 chatHistory-N 消息
 */
async function resolveAbsolutePresets(ctx: TraceContext): Promise<void> {
  const depths = getRelevantDepths();
  if (!depths.length) return;

  const max_number = getMaxChatHistoryNumber(ctx.display);
  const total_injections = await countAllInjections();
  const chat_count = Math.max(0, max_number - total_injections);

  for (const depth of depths) {
    const prompts_at_depth = absolutePromptsAt(depth);
    if (!prompts_at_depth.length) continue;

    const before_count = await countInjectionsBefore(depth);
    const blocks = await enumerateInjectionBlocks(depth);

    // 1. 处理非 100 优先级的额外块
    const extra_blocks = getExtraOrderBlocks(depth);
    for (let i = 0; i < extra_blocks.length; i++) {
      const block = extra_blocks[i];
      const distance = before_count + i + Math.min(depth, chat_count);
      const identifier = `chatHistory-${max_number - distance}`;
      const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, ROLE_NAMES[block.role]);
      if (!target) continue;

      ctx.injection_ids?.add(identifier);

      // 提取属于该额外块的条目列表
      const block_prompts = prompts_at_depth.filter(
        p => Number(p.injection_order ?? 100) !== 100 && p.role === ROLE_NAMES[block.role],
      );
      dispatchAbsolutePromptSegments(block_prompts, target, ctx);
    }

    // 2. 处理默认 100 优先级的块（按 role: system, user, assistant）
    for (let r = 0; r < 3; r++) {
      const block_index = blocks.findIndex((b, idx) => idx >= extra_blocks.length && b.role === r);
      if (block_index === -1) continue;

      const block_prompts = prompts_at_depth.filter(
        p => String(p.injection_order ?? '100') === '100' && p.role === ROLE_NAMES[r],
      );
      if (!block_prompts.length) continue;

      const distance = before_count + block_index + Math.min(depth, chat_count);
      const identifier = `chatHistory-${max_number - distance}`;
      const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, ROLE_NAMES[r]);
      if (!target) continue;

      ctx.injection_ids?.add(identifier);

      dispatchAbsolutePromptSegments(block_prompts, target, ctx);
    }
  }
}

/**
 * 将某个注入块内的预设提示词按换行拼接偏移生成溯源段
 */
function dispatchAbsolutePromptSegments(
  prompts: Array<Record<string, unknown>>,
  target: DisplayTarget,
  ctx: TraceContext,
): void {
  const contents = prompts.map(p => String(p.content ?? ''));
  const spans = calculateAbsolutePromptOffsets(contents);

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const span = spans[i];
    if (!span || !span.text.trim()) continue;

    const entry: PresetEntrySnapshot = {
      identifier: String(prompt.identifier ?? ''),
      name: prompt.name ? String(prompt.name) : undefined,
      role: String(prompt.role ?? 'system'),
      content: span.text,
      injection_position: 1,
      injection_depth: Number(prompt.injection_depth ?? 0),
      injection_order: prompt.injection_order as number | string,
      injection_trigger: Array.isArray(prompt.injection_trigger) ? (prompt.injection_trigger as string[]) : undefined,
      for_character: prompt.for_character === true,
    };

    const start = target.child.start + span.start;
    const end = start + span.text.length;
    const actual_slice = sliceContent(ctx.messages, target.display.index, start, end);
    const verified = actual_slice === span.text;

    ctx.report.segments.push({
      messageIndex: target.display.index,
      start,
      end,
      positionLabel: `绝对注入 depth=${prompt.injection_depth ?? 0} (${prompt.role ?? 'system'})`,
      verified,
      source: 'preset',
      presetEntry: entry,
      note: verified ? undefined : '注入内容与重放偏移存在差异',
    });
  }
}

/**
 * 收集未定位的预设条目并按原因分类汇总至 ctx.report.presetSummary
 */
function collectUnlocatedPresetPrompts(ctx: TraceContext): void {
  // 获取未经过滤的预设原始集合
  const all_presets = getRawPresetPrompts();
  const order_map = getActiveCharacterPromptOrder();
  const located_identifiers = new Set(
    ctx.report.segments
      .filter(s => s.source === 'preset' && s.presetEntry?.identifier)
      .map(s => s.presetEntry!.identifier),
  );

  const unlocated_items: Array<{ entry: PresetEntrySnapshot; reason: PresetUnlocatedReason }> = [];
  let total_count = 0;
  let located_count = 0;
  let verified_count = 0;

  for (const raw of all_presets) {
    const identifier = String(raw.identifier ?? '');
    if (!identifier) continue;
    if (!isPresetPrompt(raw as { identifier: string; system_prompt?: boolean })) continue;

    total_count++;
    const is_located = located_identifiers.has(identifier);
    if (is_located) {
      located_count++;
      const segs = ctx.report.segments.filter(s => s.source === 'preset' && s.presetEntry?.identifier === identifier);
      if (segs.every(s => s.verified)) verified_count++;
      continue;
    }

    const entry: PresetEntrySnapshot = {
      identifier,
      name: raw.name ? String(raw.name) : undefined,
      role: String(raw.role ?? 'system'),
      content: String(raw.content ?? ''),
      system_prompt: raw.system_prompt === true,
      injection_position: Number(raw.injection_position ?? 0),
      injection_depth: raw.injection_depth !== undefined ? Number(raw.injection_depth) : undefined,
      injection_order: raw.injection_order as number | string,
      injection_trigger: Array.isArray(raw.injection_trigger) ? (raw.injection_trigger as string[]) : undefined,
      for_character: raw.for_character === true,
    };

    const reason = classifyUnlocatedPreset(entry, {
      disabled: isPresetDisabledForCharacter(raw, order_map),
      trigger_matched: isTriggerMatched(raw, tracer_state.type),
      type: tracer_state.type,
    });
    unlocated_items.push({ entry, reason });
  }

  const unlocated_groups = groupUnlocatedPresets(unlocated_items);
  ctx.report.presetSummary = buildPresetSummary(total_count, located_count, verified_count, unlocated_groups);
}

/** 获取未经过滤的预设条目原始数组（优先读取 promptManager.serviceSettings.prompts） */
function getRawPresetPrompts(): Array<Record<string, unknown>> {
  try {
    const pm = promptManager as unknown as {
      serviceSettings?: { prompts?: Array<Record<string, unknown>> };
    };
    if (Array.isArray(pm?.serviceSettings?.prompts)) {
      return pm.serviceSettings.prompts;
    }
    return getPresetCollection();
  } catch {
    return getPresetCollection();
  }
}

/** 获取当前激活角色的条目启用表（identifier -> enabled） */
function getActiveCharacterPromptOrder(): Map<string, boolean> | null {
  try {
    const pm = promptManager as unknown as {
      activeCharacter?: { id?: string | number } | null;
      serviceSettings?: {
        prompt_order?: Array<{
          character_id?: string | number;
          order?: Array<{ identifier?: string; enabled?: boolean }>;
        }>;
      };
    };
    const activeChar = pm?.activeCharacter;
    if (!activeChar || activeChar.id === undefined || activeChar.id === null) return null;
    const list = pm.serviceSettings?.prompt_order?.find(item => String(item.character_id) === String(activeChar.id));
    if (!list?.order || !Array.isArray(list.order)) return null;
    const map = new Map<string, boolean>();
    for (const entry of list.order) {
      if (entry?.identifier) {
        map.set(entry.identifier, entry.enabled !== false);
      }
    }
    return map;
  } catch {
    return null;
  }
}

/** 检查条目是否在当前角色下被禁用 */
function isPresetDisabledForCharacter(
  prompt: Record<string, unknown>,
  orderMap?: Map<string, boolean> | null,
): boolean {
  const identifier = String(prompt.identifier ?? '');
  if (!identifier || !orderMap) return false;
  return orderMap.get(identifier) === false;
}

/** 检查触发器是否匹配当前生成类型 */
function isTriggerMatched(prompt: Record<string, unknown>, currentType: string): boolean {
  if (!Array.isArray(prompt.injection_trigger) || !prompt.injection_trigger.length) return true;
  return prompt.injection_trigger.includes(currentType);
}
