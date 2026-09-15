/** 半开区间 [start, end) */
export type Span = { start: number; end: number };

/** 拼接结果：text 为最终文本，spans 与 parts 一一对应且落在 text 坐标系内 */
export type Joined = { text: string; spans: Span[] };

/**
 * 拼接时的空白裁剪语义
 * - none：裸 join
 * - each：每段 trim 后 join（镜像 script.js:3259 getExtensionPrompt）
 * - whole：join 后对整体 trim（镜像 openai.js:849 populationInjectionPrompts）
 */
export type TrimMode = 'none' | 'each' | 'whole';

/** joinWithSpans 的可选项 */
export type JoinOptions = {
  /** 段间分隔符，缺省 '\n' */
  separator?: string;
  /** 裁剪语义，缺省 'none' */
  trim?: TrimMode;
};

/**
 * 计算文本前导空白长度
 * @param text 待测文本
 */
export function leadingTrimLength(text: string): number {
  return text.length - text.trimStart().length;
}

/**
 * 拼接若干段文本并给出各段在最终文本坐标系中的 [start, end)
 * @param parts 段文本数组
 * @param options 分隔符与裁剪语义
 */
export function joinWithSpans(parts: string[], options: JoinOptions = {}): Joined {
  const separator = options.separator ?? '\n';
  const trim = options.trim ?? 'none';
  const normalized = trim === 'each' ? parts.map(part => part.trim()) : parts;
  const raw = normalized.join(separator);
  const lead = trim === 'whole' ? leadingTrimLength(raw) : 0;

  return {
    text: trim === 'whole' ? raw.trim() : raw,
    spans: walkSpans(normalized, separator, lead),
  };
}

/**
 * 沿拼接文本累加各段区间
 * 段尾不做收敛，保证与既有算术逐字符一致（尾随空白不影响调用方的等值校验）
 * @param parts 已归一化的段文本
 * @param separator 段间分隔符
 * @param lead 整体裁剪导致的左移量
 */
function walkSpans(parts: string[], separator: string, lead: number): Span[] {
  let cursor = 0;
  return parts.map(part => {
    const start = Math.max(0, cursor - lead);
    cursor += part.length + separator.length;
    return { start, end: start + part.length };
  });
}

/**
 * 尾锚定定位：注入内容恒在消息尾部，先校验后缀再折算回消息内容坐标系
 * @param content 消息内容全量文本
 * @param value 重放出的注入内容
 * @param part 目标段在 value 坐标系内的区间
 * @returns 段在 content 中的起点；后缀不匹配时返回 null
 */
export function locateFromEnd(content: string, value: string, part: Span): number | null {
  if (!content.endsWith(value)) return null;
  return content.length - value.length + part.start;
}
