import { chat } from '@sillytavern/script';

export function inMessageRange(message_id: number) {
  return _.inRange(message_id, 0, chat.length);
}

/**
 * 将 message_id 转换为深度
 * - 深度 1 表示最新楼层
 * - 深度 2 表示倒数第二楼层
 */
export function toMessageDepth(message_id: number) {
  return chat.length - message_id;
}
/**
 * 将深度转换为 message_id
 * - 深度 1 表示最新楼层
 * - 深度 2 表示倒数第二楼层
 */
export function fromMessageDepth(depth: number) {
  return chat.length - depth;
}

/**
 * 将 message_id 转换为向后索引
 * - -1 表示最新楼层
 * - -2 表示倒数第二楼层
 */
export function toBackwardMessageId(message_id: number) {
  return message_id - chat.length;
}
/**
 * 将向后索引转换为 message_id
 * - -1 表示最新楼层
 * - -2 表示倒数第二楼层
 */
export function fromBackwardMessageId(backward_message_id: number) {
  return chat.length + backward_message_id;
}
/**
 * 将向前索引或向后索引转换为 message_id
 * - 向前索引: 正常的 message_id
 * - 向后索引: -1 表示最新楼层, -2 表示倒数第二楼层
 */
export function normalizeMessageId(forward_or_backward_message_id: number) {
  return forward_or_backward_message_id < 0
    ? fromBackwardMessageId(forward_or_backward_message_id)
    : forward_or_backward_message_id;
}
export function inUnnormalizedMessageRange(forward_or_backward_message_id: number) {
  return _.inRange(forward_or_backward_message_id, -chat.length, chat.length);
}
