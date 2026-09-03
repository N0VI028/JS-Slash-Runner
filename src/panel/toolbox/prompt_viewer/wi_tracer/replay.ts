/**
 * SillyTavern「世界书 → 聊天补全消息」管线的确定性重放
 *
 * 每个函数都镜像 ST 源码的对应片段（注释标注行号），保证与真实管线逐字符一致，
 * 从而用算术偏移而非文字匹配完成追溯。
 * 纯算术部分（无 ST 依赖）在 pure_replay.ts 中实现并单测；本文件补充 ST 依赖部分。
 */
import {
  baseChatReplace,
  extension_prompt_roles,
  extension_prompt_types,
  getCharacterCardFields,
  main_api,
  parseMesExamples,
  substituteParams,
} from '@sillytavern/script';
import { setOpenAIMessageExamples } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { DEFAULT_DEPTH, wi_anchor_position, world_info_position } from '@sillytavern/scripts/world-info';
import {
  decomposeAuthorNote as decomposeAuthorNotePure,
  getWiFormatPrefixLength as getWiFormatPrefixLengthPure,
  replaySquash as replaySquashPure,
  textContent,
} from './pure_replay';
import type {
  ExtPromptPart,
  ExtPromptSnapshot,
  FlatMessageInfo,
  SquashOutput,
  WiBuckets,
  WiDepthBucket,
  WiEmItem,
  WiEntrySnapshot,
  WiSegment,
} from './types';

/** world-info.js:88 的排序函数：order 降序 */
const WI_SORT_FN = (a: { order: number }, b: { order: number }) => b.order - a.order;

/**
 * 计算条目进入提示词的最终段落文本
 * 镜像 world-info.js:5106-5107 的 getRegexedString 调用参数
 * @param entry 激活条目快照
 * @returns 经正则脚本处理后的段落文本（与进入提示词的内容一致）
 */
export function wiSegmentText(entry: { position: number; depth: number | null; content: string }): string {
  const regexDepth = entry.position === world_info_position.atDepth ? (entry.depth ?? DEFAULT_DEPTH) : null;
  return getRegexedString(entry.content, regex_placement.WORLD_INFO, {
    depth: regexDepth ?? undefined,
    isMarkdown: false,
    isPrompt: true,
  });
}

/**
 * 按条目 position 分桶，重建 world-info.js:5105-5165 的构建结果
 * 全量条目按 order 降序排序后逐条 unshift，使各桶内呈 order 升序，与 ST 完全一致
 */
export function buildWiBuckets(entries: WiEntrySnapshot[]): WiBuckets {
  const buckets: WiBuckets = { before: [], after: [], depth: [], em: [], anTop: [], anBottom: [], outlets: {} };
  [...entries].sort(WI_SORT_FN).forEach(entry => {
    const segment: WiSegment = { entry, text: wiSegmentText(entry) };
    // 镜像 world-info.js:5109-5112：正则处理后为空的条目不进入提示词
    if (!segment.text) return;
    switch (entry.position) {
      case world_info_position.before:
        buckets.before.unshift(segment);
        break;
      case world_info_position.after:
        buckets.after.unshift(segment);
        break;
      case world_info_position.EMTop:
        buckets.em.unshift({ anchor: wi_anchor_position.before, segment } satisfies WiEmItem);
        break;
      case world_info_position.EMBottom:
        buckets.em.unshift({ anchor: wi_anchor_position.after, segment } satisfies WiEmItem);
        break;
      case world_info_position.ANTop:
        buckets.anTop.unshift(segment);
        break;
      case world_info_position.ANBottom:
        buckets.anBottom.unshift(segment);
        break;
      case world_info_position.atDepth:
        addDepthSegment(buckets.depth, segment);
        break;
      case world_info_position.outlet:
        addOutletSegment(buckets.outlets, segment);
        break;
      default:
        break;
    }
  });
  return buckets;
}

/** 镜像 world-info.js:5137-5148 的 atDepth 分桶（findIndex 匹配 + unshift/push） */
function addDepthSegment(depth: WiDepthBucket[], segment: WiSegment): void {
  const entry = segment.entry;
  const role = entry.role ?? extension_prompt_roles.SYSTEM;
  const index = depth.findIndex(e => e.depth === (entry.depth ?? DEFAULT_DEPTH) && e.role === role);
  if (index !== -1) {
    depth[index].segments.unshift(segment);
  } else {
    depth.push({ depth: entry.depth, role, segments: [segment] });
  }
}

/** 镜像 world-info.js:5150-5160 的 outlet 分桶（push） */
function addOutletSegment(outlets: Record<string, WiSegment[]>, segment: WiSegment): void {
  const name = segment.entry.outletName;
  if (!name) return;
  outlets[name] = [...(outlets[name] ?? []), segment];
}

/**
 * 重放 script.js:3242 getExtensionPrompt(IN_CHAT, depth, '\n', role, wrap=false)
 * 返回拼接值与各组成部分（按 key 排序）在其中的偏移
 * @param source SETTINGS_READY 时刻的扩展提示词快照（追溯期间 extension_prompts 可能被 flushWIInjections 清除，必须读快照）
 */
export async function replayExtensionPromptPart(
  depth: number,
  role: number,
  source: ExtPromptSnapshot[],
): Promise<{ value: string; parts: ExtPromptPart[] }> {
  const parts: Array<{ key: string; value: string }> = [];
  const sorted = [...source].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const prompt of sorted) {
    if (!prompt || prompt.position != extension_prompt_types.IN_CHAT || !prompt.value) continue;
    if (prompt.depth !== undefined && prompt.depth !== depth) continue;
    if (prompt.role !== undefined && prompt.role !== role) continue;
    if (typeof prompt.filter === 'function' && !(await (prompt.filter as () => Promise<boolean>)())) continue;
    parts.push({ key: prompt.key, value: String(prompt.value).trim() });
  }
  let cursor = 0;
  const spans: ExtPromptPart[] = parts.map(part => {
    const span = { ...part, start: cursor, end: cursor + part.value.length };
    cursor += part.value.length + 1;
    return span;
  });
  // 镜像 script.js:3267：拼接后整体替换宏（WI 内容此前已替换过，通常为恒等）
  return { value: substituteParams(parts.map(part => part.value).join('\n')), parts: spans };
}

/** 作者注释分解结果（top/bottom 段区间 + 原文段区间 + 重组校验） */
export type AuthorNoteSpans = ReturnType<typeof decomposeAuthorNotePure>;

/**
 * 分解作者注释值：镜像 world-info.js:5172 的合并公式
 * `${top}\n${orig}\n${bottom}` 去掉首尾各一个换行
 * 纯算术部分委托 pure_replay；本函数负责把 WiSegment 映射为纯文本
 */
export function decomposeAuthorNote(
  value: string,
  topSegments: WiSegment[],
  bottomSegments: WiSegment[],
): AuthorNoteSpans {
  return decomposeAuthorNotePure(
    value,
    topSegments.map(s => s.text),
    bottomSegments.map(s => s.text),
  );
}

/**
 * 重放 openai.js:3847 squashSystemMessages 的合并过程
 * 输入为合并前的扁平消息（含空消息），输出各存活消息及其吸收的来源消息区间
 * 纯算术部分委托 pure_replay.replaySquash；本函数负责 FlatMessageInfo 结构适配
 */
export function replaySquash(pre: FlatMessageInfo[]): SquashOutput[] {
  const adapted = pre.map(info => ({
    identifier: info.identifier,
    role: info.role,
    content: textContent(info.content),
    name: info.name,
  }));
  return replaySquashPure(adapted).map(output => ({
    info: {
      identifier: output.identifier,
      role: output.role,
      content: output.content,
      name: output.name,
    },
    children: output.children.map(child => ({
      info: { identifier: child.identifier, role: child.role, content: child.content, name: undefined },
      start: child.start,
      end: child.end,
    })),
    squashable: output.squashable,
  }));
}

/** 示例块来源：世界书 EM 条目或角色卡 */
export type ExampleBlockSource = { source: 'wi' | 'card'; entry: WiSegment['entry'] | null; block: string };

/**
 * 重放 script.js:4557 / 4580-4596 的对话示例组装顺序
 * 角色卡示例居中，EM 前置条目逆序插到开头，EM 后置条目顺序追加到结尾
 */
export function buildExampleComposition(buckets: WiBuckets): ExampleBlockSource[] {
  const isInstruct = power_user.instruct.enabled && main_api !== 'openai';
  let composition: ExampleBlockSource[] = parseMesExamples(getCharacterCardFields().mesExamples ?? '', isInstruct).map(
    block => ({ source: 'card' as const, entry: null, block }),
  );
  for (const item of buckets.em) {
    const blocks = parseMesExamples(baseChatReplace(item.segment.text), isInstruct);
    const sourced: ExampleBlockSource[] = blocks.map(block => ({
      source: 'wi' as const,
      entry: item.segment.entry,
      block,
    }));
    composition = item.anchor === wi_anchor_position.before ? [...sourced, ...composition] : [...composition, ...sourced];
  }
  return composition;
}

/**
 * 取一个示例块解析出的消息内容列表（用于与最终消息等值校验）
 * 镜像 script.js:4776 setOpenAIMessageExamples 的逐块转换
 */
export function getExampleMessageContents(block: string): string[] {
  const parsed = (setOpenAIMessageExamples([block])[0] ?? []) as Array<{ content?: unknown }>;
  return parsed.map(item => String(item?.content ?? ''));
}

/**
 * 计算 wi_format 模板中 {0} 占位符之前的前缀（经宏替换后）长度
 * 用于把桶内偏移映射进 formatWorldInfo 的产物
 * @returns 前缀长度；占位符数量不为 1 时返回 null（无法算术定位）
 */
export function getWiFormatPrefixLength(): number | null {
  const format = String($('#wi_format_textarea').val() ?? '{0}');
  return getWiFormatPrefixLengthPure(format, substituteParams);
}
