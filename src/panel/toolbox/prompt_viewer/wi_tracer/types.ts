import type { MessagePair } from './align';

export type WiEntrySnapshot = {
  uid: number;
  comment: string;
  content: string;
  position: number;
  depth: number | null;
  role: number;
  order: number;
  outletName: string;
};

/** 单个预设提示词条目的快照 */
export type PresetEntrySnapshot = {
  identifier: string;
  name?: string;
  role: string;
  /** 绝对深度注入的目标深度 */
  injection_depth?: number;
};

/**
 * 条目经宏替换与格式包裹后的文本段
 * 用于在合并后的消息中按 join('\n') 累加偏移定位
 */
export type WiSegment = {
  entry: WiEntrySnapshot;
  text: string;
};

/** 深度注入桶 */
export type WiDepthBucket = {
  depth: number | null;
  role: number;
  segments: WiSegment[];
};

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
 * 镜像 world-info.js 的分发目标
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

/** 与查看器对齐后的一条显示消息及其来源区间 */
export type DisplayMessage = {
  index: number;
  info: FlatMessageInfo;
  children: Array<{ info: FlatMessageInfo; start: number; end: number }>;
  merged: boolean;
};

/** findDisplayTarget 的定位结果：承载消息与命中的子区间 */
export type DisplayTarget = {
  display: DisplayMessage;
  child: DisplayMessage['children'][number];
};

/** 补全管线录制数据快照结构 */
export type PipelineRecording = {
  squashBefore: FlatMessageInfo[] | null;
  getChatFlat: FlatMessageInfo[] | null;
};

/** 逐通道定位共享的上下文 */
export type TraceContext = {
  display: DisplayMessage[];
  by_identifier: Map<string, DisplayMessage[]>;
  pairs: Map<number, MessagePair>;
  report: WiTraceReport;
};

/** 溯源出的一个内容段：显示消息 [start,end) 来自某个条目 */
export type WiTraceSegment = {
  messageIndex: number;
  start: number;
  end: number;
  entry?: WiEntrySnapshot;
  presetEntry?: PresetEntrySnapshot;
  source?: 'wi' | 'preset' | 'card';
  positionLabel: string;
};

/** 一次溯源完整结果报告 */
export type WiTraceReport = {
  activatedCount: number;
  segments: WiTraceSegment[];
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

/** 注入段定义 */
export type InjectionPart = {
  entry: WiEntrySnapshot | null;
  label: string;
  text: string;
  rawStart: number;
};

/** 注入查询定义 */
export type InjectionQuery = {
  key: string;
  depth: number;
  role: number;
  label: string;
  parts: InjectionPart[];
};

/** 扩展提示词拆分后的分段定义 */
export type ExtPromptPart = {
  key: string;
  value: string;
  start: number;
  end: number;
};
