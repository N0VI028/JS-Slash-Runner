import { chat_metadata, event_types, extension_prompt_types, getCharacterCardFields } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';
import { metadata_keys, NOTE_MODULE_NAME, shouldWIAddPrompt } from '@sillytavern/scripts/authors-note';
import { inject_ids } from '@sillytavern/scripts/constants';
import { power_user } from '@sillytavern/scripts/power-user';
import type { SendingMessage } from '@/function/event';
import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';
import { splitBySpans, toWiMarks, type WiMark } from './marks';
import { alignMessages } from './align';
import { installPipelineRecorder, takePipelineRecording, uninstallPipelineRecorder } from './pipeline_recorder';
import { buildDisplayFromRecording, textContent } from './pure_replay';
import { resolvePresetChannels } from './preset_tracer';
import {
  buildExampleComposition,
  buildWiBuckets,
  decomposeAuthorNote,
  getExampleMessageContents,
  getWiFormatPrefixLength,
} from './replay';
import { joinWithSpans, leadingTrimLength, locateFromEnd } from './spans';
import {
  addSegment,
  countAllInjections,
  countInjectionsBefore,
  enumerateInjectionBlocks,
  extSnapshotValue,
  findDisplayTarget,
  getMaxChatHistoryNumber,
  getMemoizedExtPart,
  replay_cache,
  resolveDepthBlockTarget,
  roleName,
  snapshotExtensionPrompts,
  tracer_state,
} from './trace_helpers';
import type {
  DisplayMessage,
  DisplayTarget,
  ExtPromptPart,
  InjectionPart,
  InjectionQuery,
  TraceContext,
  WiBuckets,
  WiEntrySnapshot,
  WiSegment,
  WiTraceReport,
  WiTraceSegment,
} from './types';

// 重新导出规范要求的公共接口与类型
export { setupWorldInfoTracer, wi_trace_report, wi_tracer_enabled, toWiMarks, splitBySpans };
export type { WiMark, WiTraceReport, WiTraceSegment };

/** 溯源开关：实验性功能，默认关闭，状态保存在浏览器本地存储而非酒馆设置 */
const wi_tracer_enabled = useLocalStorage<boolean>('TH-PromptViewer:wi_tracer_enabled', false);

/** 溯源结果：查看器 UI 读取内联标注与摘要 */
const wi_trace_report = shallowRef<WiTraceReport | null>(null);

/** 溯源任务代际：递增使在途异步任务的过期报告失效 */
let trace_epoch = 0;

/**
 * 在提示词查看器挂载时调用：注册事件监听
 * 监听器生命周期跟随组件作用域
 */
function setupWorldInfoTracer(): void {
  // 开关驱动管线补丁装卸：关闭时不 patch ChatCompletion 原型，并清空溯源状态
  const stop_watch = watch(
    wi_tracer_enabled,
    enabled => {
      if (enabled) {
        installPipelineRecorder();
      } else {
        uninstallPipelineRecorder();
        tracer_state.entries = null;
        tracer_state.ext = [];
        wi_trace_report.value = null;
        trace_epoch++;
      }
    },
    { immediate: true },
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop_watch();
      uninstallPipelineRecorder();
    });
  }

  useEventSourceOn(event_types.GENERATION_STARTED, (_type, _options, dry_run) => {
    if (!wi_tracer_enabled.value) return;
    if (!dry_run) {
      tracer_state.entries = null;
      tracer_state.ext = [];
      tracer_state.type = 'normal';
    }
  });

  useEventSourceOn(event_types.WORLD_INFO_ACTIVATED, entries => {
    if (!wi_tracer_enabled.value) return;
    tracer_state.entries = snapshotEntries(entries);
  });

  useEventSourceOn(event_types.CHAT_COMPLETION_SETTINGS_READY, data => {
    if (!wi_tracer_enabled.value) return;
    // 必须在监听器内同步快照 extension_prompts 与 type
    tracer_state.ext = snapshotExtensionPrompts();
    tracer_state.type = String((data as { type?: unknown })?.type ?? 'normal');
    wi_trace_report.value = null;
    void runTrace(Array.isArray(data?.messages) ? data.messages : []);
  });
}

/**
 * 从 WORLD_INFO_ACTIVATED 负载提取条目快照
 * @param entries 事件负载数据
 */
function snapshotEntries(entries: unknown): WiEntrySnapshot[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map(entry => ({
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

/**
 * SETTINGS_READY 到达时执行溯源并发布到 wi_trace_report
 * @param messages 补全设置中的最终消息列表
 */
async function runTrace(messages: SendingMessage[]): Promise<void> {
  const epoch = ++trace_epoch;
  try {
    const report = await buildReport(messages);
    // 异步期间开关已关闭或已有更新任务，丢弃过期报告
    if (epoch === trace_epoch && wi_tracer_enabled.value) {
      wi_trace_report.value = report;
    }
  } catch (error) {
    console.error('[TavernHelper] 溯源过程发生异常', error);
  }
}

/**
 * 遍历 display 列表内所有子区间，按 child 的 identifier 构建索引映射表
 * @param display 显示消息列表
 */
function buildIdentifierMap(display: DisplayMessage[]): Map<string, DisplayMessage[]> {
  const map = new Map<string, DisplayMessage[]>();
  for (const item of display) {
    for (const child of item.children) {
      const id = child.info.identifier;
      if (!id) continue;
      const list = map.get(id);
      if (list) list.push(item);
      else map.set(id, [item]);
    }
  }
  return map;
}

/**
 * 构建溯源共享上下文
 * @param root promptManager 根消息集合
 * @param messages 最终消息列表
 * @param report 报告对象
 */
function createTraceContext(root: unknown, messages: SendingMessage[], report: WiTraceReport): TraceContext {
  const recording = takePipelineRecording();
  const display = buildDisplayFromRecording(recording, root);
  const pairs = alignMessages(
    display.map(item => ({ role: item.info.role, content: textContent(item.info.content) })),
    messages.map(message => ({ role: message.role, content: textContent(message.content) })),
  );
  const by_identifier = buildIdentifierMap(display);

  return {
    display,
    by_identifier,
    pairs,
    report,
  };
}

/**
 * 组装一次溯源报告
 * @param messages 最终消息列表
 */
async function buildReport(messages: SendingMessage[]): Promise<WiTraceReport> {
  replay_cache.ext_part.clear();
  replay_cache.blocks.clear();
  replay_cache.preset = null;

  const entries = tracer_state.entries ?? [];
  const buckets = buildWiBuckets(entries);
  const report: WiTraceReport = { activatedCount: entries.length, segments: [] };

  const root = (promptManager as unknown as { messages?: unknown })?.messages;
  if (!root) return report;

  const ctx = createTraceContext(root, messages, report);
  await resolveChannels(buckets, ctx);
  await resolvePresetChannels(ctx);
  resolveCharacterDescription(ctx);
  resolvePersonaDescription(ctx);
  return report;
}

/**
 * 逐通道解析世界书条目：主块 / 深度注入 / 作者注释 / 示例对话
 * @param buckets 分桶集合
 * @param ctx 溯源上下文
 */
async function resolveChannels(buckets: WiBuckets, ctx: TraceContext): Promise<void> {
  resolveMainBlock(buckets.before, 'worldInfoBefore', ctx);
  resolveMainBlock(buckets.after, 'worldInfoAfter', ctx);
  await resolveInjections(buckets, ctx);
  resolveAuthorsNoteMessage(buckets, ctx);
  resolveExamples(buckets, ctx);
}

/**
 * 定位角色描述消息并标注角色卡来源徽章
 * @param ctx 溯源共享上下文
 */
function resolveCharacterDescription(ctx: TraceContext): void {
  const content = String(getCharacterCardFields().description ?? '');
  if (!content.trim()) return;

  const target = findDisplayTarget(ctx.by_identifier, 'charDescription', null);
  if (!target) return;

  addSegment(ctx, {
    index: target.display.index,
    start: target.child.start,
    text: content,
    source: 'card',
    label: t`角色描述`,
  });
}

/**
 * 定位用户信息消息并标注用户信息来源徽章
 * personaDescription 仅在 IN_PROMPT 位置注入（openai.js:1424-1425），
 * 消息内容为 power_user.persona_description 原文，未经宏替换与 trim
 * @param ctx 溯源共享上下文
 */
function resolvePersonaDescription(ctx: TraceContext): void {
  const content = String(power_user.persona_description ?? '');
  if (!content.trim()) return;

  const target = findDisplayTarget(ctx.by_identifier, 'personaDescription', null);
  if (!target) return;

  addSegment(ctx, {
    index: target.display.index,
    start: target.child.start,
    text: content,
    source: 'persona',
    label: '用户信息',
  });
}

/**
 * 把主块内各个条目段累加偏移加入报告
 * prefix 为 wi_format 模板占位符前的前缀长度，其后各段以 '\n' 分隔
 * @param segments 条目段列表
 * @param target 显示目标
 * @param prefix 前缀偏移
 * @param ctx 溯源上下文
 */
function pushMainBlockSegments(
  segments: WiSegment[],
  target: DisplayTarget,
  prefix: number,
  ctx: TraceContext,
): void {
  const joined = joinWithSpans(segments.map(segment => segment.text));

  for (const [index, segment] of segments.entries()) {
    addSegment(ctx, {
      index: target.display.index,
      start: target.child.start + prefix + joined.spans[index].start,
      text: segment.text,
      entry: segment.entry,
      label: segment.entry.comment,
    });
  }
}

/**
 * 定位 worldInfoBefore/After 主块消息并按换行偏移还原区间
 * @param segments 条目段列表
 * @param identifier 消息标识符
 * @param ctx 溯源上下文
 */
function resolveMainBlock(segments: WiSegment[], identifier: string, ctx: TraceContext): void {
  if (!segments.length) return;
  const target = findDisplayTarget(ctx.by_identifier, identifier, null);
  if (!target) return;

  const prefix = getWiFormatPrefixLength();
  if (prefix === null) return;

  pushMainBlockSegments(segments, target, prefix, ctx);
}

/**
 * 定位深度注入消息与 IN_CHAT 位置的作者注释
 * @param buckets 分桶集合
 * @param ctx 溯源上下文
 */
async function resolveInjections(buckets: WiBuckets, ctx: TraceContext): Promise<void> {
  const queries = collectInjectionQueries(buckets);
  if (!queries.length) return;

  const max_number = getMaxChatHistoryNumber(ctx.display);
  const total_injections = await countAllInjections();
  const chat_count = Math.max(0, max_number - total_injections);

  for (const query of queries) {
    await resolveSingleInjection(query, max_number, chat_count, ctx);
  }
}

/**
 * 汇总深度注入查询
 * @param buckets 分桶集合
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

/**
 * 把桶内段落转为扩展提示词内部的区间表示
 * @param segments 段列表
 * @param spans 预计算区间
 * @param label 自定义标签
 */
function toInjectionParts(segments: WiSegment[], spans?: Array<{ start: number; end: number }>): InjectionPart[] {
  const resolved_spans = spans ?? joinWithSpans(segments.map(segment => segment.text)).spans;
  return segments.map((segment, index) => ({
    entry: segment.entry,
    label: segment.entry.comment,
    text: segment.text,
    rawStart: resolved_spans[index].start,
  }));
}

/**
 * 作者注释位于 IN_CHAT 时构造注入查询
 * @param buckets 分桶集合
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
      ...toInjectionParts(buckets.anTop, spans.topSpans),
      {
        entry: null,
        label: '作者注释原文',
        text: value.slice(spans.origStart, spans.origEnd),
        rawStart: spans.origStart,
      },
      ...toInjectionParts(buckets.anBottom, spans.bottomSpans),
    ],
  };
}

/**
 * 解析单个注入查询
 * @param query 注入查询参数
 * @param max_number 最大聊天编号
 * @param chat_count 实际聊天消息数
 * @param ctx 溯源上下文
 */
async function resolveSingleInjection(
  query: InjectionQuery,
  max_number: number,
  chat_count: number,
  ctx: TraceContext,
): Promise<void> {
  const blocks = await enumerateInjectionBlocks(query.depth);
  const block_index = blocks.findIndex(block => block.role === query.role && block.has_extension);
  const ext = await getMemoizedExtPart(query.depth, query.role);
  const part = ext.parts.find(item => item.key === query.key);

  if (block_index === -1 || !part) return;

  const before_count = await countInjectionsBefore(query.depth);
  const target = resolveDepthBlockTarget({
    by_identifier: ctx.by_identifier,
    max_number,
    chat_count,
    before_count,
    depth: query.depth,
    block_index,
    role: query.role,
  });
  if (!target) return;

  pushInjectionParts(query, part, target, ext.value, ctx);
}

/**
 * 按注入组成部分偏移把查询的条目段推入报告
 * 注入内容恒为消息尾部的后缀，故由「重放值坐标系内的段区间」尾锚定反解到消息坐标系
 * @param query 注入查询
 * @param part 扩展提示词段
 * @param target 显示目标
 * @param ext_value 扩展提示词合并值
 * @param ctx 溯源上下文
 */
function pushInjectionParts(
  query: InjectionQuery,
  part: ExtPromptPart,
  target: DisplayTarget,
  ext_value: string,
  ctx: TraceContext,
): void {
  const content = textContent(target.child.info.content);
  const lead_skip = leadingTrimLength(extSnapshotValue(query.key));
  const anchor = locateFromEnd(content, ext_value, part) ?? content.length - ext_value.length + part.start;

  for (const item of query.parts) {
    if (!item.entry) continue;
    const start = target.child.start + anchor - lead_skip + item.rawStart;
    addSegment(ctx, {
      index: target.display.index,
      start,
      text: item.text,
      entry: item.entry,
      label: item.label,
    });
  }
}

/**
 * 定位作者注释消息
 * @param buckets 分桶集合
 * @param ctx 溯源上下文
 */
function resolveAuthorsNoteMessage(buckets: WiBuckets, ctx: TraceContext): void {
  if (!buckets.anTop.length && !buckets.anBottom.length) return;
  if (chat_metadata[metadata_keys.position] === extension_prompt_types.IN_CHAT) return;
  if (!shouldWIAddPrompt) return;

  const value = extSnapshotValue(NOTE_MODULE_NAME);
  const target = findDisplayTarget(ctx.by_identifier, 'authorsNote', null);
  if (!target || !value) return;

  const content = textContent(target.child.info.content);
  const spans = decomposeAuthorNote(value, buckets.anTop, buckets.anBottom);
  if (!spans.verified) return;

  const shift = content.length - value.length;
  pushNoteSegments(buckets.anTop, spans.topSpans, target.child.start, target.display.index, ctx);
  pushNoteSegments(buckets.anBottom, spans.bottomSpans, target.child.start + shift, target.display.index, ctx);
}

/**
 * 把作者注释分解出的条目段推入报告
 * @param segments 段列表
 * @param spans 预计算区间
 * @param shift 偏移量
 * @param index 消息索引
 * @param ctx 溯源上下文
 */
function pushNoteSegments(
  segments: WiSegment[],
  spans: Array<{ start: number; end: number }>,
  shift: number,
  index: number,
  ctx: TraceContext,
): void {
  for (const [i, segment] of segments.entries()) {
    addSegment(ctx, {
      index,
      start: spans[i].start + shift,
      text: segment.text,
      entry: segment.entry,
      label: segment.entry.comment,
    });
  }
}

/**
 * 定位示例对话消息
 * @param buckets 分桶集合
 * @param ctx 溯源上下文
 */
function resolveExamples(buckets: WiBuckets, ctx: TraceContext): void {
  const composition = buildExampleComposition(buckets);
  const contents_cache = new Map<number, string[]>();

  for (const item of ctx.display) {
    const match = /^dialogueExamples (\d+)-(\d+)$/.exec(item.info.identifier ?? '');
    if (!match) continue;

    const [group_index, message_index] = [Number(match[1]), Number(match[2])];
    const group = composition[group_index];
    if (!group || group.source !== 'wi' || !group.entry) continue;

    if (!contents_cache.has(group_index)) {
      contents_cache.set(group_index, getExampleMessageContents(group.block));
    }
    const expected = contents_cache.get(group_index)?.[message_index];
    const content = textContent(item.info.content);

    addSegment(ctx, {
      index: item.index,
      start: 0,
      text: content,
      entry: group.entry,
      label: group.entry.comment,
      verified_override: expected !== undefined && expected === content,
    });
  }
}
