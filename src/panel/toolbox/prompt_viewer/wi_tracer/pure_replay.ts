/**
 * 世界书条目追踪
 * 镜像 SillyTavern 源码中字符串拼接与偏移计算的算术逻辑
 */
import { joinWithSpans, type Span } from './spans';
import type { DisplayMessage, FlatMessageInfo, PipelineRecording } from './types';

/** 不参与 squash 合并的消息标识符列表（镜像 openai.js:3848） */
export const EXCLUDE_LIST = ['newMainChat', 'newChat', 'groupNudge'];

/** 作者注释分解结果：原文区间 + ANTop/ANBottom 各段在合并值坐标系内的区间 */
export type AuthorNoteSpans = {
  origStart: number;
  origEnd: number;
  topSpans: Span[];
  bottomSpans: Span[];
  verified: boolean;
};

/**
 * 取消息内容的字符串形态
 * @param content 原始消息内容
 */
export function textContent(content: unknown): string {
  return typeof content === 'string' ? content : '';
}

/**
 * 提取消息的标识信息
 * @param item 原始消息对象
 */
export function toFlatInfo(item: unknown): FlatMessageInfo {
  const message = item as { identifier?: string; role?: string; content?: unknown; name?: unknown };
  return {
    identifier: message?.identifier,
    role: String(message?.role ?? ''),
    content: message?.content,
    name: message?.name,
  };
}

/**
 * 整体平移区间列表
 * @param spans 基础区间
 * @param offset 平移量
 * @param clamp_first_start 为真时把首段起点收敛到 0
 */
function shiftSpans(spans: Span[], offset: number, clamp_first_start = false): Span[] {
  return spans.map((span, index) => {
    const start = span.start + offset;
    return { start: clamp_first_start && index === 0 ? Math.max(0, start) : start, end: span.end + offset };
  });
}

/**
 * 收缩末段终点
 * @param spans 区间列表
 * @param delta 末段终点增量
 */
function shrinkLastEnd(spans: Span[], delta: number): Span[] {
  return spans.map((span, index) => (index === spans.length - 1 ? { ...span, end: span.end + delta } : span));
}

/**
 * 计算作者注释各段在拼接文本中的区间与校验结果
 * 镜像 world-info.js:5172 `${top}\n${orig}\n${bottom}` 去首尾换行逻辑；
 * 属「已知头尾、中间未知」的逆分解，故不并入通用拼接抽象
 * @param value 作者注释合并值
 * @param topTexts ANTop 段文本
 * @param bottomTexts ANBottom 段文本
 */
export function decomposeAuthorNote(value: string, topTexts: string[], bottomTexts: string[]): AuthorNoteSpans {
  const top = topTexts.join('\n');
  const bottom = bottomTexts.join('\n');
  const leadAdj = top.length === 0 || top.startsWith('\n') ? 1 : 0;
  const trailAdj = bottom.length === 0 || bottom.endsWith('\n') ? 1 : 0;
  const origLen = value.length + leadAdj + trailAdj - top.length - bottom.length - 2;
  const origStart = top.length + 1 - leadAdj;
  const origEnd = origStart + origLen;
  if (origLen < 0) {
    return { origStart, origEnd, topSpans: [], bottomSpans: [], verified: false };
  }

  const topSpans = shiftSpans(joinWithSpans(topTexts).spans, -leadAdj, true);
  const bottomSpans = shrinkLastEnd(shiftSpans(joinWithSpans(bottomTexts).spans, origEnd + 1), -trailAdj);
  const orig = value.slice(origStart, origEnd);
  const verified = `${top}\n${orig}\n${bottom}`.replace(/(^\n)|(\n$)/g, '') === value;

  return { origStart, origEnd, topSpans, bottomSpans, verified };
}

/**
 * 计算 wi_format 模板中占位符前的前缀长度
 * @param format wi_format 字符串
 * @param substitute 宏替换函数
 */
export function getWiFormatPrefixLength(
  format: string,
  substitute: (text: string) => string = text => text,
): number | null {
  const matches = format.match(/\{\d+\}/g) ?? [];
  if (matches.length !== 1) return null;
  const index = format.indexOf(matches[0]);
  return substitute(format.slice(0, index)).length;
}

/**
 * 判断消息是否满足 system squash 合并条件（镜像 openai.js:3858）
 * @param msg 消息信息
 */
export function shouldSquash(msg: FlatMessageInfo): boolean {
  const id = msg.identifier ?? '';
  return !EXCLUDE_LIST.includes(id) && msg.role === 'system' && !msg.name;
}

/**
 * 按 ST squash 规则将扁平消息流划分为合并组列表
 * @param flat 扁平消息列表
 */
export function groupSquashMessages(flat: FlatMessageInfo[]): FlatMessageInfo[][] {
  const groups: FlatMessageInfo[][] = [];
  let currentGroup: FlatMessageInfo[] | null = null;

  for (const message of flat) {
    if (message.role === 'system' && !textContent(message.content)) {
      continue;
    }

    if (shouldSquash(message)) {
      if (currentGroup) {
        currentGroup.push(message);
      } else {
        currentGroup = [message];
        groups.push(currentGroup);
      }
    } else {
      currentGroup = null;
      groups.push([message]);
    }
  }

  return groups;
}

/**
 * 把单条消息转换为非合并状态的 DisplayMessage
 * @param index 消息序号
 * @param info 扁平消息信息
 */
export function toSingleDisplayMessage(index: number, info: FlatMessageInfo): DisplayMessage {
  const len = textContent(info.content).length;
  return {
    index,
    info,
    children: [{ info, start: 0, end: len }],
    merged: false,
  };
}

/**
 * 把合并组消息转换为带子区间的 DisplayMessage
 * @param index 消息序号
 * @param members 组成员列表
 */
export function toMergedDisplayMessage(index: number, members: FlatMessageInfo[]): DisplayMessage {
  const joined = joinWithSpans(members.map(m => textContent(m.content)));
  const children = members.map((m, idx) => ({
    info: m,
    start: joined.spans[idx].start,
    end: joined.spans[idx].end,
  }));
  return {
    index,
    info: { ...members[0], content: joined.text },
    children,
    merged: true,
  };
}

/**
 * 重放 squash 合并规则，把扁平消息构建为带子区间的 DisplayMessage 数组
 * @param flat 录制的扁平消息列表
 */
export function buildSquashedDisplay(flat: FlatMessageInfo[]): DisplayMessage[] {
  const groups = groupSquashMessages(flat);
  return groups.map((members, index) =>
    members.length === 1
      ? toSingleDisplayMessage(index, members[0])
      : toMergedDisplayMessage(index, members),
  );
}

/**
 * 将非 squash 的扁平消息列表直接构建为 DisplayMessage 数组
 * @param flat 扁平消息列表
 */
export function buildPlainDisplay(flat: FlatMessageInfo[]): DisplayMessage[] {
  return flat.map((info, index) => toSingleDisplayMessage(index, info));
}

/**
 * 递归展开 MessageCollection 为扁平消息列表（兜底回退用）
 * @param node 消息集合节点
 * @param keep_empty 是否保留空消息
 */
export function flattenMessages(node: unknown, keep_empty: boolean): FlatMessageInfo[] {
  const result: FlatMessageInfo[] = [];
  const collection = (node as { collection?: unknown[] })?.collection ?? [];

  for (const item of collection) {
    if (item && Array.isArray((item as { collection?: unknown[] }).collection)) {
      result.push(...flattenMessages(item, keep_empty));
    } else if (item) {
      const info = toFlatInfo(item);
      if (keep_empty || Boolean(info.content) || info.role === 'tool') {
        result.push(info);
      }
    }
  }

  return result;
}

/**
 * 优先依据录制构建 DisplayMessage 数组，无录制时回退递归展开
 * @param recording 管线录制结果
 * @param fallbackRoot 兜底回退使用的根消息集合
 */
export function buildDisplayFromRecording(
  recording: PipelineRecording | null,
  fallbackRoot: unknown,
): DisplayMessage[] {
  if (recording?.squashBefore) {
    return buildSquashedDisplay(recording.squashBefore);
  }
  if (recording?.getChatFlat) {
    return buildPlainDisplay(recording.getChatFlat);
  }
  return buildPlainDisplay(flattenMessages(fallbackRoot, false));
}
