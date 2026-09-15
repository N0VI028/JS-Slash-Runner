/**
 * 包装 ChatCompletion 的 squashSystemMessages 与 getChat 原型方法，
 */
import { ChatCompletion } from '@sillytavern/scripts/openai';
import { toFlatInfo } from './pure_replay';
import type { FlatMessageInfo, PipelineRecording } from './types';

let recorded_squash_before: FlatMessageInfo[] | null = null;

let recorded_get_chat_flat: FlatMessageInfo[] | null = null;

let is_installed = false;

let original_squash: (() => Promise<void>) | null = null;

let original_get_chat: (() => unknown[]) | null = null;

/**
 * 还原 ChatCompletion 原型方法
 */
export function uninstallPipelineRecorder(): void {
  if (!is_installed) return;
  if (original_squash) {
    ChatCompletion.prototype.squashSystemMessages = original_squash;
    original_squash = null;
  }
  if (original_get_chat) {
    ChatCompletion.prototype.getChat = original_get_chat;
    original_get_chat = null;
  }
  is_installed = false;
}

/**
 * 录制 squash 前未经合并的原始消息序列
 * @param instance ChatCompletion 实例
 */
function recordSquashBefore(instance: unknown): void {
  try {
    const messagesObj = (instance as { messages?: { flatten?: () => unknown[] } })?.messages;
    const rawList = messagesObj?.flatten?.();
    if (Array.isArray(rawList)) {
      recorded_squash_before = rawList.map(toFlatInfo);
    }
  } catch (error) {
    console.error('[TavernHelper] 录制 squash 消息发生异常', error);
  }
}

/**
 * 录制 getChat 时未经 squash 的真实消息序列
 * @param instance ChatCompletion 实例
 */
function recordGetChat(instance: unknown): void {
  try {
    if (recorded_squash_before) return;
    const messagesObj = (instance as { messages?: { flatten?: () => unknown[] } })?.messages;
    const rawList = messagesObj?.flatten?.();
    if (Array.isArray(rawList)) {
      recorded_get_chat_flat = rawList.map(toFlatInfo);
    }
  } catch (error) {
    console.error('[TavernHelper] 录制 getChat 消息发生异常', error);
  }
}

/**
 * 安装 ChatCompletion 补丁
 * 返回用于还原原型的卸载函数
 */
export function installPipelineRecorder(): () => void {
  if (is_installed) return uninstallPipelineRecorder;

  original_squash = ChatCompletion.prototype.squashSystemMessages;
  ChatCompletion.prototype.squashSystemMessages = async function (this: unknown): Promise<void> {
    recordSquashBefore(this);
    await original_squash?.call(this);
  };

  original_get_chat = ChatCompletion.prototype.getChat;
  ChatCompletion.prototype.getChat = function (this: unknown): unknown[] {
    recordGetChat(this);
    return original_get_chat?.call(this) ?? [];
  };

  is_installed = true;
  return uninstallPipelineRecorder;
}

/**
 * 取走当前录制结果并重置内部缓存
 */
export function takePipelineRecording(): PipelineRecording {
  const result: PipelineRecording = {
    squashBefore: recorded_squash_before,
    getChatFlat: recorded_get_chat_flat,
  };
  recorded_squash_before = null;
  recorded_get_chat_flat = null;
  return result;
}
