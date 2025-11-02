type MacroLikeContext = {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
};

/**
 * 注册一个新的助手宏
 *
 * @param regex 匹配的正则表达式
 * @param replace 针对匹配到的文本所要进行的替换
 *
 * @example
 * // 注册一个统计行数的宏
 * registerMacros(
 *   /<count_lines>(.*?)<count_lines>/gi,
 *   context => content.split('\n').length
 * );
 */
declare function registerMacroLike(
  regex: RegExp,
  replace: (context: MacroLikeContext, substring: string, ...args: any[]) => string,
): void;

/**
 * 取消注册一个助手宏
 *
 * @param regex 助手宏的正则表达式
 */
declare function unregisterMacroLike(regex: RegExp): void;
