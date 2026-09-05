import type { SendingMessage } from '@/function/event';

/**
 * 提示词查看器 · 溯源类型定义
 * 包含世界书条目快照、分桶结构、重放中间表示、预设条目快照、ST 自收集内容、消息对齐及最终溯源报告结构。
 */

/** 消息对齐类型 */
export type MessageAlignmentKind = 'exact' | 'modified' | 'merged' | 'injected' | 'deleted' | 'unknown';

/** 消息对齐结果：最终消息 index ↔ T0 消息 index 列表及对齐类型 */
export type MessageAlignment = {
  finalIndex: number;
  t0Indexes: number[];
  kind: MessageAlignmentKind;
};

/** ST 自收集内容段的类别 */
export type StContentKind = 'chat' | 'persona' | 'card' | 'example' | 'control';

/** ST 自收集段的描述信息（当 source === 'system' 时提供） */
export type StSegmentInfo = {
  kind: StContentKind;
  /** 类别中文名 */
  label: string;
  /** 聊天记录倒序号（仅 kind === 'chat'） */
  ordinal?: number;
  /** 发言者名（仅 kind === 'chat'，names_behavior 为 COMPLETION 时才有） */
  speaker?: string;
};

/** 单条世界书条目的快照（WORLD_INFO_ACTIVATED 负载精简） */
export type WiEntrySnapshot = {
  world: string;
  uid: number;
  comment: string;
  content: string;
  /** world_info_position 枚举值（0:before, 1:after, 2:anTop, 3:anBottom, 4:atDepth, 5:emTop, 6:emBottom, 7:outlet） */
  position: number;
  /** 仅在 position === 4 (atDepth) 时有效；其他位置为 null */
  depth: number | null;
  /** extension_prompt_roles 枚举值（0:system, 1:user, 2:assistant） */
  role: number;
  order: number;
  outletName: string;
};

/** 单个预设提示词条目的快照（getPromptCollection 展开项） */
export type PresetEntrySnapshot = {
  identifier: string;
  name?: string;
  role: string;
  content: string;
  system_prompt?: boolean;
  /** 注入位置（0: 相对位置由 marker 决定；1: 绝对深度注入） */
  injection_position?: number;
  /** 绝对深度注入的目标深度（仅 injection_position === 1 时有效） */
  injection_depth?: number;
  /** 绝对深度注入的执行顺序（默认 '100'） */
  injection_order?: number | string;
  /** 触发器（normal, impersonate 等生成类型） */
  injection_trigger?: string[];
  /** 角色禁用标记 */
  for_character?: boolean;
};

/**
 * 条目经宏替换与格式包裹后的文本段
 * 用于在合并后的消息中按 join('\n') 累加偏移定位
 */
export type WiSegment = {
  entry: WiEntrySnapshot;
  /** 宏替换 + formatWorldInfo 包裹后的最终文本 */
  text: string;
};

/** 深度注入桶 */
export type WiDepthBucket = { depth: number | null; role: number; segments: WiSegment[] };

/**
 * 示例对话段落：包含条目段落与锚点位置
 * 镜像 world-info.js 的 EM 分桶结构
 */
export type WiEmItem = {
  segment: WiSegment;
  anchor: number;
};

/**
 * 按 position / depth / role 划分的世界书条目桶
 * 镜像 world-info.js 的分发目标：
 * - before / after: worldInfoBefore / worldInfoAfter 消息
 * - anTop / anBottom: 2_floating_prompt 扩展提示词
 * - depth: customDepthWI_{depth}_{role} 扩展提示词
 * - em: 示例对话消息（前置逆序 / 后置正序）
 * - outlets: {{WIOutlet}} 宏按名称路由
 */
export type WiBuckets = {
  before: WiSegment[];
  after: WiSegment[];
  anTop: WiSegment[];
  anBottom: WiSegment[];
  em: WiEmItem[];
  depth: WiDepthBucket[];
  outlets: Record<string, WiSegment[]>;
};

/** MessageCollection 展开后的单条消息精简信息 */
export type FlatMessageInfo = {
  identifier?: string;
  role: string;
  content: unknown;
  name?: unknown;
};

/** 与查看器对齐后的一条显示消息及其 squash 来源区间 */
export type DisplayMessage = {
  index: number;
  info: FlatMessageInfo;
  children: Array<{ info: FlatMessageInfo; start: number; end: number }>;
  merged: boolean;
};

/** findDisplayTarget 的定位结果：承载消息与命中的子区间 */
export type DisplayTarget = { display: DisplayMessage; child: DisplayMessage['children'][number] };

/** 逐通道定位共享的上下文 */
export type TraceContext = {
  display: DisplayMessage[];
  by_identifier: Map<string, DisplayMessage[]>;
  messages: SendingMessage[];
  report: WiTraceReport;
  generationType?: string;
  /** 注入通道已占用的 chatHistory-N 标识符，ST 通道据此区分真实聊天消息与注入块 */
  injection_ids?: Set<string>;
};

/** squashSystemMessages 合并的单个输出段 */
export type SquashOutput = {
  info: FlatMessageInfo;
  /** 该输出消息由哪些原始消息拼接而成，各来源在合并文本中的 [start, end) 区间 */
  children: Array<{ info: FlatMessageInfo; start: number; end: number }>;
};

/** getExtensionPrompt 内部重放的单个提示词段在拼接文本中的区间 */
export type ExtPromptPart = {
  key: string;
  value: string;
  start: number;
  end: number;
};

/** SETTINGS_READY 时刻的扩展提示词快照条目 */
export type ExtPromptSnapshot = {
  key: string;
  position?: number;
  value?: unknown;
  depth?: number;
  role?: number;
  filter?: unknown;
};

/** 注入消息（深度注入 / IN_CHAT 作者注释）中的一段内容及其来源 */
export type InjectionPart = {
  entry: WiEntrySnapshot | null;
  label: string;
  text: string;
  /** 在扩展提示词 value 中的起始偏移 */
  rawStart: number;
  rawEnd: number;
};

/** 待定位的注入查询：某个扩展提示词 key 中包含的世界书段落 */
export type InjectionQuery = {
  key: string;
  depth: number;
  role: number;
  label: string;
  parts: InjectionPart[];
};

/** 溯源出的一个内容段：查看器消息 [start, end) 来自某条目 */
export type WiTraceSegment = {
  messageIndex: number;
  start: number;
  end: number;
  entry?: WiEntrySnapshot;
  positionLabel: string;
  verified: boolean;
  note?: string;
  /** 来源渠道：'wi'（世界书，缺省）、'preset'（预设条目）或 'system'（ST 自收集内容） */
  source?: 'wi' | 'preset' | 'system';
  /** 预设条目快照（当 source === 'preset' 时提供） */
  presetEntry?: PresetEntrySnapshot;
  /** ST 自收集段描述信息（当 source === 'system' 时提供） */
  stInfo?: StSegmentInfo;
};

/** 未能定位到消息的世界书条目分组（附原因） */
export type WiUnlocatedGroup = {
  label: string;
  entries: WiEntrySnapshot[];
  reason: string;
};

/** 未能定位到消息的预设条目分组（附原因） */
export type PresetUnlocatedGroup = {
  label: string;
  entries: PresetEntrySnapshot[];
  reason: string;
};

/** 预设条目溯源摘要 */
export type PresetTraceSummary = {
  totalCount: number;
  locatedCount: number;
  verifiedCount: number;
  unlocatedCount: number;
  unlocated: PresetUnlocatedGroup[];
};

/** 一次溯源的完整结果 */
export type WiTraceReport = {
  activatedCount: number;
  segments: WiTraceSegment[];
  unlocated: WiUnlocatedGroup[];
  alignmentOk: boolean;
  notes: string[];
  /** 预设条目溯源摘要（当开启预设溯源时提供） */
  presetSummary?: PresetTraceSummary;
  /** 消息级对齐结果（T0 ↔ T_final 映射） */
  alignments?: MessageAlignment[];
};
