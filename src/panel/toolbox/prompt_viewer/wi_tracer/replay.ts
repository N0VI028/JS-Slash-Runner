import {
  baseChatReplace,
  extension_prompt_roles,
  extension_prompt_types,
  getCharacterCardFields,
  main_api,
  parseMesExamples,
  substituteParams,
} from '@sillytavern/script';
import { oai_settings, setOpenAIMessageExamples } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { DEFAULT_DEPTH, wi_anchor_position, world_info_position } from '@sillytavern/scripts/world-info';
import {
  decomposeAuthorNote as decomposeAuthorNotePure,
  getWiFormatPrefixLength as getWiFormatPrefixLengthPure,
} from './pure_replay';
import { joinWithSpans } from './spans';
import type {
  ExtPromptPart,
  ExtPromptSnapshot,
  WiBuckets,
  WiDepthBucket,
  WiEntrySnapshot,
  WiSegment,
} from './types';

/** world-info.js:88 的排序函数：order 降序 */
const WI_SORT_FN = (a: { order: number }, b: { order: number }) => b.order - a.order;

/** 示例块来源：世界书 EM 条目或角色卡 */
export type ExampleBlockSource = {
  source: 'wi' | 'card';
  entry: WiSegment['entry'] | null;
  block: string;
};

/** 作者注释分解结果 */
export type AuthorNoteSpans = ReturnType<typeof decomposeAuthorNotePure>;

/**
 * 计算条目进入提示词的最终段落文本
 * 镜像 world-info.js:5106-5107 的 getRegexedString 调用参数
 * @param entry 激活条目快照
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
 * 全量条目按 order 降序排序后逐条 unshift，使各桶内呈 order 升序
 * @param entries 全量激活条目快照
 */
export function buildWiBuckets(entries: WiEntrySnapshot[]): WiBuckets {
  const buckets: WiBuckets = { before: [], after: [], depth: [], em: [], anTop: [], anBottom: [], outlets: {} };
  const sorted = [...entries].sort(WI_SORT_FN);

  for (const entry of sorted) {
    const text = wiSegmentText(entry);
    if (!text) continue;
    dispatchSegmentToBucket(buckets, { entry, text });
  }

  return buckets;
}

/**
 * 将单个段文本分发至对应位置的桶中
 * @param buckets 分桶集合
 * @param segment 段数据
 */
function dispatchSegmentToBucket(buckets: WiBuckets, segment: WiSegment): void {
  switch (segment.entry.position) {
    case world_info_position.before:
      buckets.before.unshift(segment);
      break;
    case world_info_position.after:
      buckets.after.unshift(segment);
      break;
    case world_info_position.EMTop:
      buckets.em.unshift({ anchor: wi_anchor_position.before, segment });
      break;
    case world_info_position.EMBottom:
      buckets.em.unshift({ anchor: wi_anchor_position.after, segment });
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
}

/**
 * 镜像 world-info.js:5137-5148 的 atDepth 分桶
 * @param depth 深度桶列表
 * @param segment 待加入的段
 */
function addDepthSegment(depth: WiDepthBucket[], segment: WiSegment): void {
  const entry = segment.entry;
  const role = entry.role ?? extension_prompt_roles.SYSTEM;
  const index = depth.findIndex(item => item.depth === (entry.depth ?? DEFAULT_DEPTH) && item.role === role);
  if (index !== -1) {
    depth[index].segments.unshift(segment);
  } else {
    depth.push({ depth: entry.depth ?? DEFAULT_DEPTH, role, segments: [segment] });
  }
}

/**
 * 镜像 world-info.js:5150-5160 的 outlet 分桶
 * @param outlets outlet 分组字典
 * @param segment 待加入的段
 */
function addOutletSegment(outlets: Record<string, WiSegment[]>, segment: WiSegment): void {
  const name = segment.entry.outletName;
  if (!name) return;
  outlets[name] = [...(outlets[name] ?? []), segment];
}

/**
 * 重放 script.js:3242 getExtensionPrompt(IN_CHAT, depth, '\n', role, wrap=false)
 * 段值经 trim（'each'）后按 '\n' 拼接，再整体替换宏
 * @param depth 目标深度
 * @param role 目标角色
 * @param source 扩展提示词快照数组
 */
export async function replayExtensionPromptPart(
  depth: number,
  role: number,
  source: ExtPromptSnapshot[],
): Promise<{ value: string; parts: ExtPromptPart[] }> {
  const filtered = await filterExtensionPromptItems(depth, role, source);
  const joined = joinWithSpans(
    filtered.map(item => item.value),
    { trim: 'each' },
  );
  const parts = filtered.map((item, index) => ({ key: item.key, value: item.value, ...joined.spans[index] }));
  // 镜像 script.js:3267：拼接后整体替换宏
  return { value: substituteParams(joined.text), parts };
}

/**
 * 过滤并规范化属于目标深度和角色的扩展提示词条目
 * @param depth 目标深度
 * @param role 目标角色
 * @param source 扩展提示词快照
 */
async function filterExtensionPromptItems(
  depth: number,
  role: number,
  source: ExtPromptSnapshot[],
): Promise<Array<{ key: string; value: string }>> {
  const parts: Array<{ key: string; value: string }> = [];
  const sorted = [...source].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  for (const prompt of sorted) {
    if (!prompt || prompt.position != extension_prompt_types.IN_CHAT || !prompt.value) continue;
    if (prompt.depth !== undefined && prompt.depth !== depth) continue;
    if (prompt.role !== undefined && prompt.role !== role) continue;
    if (typeof prompt.filter === 'function' && !(await (prompt.filter as () => Promise<boolean>)())) continue;
    parts.push({ key: prompt.key, value: String(prompt.value).trim() });
  }

  return parts;
}

/**
 * 分解作者注释值：镜像 world-info.js:5172 的合并公式
 * @param value 作者注释快照值
 * @param topSegments ANTop 段列表
 * @param bottomSegments ANBottom 段列表
 */
export function decomposeAuthorNote(
  value: string,
  topSegments: WiSegment[],
  bottomSegments: WiSegment[],
): AuthorNoteSpans {
  return decomposeAuthorNotePure(
    value,
    topSegments.map(item => item.text),
    bottomSegments.map(item => item.text),
  );
}

/**
 * 重放 script.js:4557 / 4580-4596 的对话示例组装顺序
 * 角色卡示例居中，EM 前置条目逆序插到开头，EM 后置条目顺序追加到结尾
 * @param buckets 世界书分桶集合
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
    composition =
      item.anchor === wi_anchor_position.before ? [...sourced, ...composition] : [...composition, ...sourced];
  }

  return composition;
}

/**
 * 取一个示例块解析出的消息内容列表
 * 镜像 script.js:4776 setOpenAIMessageExamples 的逐块转换
 * @param block 单个示例对话文本块
 */
export function getExampleMessageContents(block: string): string[] {
  const parsed = (setOpenAIMessageExamples([block])[0] ?? []) as Array<{ content?: unknown }>;
  return parsed.map(item => String(item?.content ?? ''));
}

/**
 * 计算 wi_format 模板中 {0} 占位符之前的前缀长度
 * 读 oai_settings.wi_format（openai.js:87 导出）；该字段由设置面板与 oai_settings 双向同步
 */
export function getWiFormatPrefixLength(): number | null {
  const format = String(oai_settings.wi_format ?? '{0}');
  return getWiFormatPrefixLengthPure(format, substituteParams);
}
