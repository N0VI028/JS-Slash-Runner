/**
 * 提示词查看器 · 消息级对齐纯函数模块（T0 ↔ T_final 对齐）
 *
 * 算法原理（纯确定性算法，无模糊匹配与字符级 diff）：
 * 1. pass1 双端引用锚定：从首尾分别进行 content 引用与 role 相同比对，得到确定的 exact 锚点；
 * 2. pass2 指纹匹配：对中间未匹配段使用 role + length + 前后32字符指纹索引，并执行全等值校验；
 * 3. pass3 区间配对：根据锚点将剩余未匹配区间按 1:1 (modified)、N:1 (merged)、0:N (injected)、N:0 (deleted) 或非齐配对 (unknown)。
 *
 * SillyTavern 原生确定性差异源清单（openai.js 1630-3072 区间，供维护参考）：
 * 1. o1/o3/o4 系列推理模型角色转换：openai.js:2700-2710 将 system 消息强制转为 user 角色；
 * 2. 空对象与非对象消息过滤：openai.js:2605 过滤 null 与非 object 元素；
 * 3. continue / swipe 模式处理：script.js 在 PROMPT_READY 之后可能追加/裁剪历史消息与继续生成后缀；
 * 4. quietPrompt / impersonate 模式：script.js 可能注入特定静默引导词或替换角色名称；
 * 5. 真实生成与 dry-run 的 squash 差异：openai.js:1619 仅在 live 生成时执行 squash，dry-run 保持原样。
 */
import type { SendingMessage } from '@/function/event';
import type { MessageAlignment, MessageAlignmentKind, WiTraceSegment } from './types';

/** 锚点配对记录 */
type AnchorPair = { t0Index: number; finalIndex: number };

/** T0 到 T_final 的消息映射信息 */
type T0Mapping = { finalIndex: number; kind: MessageAlignmentKind; t0Indexes: number[] };

/**
 * 计算单条消息的结构指纹（多模态/非字符串不参与指纹匹配）
 * @param msg 发送消息对象
 */
export function getMessageFingerprint(msg: SendingMessage): string | null {
  if (typeof msg.content !== 'string') return null;
  const text = msg.content;
  const head = text.slice(0, 32);
  const tail = text.slice(-32);
  return `${msg.role}:${text.length}:${head}:${tail}`;
}

/**
 * pass1 头部引用锚定：从两端开头逐项比对引用与 role
 */
function findHeadMatches(t0: SendingMessage[], tFinal: SendingMessage[]): AnchorPair[] {
  const matches: AnchorPair[] = [];
  const max = Math.min(t0.length, tFinal.length);
  for (let i = 0; i < max; i++) {
    if (t0[i].role === tFinal[i].role && t0[i].content === tFinal[i].content) {
      matches.push({ t0Index: i, finalIndex: i });
    } else {
      break;
    }
  }
  return matches;
}

/**
 * pass1 尾部引用锚定：从两端末尾向前逐项比对引用与 role
 */
function findTailMatches(t0: SendingMessage[], tFinal: SendingMessage[], headCount: number): AnchorPair[] {
  const matches: AnchorPair[] = [];
  const maxTail = Math.min(t0.length - headCount, tFinal.length - headCount);
  for (let k = 0; k < maxTail; k++) {
    const t0Idx = t0.length - 1 - k;
    const tfIdx = tFinal.length - 1 - k;
    if (t0[t0Idx].role === tFinal[tfIdx].role && t0[t0Idx].content === tFinal[tfIdx].content) {
      matches.push({ t0Index: t0Idx, finalIndex: tfIdx });
    } else {
      break;
    }
  }
  return matches.reverse();
}

/**
 * 辅助构建 T0 中间段的指纹索引池
 */
function buildFingerprintPool(t0: SendingMessage[], start: number, end: number): Map<string, number[]> {
  const pool = new Map<string, number[]>();
  for (let i = start; i < end; i++) {
    const fp = getMessageFingerprint(t0[i]);
    if (!fp) continue;
    const list = pool.get(fp) ?? [];
    list.push(i);
    pool.set(fp, list);
  }
  return pool;
}

/**
 * pass2 指纹匹配：处理中间段因全量重构导致引用改变但内容一致的场景
 */
function findFingerprintMatches(
  t0: SendingMessage[],
  tFinal: SendingMessage[],
  headCount: number,
  tailCount: number,
): AnchorPair[] {
  const t0End = t0.length - tailCount;
  const tfEnd = tFinal.length - tailCount;
  const pool = buildFingerprintPool(t0, headCount, t0End);
  const matches: AnchorPair[] = [];
  let t0SearchStart = headCount;

  for (let tfIdx = headCount; tfIdx < tfEnd; tfIdx++) {
    const fp = getMessageFingerprint(tFinal[tfIdx]);
    if (!fp) continue;
    const candidates = pool.get(fp);
    if (!candidates?.length) continue;
    const matchedIdx = candidates.find(
      idx => idx >= t0SearchStart && t0[idx].role === tFinal[tfIdx].role && t0[idx].content === tFinal[tfIdx].content,
    );
    if (matchedIdx !== undefined) {
      matches.push({ t0Index: matchedIdx, finalIndex: tfIdx });
      pool.set(
        fp,
        candidates.filter(idx => idx !== matchedIdx),
      );
      t0SearchStart = matchedIdx + 1;
    }
  }
  return matches;
}

/**
 * 辅助检查 t0 消息是否可继续合并进当前 tFinal 消息
 */
function shouldMergeIntoCurrent(
  t0: SendingMessage[],
  tFinal: SendingMessage[],
  t0Idx: number,
  tfIdx: number,
  tfEnd: number,
): boolean {
  const role = t0[t0Idx].role;
  const nextTfWithSameRole = tFinal.slice(tfIdx + 1, tfEnd).some(m => m.role === role);
  if (!nextTfWithSameRole) return true;
  const currText = typeof tFinal[tfIdx].content === 'string' ? tFinal[tfIdx].content : '';
  const nextText = typeof tFinal[tfIdx + 1]?.content === 'string' ? tFinal[tfIdx + 1].content : '';
  const msgText = typeof t0[t0Idx].content === 'string' ? t0[t0Idx].content : '';
  if (msgText && currText.includes(msgText) && !nextText.includes(msgText)) return true;
  return false;
}

/**
 * 区间内多对多 / 多对一消息序列匹配
 */
function matchIntervalMessages(
  t0: SendingMessage[],
  tFinal: SendingMessage[],
  t0Start: number,
  t0End: number,
  tfStart: number,
  tfEnd: number,
): MessageAlignment[] {
  const alignments: MessageAlignment[] = [];
  let t0Cursor = t0Start;

  for (let tfIdx = tfStart; tfIdx < tfEnd; tfIdx++) {
    const tfRole = tFinal[tfIdx].role;
    const assigned: number[] = [];

    while (t0Cursor < t0End && t0[t0Cursor].role === tfRole) {
      if (assigned.length > 0 && !shouldMergeIntoCurrent(t0, tFinal, t0Cursor, tfIdx, tfEnd)) {
        break;
      }
      assigned.push(t0Cursor++);
    }

    alignments.push(toAlignmentRecord(t0, tFinal[tfIdx], tfIdx, assigned));
  }

  if (t0Cursor < t0End) {
    const deleted = Array.from({ length: t0End - t0Cursor }, (_, k) => t0Cursor + k);
    alignments.push({ finalIndex: -1, t0Indexes: deleted, kind: 'deleted' });
  }

  return alignments;
}

/** 依据 t0 分配结果生成单条最终消息的对齐记录（0→injected，1→exact/modified，N→merged） */
function toAlignmentRecord(
  t0: SendingMessage[],
  tfMsg: SendingMessage,
  tfIdx: number,
  assigned: number[],
): MessageAlignment {
  if (assigned.length === 0) return { finalIndex: tfIdx, t0Indexes: assigned, kind: 'injected' };
  if (assigned.length === 1) {
    const isExact = t0[assigned[0]].content === tfMsg.content;
    return { finalIndex: tfIdx, t0Indexes: assigned, kind: isExact ? 'exact' : 'modified' };
  }
  return { finalIndex: tfIdx, t0Indexes: assigned, kind: 'merged' };
}

/**
 * pass3 区间配对：根据未对齐的 T0 与 T_final 区间判定对齐类型
 */
function resolveInterval(
  t0: SendingMessage[],
  tFinal: SendingMessage[],
  t0Start: number,
  t0End: number,
  tfStart: number,
  tfEnd: number,
): MessageAlignment[] {
  const t0Len = t0End - t0Start;
  const tfLen = tfEnd - tfStart;
  if (t0Len === 0 && tfLen === 0) return [];
  if (t0Len === 0 && tfLen > 0) return resolveInjected(tfStart, tfEnd);
  if (t0Len > 0 && tfLen === 0) return resolveDeleted(t0Start, t0End);
  if (t0Len === tfLen) {
    const res: MessageAlignment[] = [];
    for (let k = 0; k < t0Len; k++) {
      const isExact = t0[t0Start + k].role === tFinal[tfStart + k].role && t0[t0Start + k].content === tFinal[tfStart + k].content;
      res.push({ finalIndex: tfStart + k, t0Indexes: [t0Start + k], kind: isExact ? 'exact' : 'modified' });
    }
    return res;
  }
  if (t0Len > 1 && tfLen === 1) return resolveMerged(t0Start, t0End, tfStart);
  return matchIntervalMessages(t0, tFinal, t0Start, t0End, tfStart, tfEnd);
}

/** 区间全部为外部注入 */
function resolveInjected(tfStart: number, tfEnd: number): MessageAlignment[] {
  const res: MessageAlignment[] = [];
  for (let i = tfStart; i < tfEnd; i++) {
    res.push({ finalIndex: i, t0Indexes: [], kind: 'injected' });
  }
  return res;
}

/** 区间全部为删除 */
function resolveDeleted(t0Start: number, t0End: number): MessageAlignment[] {
  const t0Indexes = Array.from({ length: t0End - t0Start }, (_, k) => t0Start + k);
  return [{ finalIndex: -1, t0Indexes, kind: 'deleted' }];
}

/** 多条合并为一条 */
function resolveMerged(t0Start: number, t0End: number, tfStart: number): MessageAlignment[] {
  const t0Indexes = Array.from({ length: t0End - t0Start }, (_, k) => t0Start + k);
  return [{ finalIndex: tfStart, t0Indexes, kind: 'merged' }];
}

/**
 * 汇总两端锚点之间的所有间隙并完成区间配对
 */
function resolveAllIntervals(
  t0: SendingMessage[],
  tFinal: SendingMessage[],
  anchors: AnchorPair[],
  t0Len: number,
  tfLen: number,
): MessageAlignment[] {
  const alignments: MessageAlignment[] = [];
  const fullAnchors: AnchorPair[] = [
    { t0Index: -1, finalIndex: -1 },
    ...anchors,
    { t0Index: t0Len, finalIndex: tfLen },
  ];

  for (let i = 0; i < fullAnchors.length - 1; i++) {
    const current = fullAnchors[i];
    const next = fullAnchors[i + 1];
    const intervalAlignments = resolveInterval(
      t0,
      tFinal,
      current.t0Index + 1,
      next.t0Index,
      current.finalIndex + 1,
      next.finalIndex,
    );
    alignments.push(...intervalAlignments);
    if (next.finalIndex >= 0 && next.finalIndex < tfLen) {
      alignments.push({ finalIndex: next.finalIndex, t0Indexes: [next.t0Index], kind: 'exact' });
    }
  }
  return alignments.sort((a, b) => a.finalIndex - b.finalIndex);
}

/**
 * T0 ↔ T_final 消息级对齐纯函数
 * @param t0 基准消息列表（PROMPT_READY 快照）
 * @param tFinal 最终消息列表（SETTINGS_READY 消息）
 */
export function alignMessages(t0: SendingMessage[], tFinal: SendingMessage[]): MessageAlignment[] {
  if (!t0.length && !tFinal.length) return [];
  const headMatches = findHeadMatches(t0, tFinal);
  const tailMatches = findTailMatches(t0, tFinal, headMatches.length);
  const midMatches = findFingerprintMatches(t0, tFinal, headMatches.length, tailMatches.length);
  const allAnchors = [...headMatches, ...midMatches, ...tailMatches].sort((a, b) => a.finalIndex - b.finalIndex);
  return resolveAllIntervals(t0, tFinal, allAnchors, t0.length, tFinal.length);
}

/**
 * 计算合并消息中各原始 T0 消息在最终文本中的基础偏移
 */
function computeT0BaseOffsetInFinal(
  t0: SendingMessage[],
  tFinalMsg: SendingMessage | undefined,
  t0Indexes: number[],
  targetT0Idx: number,
): number {
  if (!tFinalMsg || typeof tFinalMsg.content !== 'string') return 0;
  const finalText = tFinalMsg.content;
  let cursor = 0;

  for (const idx of t0Indexes) {
    const rawContent = t0[idx]?.content;
    const msgText = typeof rawContent === 'string' ? rawContent : '';
    let pos = -1;
    if (msgText) {
      pos = finalText.indexOf(msgText, cursor);
    }
    const offset = pos !== -1 ? pos : cursor;
    if (idx === targetT0Idx) {
      return offset;
    }
    cursor = pos !== -1 ? pos + msgText.length : cursor + msgText.length + 1;
  }
  return 0;
}

/**
 * 投影单个溯源片段到 T_final 消息
 */
function projectSingleSegment(
  seg: WiTraceSegment,
  mapping: T0Mapping,
  t0?: SendingMessage[],
  tFinal?: SendingMessage[],
): WiTraceSegment {
  const isExact = mapping.kind === 'exact';
  if (isExact || !t0 || !tFinal) {
    return {
      ...seg,
      messageIndex: mapping.finalIndex,
      verified: isExact ? seg.verified : false,
      note: isExact ? seg.note : seg.note || '内容已改写，偏移仅供参考',
    };
  }

  const { start, end, matched } = computeProjection(seg, mapping, t0, tFinal);
  return {
    ...seg,
    messageIndex: mapping.finalIndex,
    start,
    end,
    verified: matched ? seg.verified : false,
    note: matched && seg.verified ? seg.note : seg.note || '内容已改写，偏移仅供参考',
  };
}

/**
 * 计算非 exact 段投影到最终消息后的区间与等值校验结果（merged 时按拼接基准偏移平移）
 */
function computeProjection(
  seg: WiTraceSegment,
  mapping: T0Mapping,
  t0: SendingMessage[],
  tFinal: SendingMessage[],
): { start: number; end: number; matched: boolean } {
  const finalMsg = tFinal[mapping.finalIndex];
  const finalText = typeof finalMsg?.content === 'string' ? finalMsg.content : '';
  const baseOffset =
    mapping.kind === 'merged'
      ? computeT0BaseOffsetInFinal(t0, finalMsg, mapping.t0Indexes, seg.messageIndex)
      : 0;

  const start = baseOffset + seg.start;
  const end = baseOffset + seg.end;
  const t0Content = t0[seg.messageIndex]?.content;
  const expectedText = typeof t0Content === 'string' ? t0Content.slice(seg.start, seg.end) : '';
  const matched = expectedText ? finalText.slice(start, end) === expectedText : false;
  return { start, end, matched };
}

/**
 * 构造 T0 索引到最终消息的映射字典
 */
function buildT0ToFinalMap(alignments: MessageAlignment[]): Map<number, T0Mapping> {
  const map = new Map<number, T0Mapping>();
  for (const align of alignments) {
    for (const t0Idx of align.t0Indexes) {
      map.set(t0Idx, { finalIndex: align.finalIndex, kind: align.kind, t0Indexes: align.t0Indexes });
    }
  }
  return map;
}

/**
 * 在最终消息中按原内容切片等值重锚段位置
 * @param seg 原始段（messageIndex/start/end 基于 T0）
 * @param t0 基准消息列表
 * @param tFinal 最终消息列表
 */
export function reanchorSegmentInFinal(
  seg: WiTraceSegment,
  t0: SendingMessage[],
  tFinal: SendingMessage[],
): WiTraceSegment | null {
  const t0Content = t0[seg.messageIndex]?.content;
  if (typeof t0Content !== 'string') return null;
  const expectedText = t0Content.slice(seg.start, seg.end);
  if (expectedText.length < 12) return null;

  for (let fIdx = 0; fIdx < tFinal.length; fIdx++) {
    const fContent = tFinal[fIdx]?.content;
    if (typeof fContent !== 'string') continue;
    const pos = fContent.indexOf(expectedText);
    if (pos === -1) continue;
    return {
      ...seg,
      messageIndex: fIdx,
      start: pos,
      end: pos + expectedText.length,
      verified: true,
      note: seg.note || '原消息被外部合并/移动，内容已按等值重锚',
    };
  }
  return null;
}

/**
 * 投影单个段并在投影失效或未验证时尝试等值重锚
 */
function projectOrReanchorSegment(
  seg: WiTraceSegment,
  mapping: T0Mapping | undefined,
  t0?: SendingMessage[],
  tFinal?: SendingMessage[],
): WiTraceSegment | null {
  if (mapping && mapping.kind === 'exact') {
    return projectSingleSegment(seg, mapping, t0, tFinal);
  }
  const candidate =
    mapping && mapping.finalIndex >= 0 ? projectSingleSegment(seg, mapping, t0, tFinal) : null;
  if (candidate?.verified) return candidate;

  if (t0 && tFinal) {
    const reanchored = reanchorSegmentInFinal(seg, t0, tFinal);
    if (reanchored) return reanchored;
  }
  return candidate;
}

/**
 * 把基于 T0 空间的溯源片段映射到 T_final 空间
 * @param segments 原始定位片段（messageIndex 基于 T0）
 * @param alignments 消息对齐映射表
 * @param t0 基准消息列表（可选）
 * @param tFinal 最终消息列表（可选）
 */
export function projectSegmentsToFinal(
  segments: WiTraceSegment[],
  alignments: MessageAlignment[],
  t0?: SendingMessage[],
  tFinal?: SendingMessage[],
): WiTraceSegment[] {
  const t0ToFinal = buildT0ToFinalMap(alignments);
  const projected: WiTraceSegment[] = [];

  for (const seg of segments) {
    const res = projectOrReanchorSegment(seg, t0ToFinal.get(seg.messageIndex), t0, tFinal);
    if (res) projected.push(res);
  }
  return projected;
}
