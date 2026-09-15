/**
 * 世界书与预设条目溯源
 * 把 WiTraceReport.segments 转换为消息内容上的内联标记（WiMark），
 * 并提供按标记区间切分文本块的纯函数，供 Content.vue 分片渲染。
 */
import { toPresetMark } from './preset_pure';
import type { WiTraceSegment } from './types';

/** 消息内容上的一个内联标记：[start, end) 区间 + 徽章标签 */
export type WiMark = {
  start: number;
  end: number;
  label: string;
  icon?: string;
  source?: 'wi' | 'preset' | 'card';
};

export type TextPiece = {
  text: string;
  mark?: WiMark;
};

/**
 * 把溯源段转换为按 start 升序、互不重叠的内联标记数组
 * 重叠段保留先出现者，避免切片错乱
 * @param segments 溯源段列表
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

/**
 * 单段 → 标记：按来源分流为预设、角色卡或世界书标记
 * @param segment 溯源段
 */
function toMark(segment: WiTraceSegment): WiMark {
  if (segment.source === 'preset') {
    return toPresetMark(segment);
  }
  if (segment.source === 'card') {
    return {
      start: segment.start,
      end: segment.end,
      label: segment.positionLabel,
      icon: 'fa-solid fa-id-card',
      source: 'card',
    };
  }

  const { entry } = segment;
  const name = entry?.comment || (entry?.uid !== undefined ? `#${entry.uid}` : '');

  return {
    start: segment.start,
    end: segment.end,
    label: name,
    icon: 'fa-solid fa-book-atlas',
    source: 'wi',
  };
}

/**
 * 按标记区间把一段文本切成片段序列
 * @param text 块文本
 * @param base 块首在消息内容中的偏移
 * @param marks 升序不重叠的标记列表
 */
export function splitBySpans(text: string, base: number, marks: WiMark[]): TextPiece[] {
  const pieces: TextPiece[] = [];
  let cursor = 0;

  for (const mark of marks) {
    const from = Math.max(mark.start - base, cursor);
    const to = Math.min(mark.end - base, text.length);
    if (to <= cursor || from >= text.length) continue;
    if (from > cursor) pieces.push({ text: text.slice(cursor, from) });
    pieces.push({ text: text.slice(from, to), mark });
    cursor = to;
  }

  if (cursor < text.length) {
    pieces.push({ text: text.slice(cursor) });
  }

  return pieces;
}
