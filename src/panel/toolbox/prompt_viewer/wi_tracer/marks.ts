/**
 * 世界书与预设条目溯源 · UI 内联标记视图模型（纯函数，无 ST/Vue 依赖，可单测）
 *
 * 把 WiTraceReport.segments 转换为消息内容上的内联标记（WiMark），
 * 并提供按标记区间切分文本块的纯函数，供 Content.vue 分片渲染。
 * 标记偏移基于原始消息字符串内容；数组（多模态）内容不会产生世界书/预设/ST 自收集段。
 */
import { toPresetMark } from './preset_pure';
import type { StSegmentInfo, WiTraceSegment } from './types';

/** 消息内容上的一个内联标记：[start, end) 区间 + 徽章标签 + 悬停详情 */
export type WiMark = {
  start: number;
  end: number;
  /** 徽章文本（条目名） */
  label: string;
  /** FontAwesome 图标类名（缺省无图标） */
  icon?: string;
  /** 悬停提示（多行：世界书/预设/ST 与条目 / 位置与 order / 校验结果 / 附注） */
  title: string;
  verified: boolean;
  /** 来源渠道：'wi' 为世界书，'preset' 为预设条目，'system' 为 ST 自收集内容 */
  source?: 'wi' | 'preset' | 'system';
};

/** 文本切片：普通片段，或带内联标记的片段 */
export type TextPiece = { text: string; mark?: WiMark };

/**
 * 把溯源段转换为按 start 升序、互不重叠的内联标记数组
 * 重叠段（理论上不会出现）保留先出现者，避免切片错乱
 */
export function toWiMarks(segments: WiTraceSegment[]): WiMark[] {
  const sorted = [...segments].filter(segment => segment.end > segment.start).sort((a, b) => a.start - b.start);
  const marks: WiMark[] = [];
  let last_end = -1;
  for (const segment of sorted) {
    if (segment.start < last_end) continue;
    marks.push(toMark(segment));
    last_end = segment.end;
  }
  return marks;
}

/** 单段 → 标记：按来源分流，徽章取完整条目名（超长由 UI 限制宽度截断），title 汇总全部溯源信息 */
function toMark(segment: WiTraceSegment): WiMark {
  if (segment.source === 'preset') {
    return toPresetMark(segment);
  }
  if (segment.source === 'system') {
    return toStMark(segment);
  }
  const { entry } = segment;
  const name = entry?.comment || (entry?.uid !== undefined ? `#${entry.uid}` : '');
  const lines = [
    `${entry?.world || '世界书'} · #${entry?.uid ?? 0}${entry?.comment ? ` 「${entry.comment}」` : ''}`,
    `位置 ${segment.positionLabel} · order=${entry?.order ?? 100}`,
    segment.verified ? '等值校验 ✓（结构重放定位，非文字匹配）' : '等值校验 ✗（偏移仅供参考）',
  ];
  if (segment.note) lines.push(segment.note);
  return {
    start: segment.start,
    end: segment.end,
    label: name,
    icon: 'fa-solid fa-book-atlas',
    title: lines.join('\n'),
    verified: segment.verified,
    source: 'wi',
  };
}

/** 格式化 ST 自收集内容段的内联标记 */
/** 聊天记录段用对话气泡图标，其余 ST 自收集段用滑杆图标 */
const chatIcon = (kind: StSegmentInfo['kind']): string =>
  kind === 'chat' ? 'fa-solid fa-comments' : 'fa-solid fa-sliders';

function toStMark(segment: WiTraceSegment): WiMark {
  const info: StSegmentInfo = segment.stInfo ?? { kind: 'control', label: 'ST 生成内容' };
  const raw_name =
    info.kind === 'chat' ? info.speaker || (info.ordinal !== undefined ? `#${info.ordinal}` : '聊天') : info.label;
  const lines = [
    `ST 自收集 · ${info.label}`,
    `位置 ${segment.positionLabel}`,
    segment.verified ? '结构定位 ✓（identifier 直查，非文字匹配）' : '定位存疑（结构与快照不一致）',
  ];
  if (segment.note) lines.push(segment.note);
  return {
    start: segment.start,
    end: segment.end,
    label: raw_name,
    icon: chatIcon(info.kind),
    title: lines.join('\n'),
    verified: segment.verified,
    source: 'system',
  };
}

/**
 * 按标记区间把一段文本切成片段序列
 * @param text 块文本
 * @param base 块首在消息内容中的偏移（块间由 join('\n') 的换行分隔）
 * @param marks 升序不重叠的标记（与本块无交集的标记自动跳过）
 */
export function splitBySpans(text: string, base: number, marks: WiMark[]): TextPiece[] {
  const pieces: TextPiece[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const from = Math.max(mark.start - base, cursor);
    const to = Math.min(mark.end - base, text.length);
    if (to <= cursor || from >= text.length) continue; // 与本块无交集
    if (from > cursor) pieces.push({ text: text.slice(cursor, from) });
    pieces.push({ text: text.slice(from, to), mark });
    cursor = to;
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor) });
  return pieces;
}
