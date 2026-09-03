/**
 * 提示词查看器 · ST 自收集内容溯源（调度层）
 * 定位 ST 内置标记提示词与真实聊天历史记录，推入溯源报告。
 */
import { textContent } from './pure_replay';
import { ST_MARKER_PROMPTS, collectChatHistoryChildren } from './st_pure';
import { addSegment, findDisplayTarget, tracer_state } from './trace_helpers';
import type { TraceContext } from './types';

/** 校验 personaDescription 内容是否与快照一致 */
function checkPersonaVerification(identifier: string, text: string): { verified_override?: boolean; note?: string } {
  if (identifier !== 'personaDescription') return {};
  const is_equal = text === tracer_state.persona_description;
  return {
    verified_override: is_equal,
    note: is_equal ? undefined : '内容与 Persona 快照存在差异（可能经宏替换）',
  };
}

/** 定位 ST 内置标记提示词（角色卡字段、Persona、控制提示等） */
function resolveStMarkers(ctx: TraceContext): void {
  for (const [identifier, meta] of Object.entries(ST_MARKER_PROMPTS)) {
    const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, null);
    if (!target) continue;
    const text = textContent(target.child.info.content);
    if (!text.trim()) continue;

    const check = checkPersonaVerification(identifier, text);
    addSegment(ctx.report, ctx.messages, {
      index: target.display.index,
      start: target.child.start,
      text,
      label: meta.label,
      source: 'system',
      stInfo: { kind: meta.kind, label: meta.label },
      verified_override: check.verified_override,
      note: check.note,
    });
  }
}

/** 定位真实聊天历史记录消息 */
function resolveChatHistory(ctx: TraceContext): void {
  const items = collectChatHistoryChildren(ctx.display, ctx.injection_ids ?? new Set());
  for (const item of items) {
    const text = textContent(item.child.info.content);
    if (!text.trim()) continue;

    addSegment(ctx.report, ctx.messages, {
      index: item.display.index,
      start: item.child.start,
      text,
      label: `聊天记录 倒数第${item.ordinal}条`,
      source: 'system',
      stInfo: {
        kind: 'chat',
        label: '聊天记录',
        ordinal: item.ordinal,
        speaker: item.speaker ?? undefined,
      },
    });
  }
}

/**
 * 运行 ST 自收集内容溯源全流程（标记提示词 + 聊天历史）
 * @param ctx 溯源共享上下文
 */
export function resolveStChannels(ctx: TraceContext): void {
  resolveStMarkers(ctx);
  resolveChatHistory(ctx);
}
