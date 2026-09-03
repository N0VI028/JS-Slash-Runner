/**
 * ST 自收集 · 聊天记录收集与标记映射（纯函数，可单测）
 * 包含 ST 自收集标记提示词映射表及真实聊天历史消息收集纯函数。
 */
import type { DisplayMessage, StContentKind } from './types';

/** ST 内置标记提示词集合（不含预设/世界书/示例对话等其他通道域） */
export const ST_MARKER_PROMPTS: Record<string, { kind: StContentKind; label: string }> = {
  charDescription: { kind: 'card', label: '角色卡·描述' },
  charPersonality: { kind: 'card', label: '角色卡·性格' },
  scenario: { kind: 'card', label: '角色卡·场景' },
  personaDescription: { kind: 'persona', label: '用户Persona描述' },
  newMainChat: { kind: 'control', label: '新聊天分隔提示' },
  groupNudge: { kind: 'control', label: '群组引导提示' },
  emptyUserMessageReplacement: { kind: 'control', label: '空消息替换' },
  impersonate: { kind: 'control', label: '扮演提示' },
  quietPrompt: { kind: 'control', label: '静默提示' },
  continueNudge: { kind: 'control', label: '续写提示' },
  summary: { kind: 'control', label: '扩展·摘要' },
  vectorsMemory: { kind: 'control', label: '扩展·向量记忆' },
  vectorsDataBank: { kind: 'control', label: '扩展·数据银行' },
  smartContext: { kind: 'control', label: '扩展·SmartContext' },
};

/**
 * 收集属于真实聊天记录的子区间（排除注入通道已占用的 chatHistory-N 标识符）
 * @param display 承载消息列表
 * @param injection_ids 注入通道占用的 identifier 集合
 */
export function collectChatHistoryChildren(
  display: DisplayMessage[],
  injection_ids: Set<string>,
): Array<{ display: DisplayMessage; child: DisplayMessage['children'][number]; ordinal: number; speaker: string | null }> {
  const results: Array<{
    display: DisplayMessage;
    child: DisplayMessage['children'][number];
    ordinal: number;
    speaker: string | null;
  }> = [];

  for (const item of display) {
    for (const child of item.children) {
      const identifier = child.info.identifier;
      if (typeof identifier !== 'string' || injection_ids.has(identifier)) continue;
      const match = identifier.match(/^chatHistory-(\d+)$/);
      if (!match) continue;
      const ordinal = Number(match[1]);
      const name = child.info.name;
      const speaker = name !== undefined && name !== null && name !== '' ? String(name) : null;
      results.push({ display: item, child, ordinal, speaker });
    }
  }

  return results;
}
