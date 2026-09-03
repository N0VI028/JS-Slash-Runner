/**
 * 提示词查看器 · 世界书与预设条目溯源（结果发布到 wi_trace_report，由查看器 UI 内联标注）
 *
 * 查看器打开时接线 ST 事件；CHAT_COMPLETION_SETTINGS_READY 到达时，
 * 以「结构重放 + 算术偏移 + 等值校验」把查看器显示的消息定位回世界书条目与预设条目。
 * 全程不做子串搜索（文字匹配）：偏移全部来自对 ST 构建管线（world-info.js /
 * script.js / openai.js）的确定性重放，最终仅用等值比较校验。
 *
 * 竞态说明：查看器刷新会中止虚假生成，abort 链路 unblockGeneration →
 * flushWIInjections 将删除 customDepthWI_* 扩展提示词，故事件监听器内
 * 先同步快照 extension_prompts，溯源全程只读快照。
 */
import { chat_metadata, event_types, extension_prompt_types } from '@sillytavern/script';
import { ChatCompletion, promptManager } from '@sillytavern/scripts/openai';
import { metadata_keys, NOTE_MODULE_NAME, shouldWIAddPrompt } from '@sillytavern/scripts/authors-note';
import { inject_ids } from '@sillytavern/scripts/constants';
import { power_user } from '@sillytavern/scripts/power-user';
import type { SendingMessage } from '@/function/event';
import { shallowRef } from 'vue';
import { spansOfJoinedTexts, textContent } from './pure_replay';
import { resolvePresetChannels } from './preset_tracer';
import { resolveStChannels } from './st_tracer';
import {
  buildExampleComposition,
  buildWiBuckets,
  decomposeAuthorNote,
  getExampleMessageContents,
  getWiFormatPrefixLength,
  replaySquash,
} from './replay';
import {
  addSegment,
  cachedExtensionPromptPart,
  countAllInjections,
  countInjectionsBefore,
  enumerateInjectionBlocks,
  extSnapshotValue,
  findDisplayTarget,
  getMaxChatHistoryNumber,
  getRelevantDepths,
  replay_cache,
  ROLE_NAMES,
  roleName,
  snapshotExtensionPrompts,
  tracer_state,
} from './trace_helpers';
import type {
  DisplayMessage,
  DisplayTarget,
  ExtPromptPart,
  FlatMessageInfo,
  InjectionPart,
  InjectionQuery,
  TraceContext,
  WiBuckets,
  WiEntrySnapshot,
  WiSegment,
  WiTraceReport,
} from './types';

// 重新导出类型与管线算术辅助函数以保持外部兼容
export {
  tracer_state,
  ROLE_NAMES,
  roleName,
  findDisplayTarget,
  addSegment,
  extSnapshotValue,
  cachedExtensionPromptPart,
  enumerateInjectionBlocks,
  countInjectionsBefore,
  countAllInjections,
  getMaxChatHistoryNumber,
  getRelevantDepths,
};
export { sliceContent, getPresetCollection, absolutePromptsAt, getExtraOrderBlocks } from './trace_helpers';
export type { DisplayMessage, DisplayTarget, TraceContext };

/** squash 记录补丁是否已安装 */
let squash_patch_installed = false;

/** 溯源结果（响应式）：查看器 UI 读取内联标注与摘要；事件到达时先清空、溯源完成后发布 */
export const wi_trace_report = shallowRef<WiTraceReport | null>(null);

/** world_info_position → 中文位置标签 */
const POSITION_LABELS: Record<number, string> = {
  0: '前置(before)',
  1: '后置(after)',
  2: '作者注释前(ANTop)',
  3: '作者注释后(ANBottom)',
  4: '深度注入(atDepth)',
  5: '示例对话前(EMTop)',
  6: '示例对话后(EMBottom)',
  7: 'outlet',
};

/** world_info_position 枚举值 → 中文位置标签（未知值给出「位置 N」） */
function positionLabel(position: number): string {
  return POSITION_LABELS[position] ?? `位置 ${position}`;
}

/**
 * 在提示词查看器挂载时调用：注册事件监听并安装 squash 记录补丁。
 * 监听器生命周期跟随组件作用域，查看器关闭时自动清理（此后不再打印）。
 */
export function setupWorldInfoTracer(): void {
  installSquashRecorder();
  useEventSourceOn(event_types.GENERATION_STARTED, (_type, _options, dry_run) => {
    if (!dry_run) tracer_state.entries = null;
  });
  useEventSourceOn(event_types.WORLD_INFO_ACTIVATED, entries => {
    tracer_state.entries = snapshotEntries(entries);
  });
  useEventSourceOn(event_types.CHAT_COMPLETION_SETTINGS_READY, data => {
    // 必须在监听器内同步快照：下一个监听器（查看器的 collectPrompts）会立即 stopGeneration，
    // abort 链路 unblockGeneration → flushWIInjections 将删除 customDepthWI_* 扩展提示词，
    // 异步溯源若直读 extension_prompts 会与该清理产生竞态
    tracer_state.ext = snapshotExtensionPrompts();
    tracer_state.type = String((data as { type?: unknown })?.type ?? 'normal');
    tracer_state.persona_description = String(power_user.persona_description ?? '');
    wi_trace_report.value = null; // 先清空旧标注，避免新消息短暂配旧报告
    void runTrace(Array.isArray(data?.messages) ? data.messages : []);
  });
}

/** 从 WORLD_INFO_ACTIVATED 负载提取条目快照（只保留溯源所需字段） */
function snapshotEntries(entries: unknown): WiEntrySnapshot[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map(entry => ({
      world: String(entry.world ?? ''),
      uid: Number(entry.uid ?? -1),
      comment: String(entry.comment ?? ''),
      content: String(entry.content ?? ''),
      position: Number(entry.position ?? 0),
      depth: entry.depth === undefined || entry.depth === null ? null : Number(entry.depth),
      role: Number(entry.role ?? 0),
      order: Number(entry.order ?? 100),
      outletName: String(entry.outletName ?? ''),
    }));
}

/** 包装 ChatCompletion.squashSystemMessages：合并执行前记录带 identifier 的扁平结构 */
function installSquashRecorder(): void {
  if (squash_patch_installed) return;
  const proto = ChatCompletion.prototype as unknown as Record<
    string,
    (this: unknown, ...args: unknown[]) => Promise<void>
  >;
  const original = proto.squashSystemMessages;
  if (typeof original !== 'function') return;
  squash_patch_installed = true;
  proto.squashSystemMessages = async function (this: unknown, ...args: unknown[]) {
    // 注意：要展开的是根 MessageCollection（this.messages），而非 ChatCompletion 本身
    // （后者没有 .collection 属性，误传会导致 pre 恒为空数组、display 全空）
    const root = (this as { messages?: unknown }).messages;
    tracer_state.squash = { root, pre: flattenMessages(root, true) };
    return await original.apply(this, args);
  };
}

/**
 * 递归展开 MessageCollection
 * @param keep_empty true 保留空消息（镜像 squash 所见 flatten），false 按 getChat 语义跳过
 */
function flattenMessages(node: unknown, keep_empty: boolean): FlatMessageInfo[] {
  const result: FlatMessageInfo[] = [];
  for (const item of ((node as { collection?: unknown[] })?.collection ?? [])) {
    if (item && Array.isArray((item as { collection?: unknown[] }).collection)) {
      result.push(...flattenMessages(item, keep_empty));
    } else if (item) {
      const info = toFlatInfo(item);
      if (keep_empty || Boolean(info.content) || info.role === 'tool') result.push(info);
    }
  }
  return result;
}

/** 提取 Message 的标识信息 */
function toFlatInfo(item: unknown): FlatMessageInfo {
  const message = item as { identifier?: string; role?: string; content?: unknown; name?: unknown };
  return {
    identifier: message?.identifier,
    role: String(message?.role ?? ''),
    content: message?.content,
    name: message?.name,
  };
}

/** SETTINGS_READY 到达时执行溯源并发布到 wi_trace_report（查看器 UI 消费） */
async function runTrace(messages: SendingMessage[]): Promise<void> {
  try {
    wi_trace_report.value = await buildReport(messages);
  } catch (error) {
    console.error('[世界书溯源] 溯源过程发生异常', error);
  }
}

/** 组装一次溯源报告：分桶重放 → 消息对齐 → 逐通道定位（世界书通道 + 预设条目通道 + ST 自收集通道） */
async function buildReport(messages: SendingMessage[]): Promise<WiTraceReport> {
  replay_cache.ext_part.clear();
  replay_cache.blocks.clear();
  replay_cache.preset = null;
  const entries = tracer_state.entries ?? [];
  const buckets = buildWiBuckets(entries);
  const report: WiTraceReport = {
    activatedCount: entries.length,
    segments: [],
    unlocated: [],
    alignmentOk: false,
    notes: [],
  };

  const root = (promptManager as unknown as { messages?: unknown })?.messages;
  if (!root) {
    report.notes.push('promptManager 不可用，无法对齐消息结构');
    collectUnresolved(buckets, report);
    return report;
  }
  const flat = flattenMessages(root, false);
  report.alignmentOk = alignByReference(flat, messages);
  if (!report.alignmentOk) {
    report.notes.push('最终消息与 promptManager 快照不一致（可能来自 generateRaw 路径），仅输出条目清单');
    collectUnresolved(buckets, report);
    return report;
  }
  const display = buildDisplayMapping(root, flat);
  const by_identifier = Map.groupBy(display, item => item.info.identifier ?? '');
  const ctx: TraceContext = {
    display,
    by_identifier,
    messages,
    report,
    generationType: tracer_state.type,
    injection_ids: new Set(),
  };
  await resolveChannels(buckets, ctx);
  if (entries.length) {
    collectUnresolved(buckets, report);
  }
  await resolvePresetChannels(ctx);
  resolveStChannels(ctx);
  return report;
}

/** 结构对齐：逐条比较内容引用（===），不比较文字相似度 */
function alignByReference(flat: FlatMessageInfo[], messages: SendingMessage[]): boolean {
  return flat.length === messages.length && flat.every((info, index) => info.content === messages[index]?.content);
}

/**
 * 构建显示消息 → squash 来源消息的映射
 * 若本次生成执行过 squash（补丁记录的根集合与当前一致），重放合并得到各来源区间
 */
function buildDisplayMapping(root: unknown, flat: FlatMessageInfo[]): DisplayMessage[] {
  const squash = tracer_state.squash;
  if (squash !== null && squash.root === root) {
    const outputs = replaySquash(squash.pre);
    return outputs
      .filter(output => Boolean(output.info.content) || output.info.role === 'tool')
      .map((output, index) => ({
        index,
        info: output.info,
        children: output.children,
        merged: output.children.length > 1,
      }));
  }
  return flat.map((info, index) => ({
    index,
    info,
    children: [{ info, start: 0, end: textContent(info.content).length }],
    merged: false,
  }));
}

/** 逐通道解析：主块 / 深度注入 / 作者注释消息 / 示例对话 */
async function resolveChannels(buckets: WiBuckets, ctx: TraceContext): Promise<void> {
  resolveMainBlock(buckets.before, 'worldInfoBefore', ctx);
  resolveMainBlock(buckets.after, 'worldInfoAfter', ctx);
  await resolveInjections(buckets, ctx);
  resolveAuthorsNoteMessage(buckets, ctx);
  resolveExamples(buckets, ctx);
}

/**
 * 定位 worldInfoBefore/After 主块消息并按 join('\
') 偏移还原每个条目的区间
 * 镜像 openai.js:1367 的 formatWorldInfo 包裹与 1479 的二次宏替换
 * 消息可能被 squash 吸收进相邻 system 消息，此时按子区间偏移定位
 */
function resolveMainBlock(segments: WiSegment[], identifier: string, ctx: TraceContext): void {
  if (!segments.length) return;
  const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, null);
  if (!target) {
    ctx.report.notes.push(`未找到 ${identifier} 消息（标记被禁用、移除或预算截断）`);
    return;
  }
  const prefix = getWiFormatPrefixLength();
  if (prefix === null) {
    ctx.report.notes.push(`${identifier}: wi_format 占位符数量异常，无法算术定位`);
    return;
  }
  // 包裹校验与偏移基准都取子区间内容（未被吸收时子区间即整条消息）
  const content = textContent(target.child.info.content);
  const joined = segments.map(segment => segment.text).join('\
');
  const wrapper_ok = content.slice(prefix, prefix + joined.length) === joined;
  let cursor = prefix;
  for (const segment of segments) {
    const start = target.child.start + cursor;
    addSegment(ctx.report, ctx.messages, {
      index: target.display.index,
      start,
      text: segment.text,
      entry: segment.entry,
      label: positionLabel(segment.entry.position),
      note: wrapper_ok ? undefined : '消息内容与重放结果存在差异（可能经二次宏替换），偏移仅供参考',
    });
    cursor += segment.text.length + 1;
  }
}

/**
 * 定位深度注入消息（customDepthWI_* 键）与 IN_CHAT 位置的作者注释（2_floating_prompt）
 * 通过 chatHistory-N 编号 + 从消息末尾反向算术定位，无子串搜索
 */
async function resolveInjections(buckets: WiBuckets, ctx: TraceContext): Promise<void> {
  const queries = collectInjectionQueries(buckets);
  if (!queries.length) return;
  const max_number = getMaxChatHistoryNumber(ctx.display);
  // 聊天消息数 = 总编号 − 注入消息总数（用于深度超过聊天长度时的钳制修正）
  const chat_count = Math.max(0, max_number - (await countAllInjections()));
  for (const query of queries) {
    await resolveSingleInjection(query, max_number, chat_count, ctx);
  }
}

/**
 * 汇总需要经深度注入定位的查询：
 * atDepth 桶（customDepthWI_ 键）+ IN_CHAT 位置的作者注释（2_floating_prompt）
 */
function collectInjectionQueries(buckets: WiBuckets): InjectionQuery[] {
  const queries: InjectionQuery[] = buckets.depth
    .filter(bucket => bucket.depth !== null)
    .map(bucket => ({
      key: inject_ids.CUSTOM_WI_DEPTH_ROLE(bucket.depth as number, bucket.role),
      depth: bucket.depth as number,
      role: bucket.role,
      label: `深度注入 depth=${bucket.depth} role=${roleName(bucket.role)}`,
      parts: toInjectionParts(bucket.segments),
    }));
  const note_query = getAuthorNoteInjectionQuery(buckets);
  if (note_query) queries.push(note_query);
  return queries;
}

/** 把桶内段落转为「扩展提示词值 = join('\
')」内的区间；spans/label 缺省时自行计算 */
function toInjectionParts(
  segments: WiSegment[],
  spans?: Array<{ start: number; end: number }>,
  label?: string,
): InjectionPart[] {
  const resolved_spans = spans ?? spansOfJoinedTexts(segments.map(segment => segment.text), 0);
  return segments.map((segment, index) => ({
    entry: segment.entry,
    label: label ?? positionLabel(segment.entry.position),
    text: segment.text,
    rawStart: resolved_spans[index].start,
    rawEnd: resolved_spans[index].end,
  }));
}

/**
 * 作者注释位于 IN_CHAT 时构造注入查询
 * 镜像 world-info.js:5170-5174：ANTop + 原文 + ANBottom 合并为 2_floating_prompt 值
 */
function getAuthorNoteInjectionQuery(buckets: WiBuckets): InjectionQuery | null {
  if (!buckets.anTop.length && !buckets.anBottom.length) return null;
  if (!shouldWIAddPrompt) return null;
  if (chat_metadata[metadata_keys.position] !== extension_prompt_types.IN_CHAT) return null;
  const value = extSnapshotValue(NOTE_MODULE_NAME);
  if (!value) return null;
  const spans = decomposeAuthorNote(value, buckets.anTop, buckets.anBottom);
  if (!spans.verified) return null;
  const depth = Number(chat_metadata[metadata_keys.depth] ?? 4);
  const role = Number(chat_metadata[metadata_keys.role] ?? 0);
  return {
    key: NOTE_MODULE_NAME,
    depth,
    role,
    label: `作者注释合并 depth=${depth}`,
    parts: [
      ...toInjectionParts(buckets.anTop, spans.topSpans, POSITION_LABELS[2]),
      {
        entry: null,
        label: '作者注释原文',
        text: value.slice(spans.origStart, spans.origEnd),
        rawStart: spans.origStart,
        rawEnd: spans.origEnd,
      },
      ...toInjectionParts(buckets.anBottom, spans.bottomSpans, POSITION_LABELS[3]),
    ],
  };
}

/**
 * 解析单个注入查询：重放 populationInjectionPrompts 的注入位置编号，
 * 再经 getExtensionPrompt 重放的组成部分偏移，从消息末尾反向定位条目区间
 * 注入消息可能被 squash 吸收，findDisplayTarget 会按子区间回退定位
 */
async function resolveSingleInjection(
  query: InjectionQuery,
  max_number: number,
  chat_count: number,
  ctx: TraceContext,
): Promise<void> {
  const blocks = await enumerateInjectionBlocks(query.depth);
  const block_index = blocks.findIndex(block => block.role === query.role && block.has_extension);
  const ext = await cachedExtensionPromptPart(query.depth, query.role);
  const part = ext.parts.find(item => item.key === query.key);
  if (block_index === -1 || !part) {
    ctx.report.notes.push(`${query.label}: 该深度无对应注入内容`);
    return;
  }
  const before_count = await countInjectionsBefore(query.depth);
  // 镜像 populationInjectionPrompts 的 splice 钳制：注入索引超过数组长度时追加到末尾，
  // 故实际距底距离 = before + block + min(depth, 聊天消息数)
  const distance = before_count + block_index + Math.min(query.depth, chat_count);
  const identifier = `chatHistory-${max_number - distance}`;
  const target = findDisplayTarget(ctx.by_identifier, ctx.display, identifier, roleName(query.role));
  if (!target) {
    ctx.report.notes.push(`${query.label}: 注入消息定位失败（可能被预算截断或结构漂移）`);
    return;
  }
  ctx.injection_ids?.add(identifier);
  pushInjectionParts(query, part, target, ext.value, ctx);
}

/** 按注入组成部分偏移把查询的条目段推入报告（从消息末尾反向定位） */
function pushInjectionParts(
  query: InjectionQuery,
  part: ExtPromptPart,
  target: DisplayTarget,
  ext_value: string,
  ctx: TraceContext,
): void {
  // 后缀校验与偏移基准都取子区间内容（未被吸收时子区间即整条消息）
  const content = textContent(target.child.info.content);
  const suffix_ok = content.endsWith(ext_value);
  const suffix_after = ext_value.length - part.end;
  const part_start = content.length - suffix_after - part.value.length;
  // 扩展提示词原始值的前导空白在 getExtensionPrompt 拼接时被 trim，需回补偏移
  const raw_value = extSnapshotValue(query.key);
  const lead_skip = raw_value.length - raw_value.trimStart().length;
  for (const item of query.parts) {
    if (!item.entry) continue; // 作者注释原文段不属于世界书
    const start = target.child.start + part_start + item.rawStart - lead_skip;
    addSegment(ctx.report, ctx.messages, {
      index: target.display.index,
      start,
      text: item.text,
      entry: item.entry,
      label: item.label,
      note: suffix_ok ? undefined : '注入消息与重放结果存在差异，偏移仅供参考',
    });
  }
}

/**
 * 定位作者注释消息（identifier=authorsNote，位置为 IN_PROMPT/BEFORE_PROMPT 时）
 * ANTop 段位于消息开头，ANBottom 段随原文段的宏替换增量平移
 */
function resolveAuthorsNoteMessage(buckets: WiBuckets, ctx: TraceContext): void {
  if (!buckets.anTop.length && !buckets.anBottom.length) return;
  if (chat_metadata[metadata_keys.position] === extension_prompt_types.IN_CHAT) return; // 已由注入通道处理
  if (!shouldWIAddPrompt) {
    ctx.report.notes.push('作者注释本回合未插入（shouldWIAddPrompt=false），ANTop/ANBottom 条目未合并');
    return;
  }
  const value = extSnapshotValue(NOTE_MODULE_NAME);
  const target = findDisplayTarget(ctx.by_identifier, ctx.display, 'authorsNote', null);
  if (!target || !value) {
    ctx.report.notes.push('未找到 authorsNote 消息或作者注释值为空');
    return;
  }
  const content = textContent(target.child.info.content);
  const spans = decomposeAuthorNote(value, buckets.anTop, buckets.anBottom);
  if (!spans.verified) {
    ctx.report.notes.push('作者注释值与重放结果不一致，ANTop/ANBottom 无法精确定位');
    return;
  }
  const shift = content.length - value.length; // 二次宏替换增量（通常发生在原文段）
  pushNoteSegments(buckets.anTop, spans.topSpans, target.child.start, target.display.index, ctx);
  pushNoteSegments(buckets.anBottom, spans.bottomSpans, target.child.start + shift, target.display.index, ctx);
}

/** 把作者注释分解出的条目段推入报告（整体平移 shift） */
function pushNoteSegments(
  segments: WiSegment[],
  spans: Array<{ start: number; end: number }>,
  shift: number,
  index: number,
  ctx: TraceContext,
): void {
  for (const [i, segment] of segments.entries()) {
    addSegment(ctx.report, ctx.messages, {
      index,
      start: spans[i].start + shift,
      text: segment.text,
      entry: segment.entry,
      label: positionLabel(segment.entry.position),
    });
  }
}

/**
 * 定位示例对话消息：identifier `dialogueExamples g-j` 中的组号 g 直接对应
 * 重放的示例组装顺序（EM 前置块逆序在前 / 角色卡居中 / EM 后置块在后）
 */
function resolveExamples(buckets: WiBuckets, ctx: TraceContext): void {
  const composition = buildExampleComposition(buckets);
  const contents_cache = new Map<number, string[]>();
  for (const item of ctx.display) {
    const match = /^dialogueExamples (\\d+)-(\\d+)$/.exec(item.info.identifier ?? '');
    if (!match) continue;
    const [group_index, message_index] = [Number(match[1]), Number(match[2])];
    const group = composition[group_index];
    if (!group) continue;
    if (!contents_cache.has(group_index)) {
      contents_cache.set(group_index, getExampleMessageContents(group.block));
    }
    const expected = contents_cache.get(group_index)?.[message_index];
    const content = textContent(item.info.content);
    if (group.source === 'wi' && group.entry) {
      ctx.report.segments.push({
        messageIndex: item.index,
        start: 0,
        end: content.length,
        entry: group.entry,
        positionLabel: positionLabel(group.entry.position),
        verified: expected !== undefined && expected === content,
      });
    } else if (group.source === 'card') {
      ctx.report.segments.push({
        messageIndex: item.index,
        start: 0,
        end: content.length,
        positionLabel: '角色卡示例对话',
        verified: expected !== undefined && expected === content,
        source: 'system',
        stInfo: { kind: 'example', label: '角色卡示例对话' },
      });
    }
  }
}

/** 汇总所有桶中的段落（用于未解析统计） */
function allBucketSegments(buckets: WiBuckets): WiSegment[] {
  return [
    ...buckets.before,
    ...buckets.after,
    ...buckets.anTop,
    ...buckets.anBottom,
    ...buckets.em.map(item => item.segment),
    ...buckets.depth.flatMap(bucket => bucket.segments),
    ...Object.values(buckets.outlets).flat(),
  ];
}

/** 汇总未能定位到消息的条目：按位置标签分组并附原因 */
function collectUnresolved(buckets: WiBuckets, report: WiTraceReport): void {
  const resolved = new Set(
    report.segments
      .filter(segment => segment.source !== 'preset' && segment.source !== 'system' && segment.entry)
      .map(segment => `${segment.entry!.world}.${segment.entry!.uid}`),
  );
  const pending = allBucketSegments(buckets).filter(
    segment => !resolved.has(`${segment.entry.world}.${segment.entry.uid}`),
  );
  const groups = Map.groupBy(pending, segment => positionLabel(segment.entry.position));
  for (const [label, group_segments] of groups) {
    report.unlocated.push({
      label,
      entries: group_segments.map(segment => segment.entry),
      reason: defaultUnlocatedReason(label),
    });
  }
}

/** 各位置未定位时的默认原因说明 */
function defaultUnlocatedReason(label: string): string {
  if (label === 'outlet') return 'outlet 位置内容不直接进入聊天补全消息（仅通过 {{WIOutlet}} 宏展开）';
  return '未出现在可定位的提示词消息中（可能被过滤、禁用或预算截断）';
}
