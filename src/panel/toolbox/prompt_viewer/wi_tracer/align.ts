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

/** 前看窗口的最大步数 */
const LOOKAHEAD_MAX = 5;

/** 对齐单步动作：配对 / 跳过 display 侧消息 / 跳过最终消息 */
type AlignStep = 'pair' | 'skip-display' | 'skip-post';

/**
 * 贪心对齐 display（EJS 前）与 messages（EJS 后）两个消息序列
 * 空消息（content 为 falsy）在最终序列中已被剔除，由 decideStep 逐侧跳过；
 * 无法配对的 display 消息不进入结果（其溯源段将被丢弃）
 * @param display squash 录制构建的消息序列
 * @param messages 最终消息序列
 */
export function alignMessages(display: MessageLike[], messages: MessageLike[]): Map<number, MessagePair> {
  const pairs = new Map<number, MessagePair>();
  let i = 0;
  let j = 0;

  while (i < display.length && j < messages.length) {
    const step = decideStep(display, messages, i, j);
    if (step === 'skip-post') j++;
    else if (step === 'skip-display') i++;
    else {
      pairs.set(i, { messageIndex: j, pre: display[i].content, post: messages[j].content });
      i++;
      j++;
    }
  }

  return pairs;
}

/**
 * 判定对齐的单步动作
 * 空消息只推进该侧游标、不产生配对也不消耗对侧（否则空消息处会连锁错配）；
 * 内容全等直接配对；前看命中则推进对应游标；前看全部落空时，同角色视为 EJS 改写配对（pre/post 内容不同），
 * 角色不同则丢弃当前最终消息
 * @param display squash 录制构建的消息序列
 * @param messages 最终消息序列
 * @param i display 侧游标
 * @param j 最终消息侧游标
 */
function decideStep(display: MessageLike[], messages: MessageLike[], i: number, j: number): AlignStep {
  const d = display[i];
  const m = messages[j];
  if (!d.content) return 'skip-display';
  if (!m.content) return 'skip-post';
  if (sameMessage(d, m)) return 'pair';

  const lookahead = findLookahead(display, messages, i, j);
  if (lookahead) return lookahead;
  return d.role === m.role ? 'pair' : 'skip-post';
}

/**
 * 窗口式前看：在 k = 1..5 内先查 messages[j + k] 是否与 display[i] 全等（post 侧插入了新消息），
 * 再查 display[i + k] 是否与 messages[j] 全等（display 侧消息在最终序列中消失，例如 EJS 全渲染为空被剔除）
 * @param display squash 录制构建的消息序列
 * @param messages 最终消息序列
 * @param i display 侧游标
 * @param j 最终消息侧游标
 */
function findLookahead(display: MessageLike[], messages: MessageLike[], i: number, j: number): AlignStep | null {
  for (let k = 1; k <= LOOKAHEAD_MAX; k++) {
    if (j + k < messages.length && sameMessage(display[i], messages[j + k])) return 'skip-post';
    if (i + k < display.length && sameMessage(display[i + k], messages[j])) return 'skip-display';
  }
  return null;
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
 * 先按期望文本唯一出现位置重定位，再尝试字面量顺序游走匹配，
 * 仍失败时仅当段覆盖整条消息才整条标注，否则返回 null（由 addSegment 记为 project-null）
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
  const rendered_hit = matchRenderedSpan(expected, post);
  if (rendered_hit) return rendered_hit;
  if (start === 0 && end === pre.length) {
    return { start: 0, end: post.length };
  }
  return null;
}

/**
 * 渲染感知匹配：段文本是渲染前原文（可能含 <%...%> 标签），post 中已无该原文
 * 按标签切出非空字面量后在 post 内顺序游走：命中的字面量推进游标，
 * 未命中的跳过（条件分支未选中、_%> 吞掉边界空白而致分隔换行消失）；
 * 首命中字面量为锚点，锚点在 post 中不唯一则判为歧义返回 null
 * @param expected 段文本（pre 坐标系原文）
 * @param post EJS 后消息内容
 */
function matchRenderedSpan(expected: string, post: string): ProjectedSpan | null {
  const literals = expected.split(/<%[\s\S]*?%>/).map(literal => literal.trim()).filter(literal => literal !== '');
  if (literals.length === 0) return null;

  let cursor = 0;
  let start = -1;
  for (const lit of literals) {
    const at = post.indexOf(lit, cursor);
    if (at === -1) continue;
    if (start === -1) {
      if (post.indexOf(lit) !== post.lastIndexOf(lit)) return null;
      start = at;
    }
    cursor = at + lit.length;
  }

  return start === -1 ? null : { start, end: cursor };
}
