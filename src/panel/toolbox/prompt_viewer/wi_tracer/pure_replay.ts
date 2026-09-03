/**
 * 世界书条目追溯 · 纯函数重放工具（无 ST 依赖，可单测）
 *
 * 这些函数镜像 SillyTavern 源码中「字符串拼接 / 偏移计算」的算术逻辑，
 * 不 import 任何 @sillytavern 模块，保证在 vitest node 环境可运行。
 * ST 依赖的构建重放（getRegexedString / getExtensionPrompt / squash 等）
 * 在 replay.ts 中调用本文件并补充 ST 部分。
 */

/** squash 豁免表，镜像 openai.js:3848 */
const SQUASH_EXCLUDE = ['newMainChat', 'newChat', 'groupNudge'];

/** squash 重放输出：一条消息及其吸收的来源消息区间 */
export type SquashOutput = {
  content: string;
  role: string;
  name: unknown;
  identifier: string | undefined;
  squashable: boolean;
  children: Array<{ identifier: string | undefined; role: string; content: string; start: number; end: number }>;
};

/** 取消息内容的字符串形态（非字符串一律视为空串） */
export function textContent(content: unknown): string {
  return typeof content === 'string' ? content : '';
}

/**
 * 用 '\n' 拼接若干段文本，给出各段在拼接结果中的 [start, end) 区间
 * 镜像 world-info.js:5167 / 5168 的 join('\n')
 * @param texts 段文本数组
 * @param offset 整体平移量（用于 squash/strip 造成的前移）
 */
export function spansOfJoinedTexts(texts: string[], offset: number): Array<{ start: number; end: number }> {
  let cursor = offset;
  return texts.map(text => {
    const span = { start: cursor, end: cursor + text.length };
    cursor += text.length + 1;
    return span;
  });
}

/**
 * 分解作者注释值：镜像 world-info.js:5172 的合并公式
 * `${top}\n${orig}\n${bottom}` 去掉首尾各一个换行
 * 纯算术求出各段在当前值中的区间，并重组校验
 */
export function decomposeAuthorNote(
  value: string,
  topTexts: string[],
  bottomTexts: string[],
): {
  origStart: number;
  origEnd: number;
  topSpans: Array<{ start: number; end: number }>;
  bottomSpans: Array<{ start: number; end: number }>;
  verified: boolean;
} {
  const top = topTexts.join('\n');
  const bottom = bottomTexts.join('\n');
  // 模板去掉开头一个 '\n'（top 为空或以 '\n' 开头时）与结尾一个 '\n'（bottom 为空或以 '\n' 结尾时）
  const leadAdj = top.length === 0 || top.startsWith('\n') ? 1 : 0;
  const trailAdj = bottom.length === 0 || bottom.endsWith('\n') ? 1 : 0;
  // value 长度 = 模板长度 - 剥离量，反解出原文段长度
  const origLen = value.length + leadAdj + trailAdj - top.length - bottom.length - 2;
  const origStart = top.length + 1 - leadAdj;
  const origEnd = origStart + origLen;
  if (origLen < 0) {
    return { origStart, origEnd, topSpans: [], bottomSpans: [], verified: false };
  }
  // top 段位于值首，leadAdj 使首段起点钳制到 0；bottom 段从原文段之后开始
  const topSpans = spansOfJoinedTexts(topTexts, -leadAdj).map((span, i) =>
    i === 0 ? { ...span, start: Math.max(0, span.start) } : span,
  );
  const bottomSpans = spansOfJoinedTexts(bottomTexts, origEnd + 1).map((span, i, all) =>
    i === all.length - 1 ? { ...span, end: span.end - trailAdj } : span,
  );
  const orig = value.slice(origStart, origEnd);
  const reassembled = `${top}\n${orig}\n${bottom}`.replace(/(^\n)|(\n$)/g, '');
  return { origStart, origEnd, topSpans, bottomSpans, verified: reassembled === value };
}

/** 判断 squash 是否会处理该消息：system 且无 name 且不在豁免表（镜像 openai.js:3860-3862） */
export function isSquashable(role: string, name: unknown, identifier: string | undefined, content: unknown): boolean {
  return role === 'system' && !name && typeof content === 'string' && !SQUASH_EXCLUDE.includes(identifier ?? '');
}

/**
 * 计算 wi_format 模板中占位符前的前缀长度
 * @param format wi_format 字符串（如 '[Details]\n{0}'）
 * @param substitute 宏替换函数（测试中可传恒等）
 * @returns 前缀长度；占位符数量不为 1 时返回 null（无法算术定位）
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
 * 重放 openai.js:3847 squashSystemMessages 的合并过程
 * 输入为合并前的扁平消息（含空消息），输出各存活消息及其吸收的来源消息区间
 */
export function replaySquash(
  pre: Array<{ identifier: string | undefined; role: string; content: string; name: unknown }>,
): SquashOutput[] {
  const outputs: SquashOutput[] = [];
  for (const info of pre) {
    if (info.role === 'system' && !info.content) continue;
    const squashable = isSquashable(info.role, info.name, info.identifier, info.content);
    const last = outputs[outputs.length - 1];
    if (squashable && last?.squashable) {
      const start = last.content.length + 1;
      last.content = `${last.content}\n${info.content}`;
      last.children.push({
        identifier: info.identifier,
        role: info.role,
        content: info.content,
        start,
        end: start + info.content.length,
      });
    } else {
      outputs.push({
        content: info.content,
        role: info.role,
        name: info.name,
        identifier: info.identifier,
        squashable,
        children: [
          { identifier: info.identifier, role: info.role, content: info.content, start: 0, end: info.content.length },
        ],
      });
    }
  }
  return outputs;
}
