/**
 * EJS 前后消息序列对齐与区间投影
 */

/** 参与对齐的消息精简形态 */
export type MessageLike = { role: string; content: string };

/** display 消息与最终消息的配对结果 */
export type MessagePair = {
  /** 对应最终消息的下标 */
  messageIndex: number;
  /** EJS 前内容（display 坐标系） */
  pre: string;
  /** EJS 后内容（最终消息坐标系） */
  post: string;
};

/** 区间投影结果 */
export type ProjectedSpan = { start: number; end: number };

/**
 * 计算两字符串的最长公共前缀长度
 * @param a 左字符串
 * @param b 右字符串
 */
function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/**
 * 计算两字符串的最长公共后缀长度
 * @param a 左字符串
 * @param b 右字符串
 */
function commonSuffixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/**
 * 贪心对齐 display（EJS 前）与 messages（EJS 后）两个消息序列
 * 内容全等则直接配对；否则向前看一步区分插入 / 删除，
 * 同位同角色视为改写配对；无法配对的 display 消息不进入结果（其溯源段将被丢弃）
 * @param display squash 录制构建的消息序列
 * @param messages 最终消息序列
 */
export function alignMessages(display: MessageLike[], messages: MessageLike[]): Map<number, MessagePair> {
  const pairs = new Map<number, MessagePair>();
  let i = 0;
  let j = 0;

  while (i < display.length && j < messages.length) {
    const d = display[i];
    const m = messages[j];

    if (sameMessage(d, m)) {
      pairs.set(i, { messageIndex: j, pre: d.content, post: m.content });
      i++;
      j++;
      continue;
    }
    if (j + 1 < messages.length && sameMessage(d, messages[j + 1])) {
      j++;
      continue;
    }
    if (i + 1 < display.length && sameMessage(display[i + 1], m)) {
      i++;
      continue;
    }
    if (d.role === m.role) {
      pairs.set(i, { messageIndex: j, pre: d.content, post: m.content });
      i++;
      j++;
      continue;
    }
    j++;
  }

  return pairs;
}

/**
 * 角色与内容是否完全一致
 * @param a display 侧消息
 * @param b 最终消息侧消息
 */
function sameMessage(a: MessageLike, b: MessageLike): boolean {
  return a.role === b.role && a.content === b.content;
}

/**
 * 把 pre 坐标系内的 [start, end) 投影到 post 坐标系
 * 公共前后缀不变区按平移量整体平移；与改写中段相交的段先在 post 中
 * 唯一查找重定位，仍失败时仅当段覆盖整条消息才整条标注，否则返回 null
 * @param pre EJS 前消息内容
 * @param post EJS 后消息内容
 * @param start 段起点（pre 坐标系）
 * @param end 段终点（pre 坐标系）
 */
export function projectSpan(pre: string, post: string, start: number, end: number): ProjectedSpan | null {
  if (pre === post) return { start, end };

  const head = commonPrefixLength(pre, post);
  const tail = Math.min(commonSuffixLength(pre, post), pre.length - head, post.length - head);
  const shift = post.length - pre.length;
  const pre_tail_start = pre.length - tail;

  if (end <= head) return { start, end };
  if (start >= pre_tail_start) return { start: start + shift, end: end + shift };
  return relocateSpan(pre, post, start, end);
}

/**
 * 与改写中段相交的段在 post 坐标系内兜底重定位
 * 先按期望文本唯一出现位置重定位；仍失败时仅当段覆盖整条消息才整条标注，否则返回 null
 * @param pre EJS 前消息内容
 * @param post EJS 后消息内容
 * @param start 段起点（pre 坐标系）
 * @param end 段终点（pre 坐标系）
 */
function relocateSpan(pre: string, post: string, start: number, end: number): ProjectedSpan | null {
  const expected = pre.slice(start, end);
  const first = post.indexOf(expected);
  if (first !== -1 && first === post.lastIndexOf(expected)) {
    return { start: first, end: first + expected.length };
  }
  if (start === 0 && end === pre.length) {
    return { start: 0, end: post.length };
  }
  return null;
}
