/**
 * 获取合并后的变量表
 * - 如果在消息楼层 iframe 中调用本函数, 则获取 全局→角色卡→聊天→0号消息楼层→中间所有消息楼层→当前消息楼层 的合并结果
 * - 如果在全局变量 iframe 中调用本函数, 则获取 全局→角色卡→脚本→聊天→0号消息楼层→中间所有消息楼层→最新消息楼层 的合并结果
 *
 * @example
 * const variables = getAllVariables();
 */
declare function getAllVariables(): Record<string, any>;
