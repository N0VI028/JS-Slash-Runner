type MacroLike = {
  regex: RegExp;
  replace: (context: Context, substring: string, ...args: any[]) => string;
}

type Context = {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

/**
 * 注册一个新的助手宏
 *
 * @param regex 匹配的正则表达式
 * @param replace 针对匹配到的文本所要进行的替换
 *
 * @example
 * registerMacros(
 *   /<checkbox>(.*?)<checkbox>/gi,
 *   (context: Context, substring: string, content: string) => { return content; });
 */
declare function registerMacroLike(
  regex: RegExp,
  replace: (context: Context, substring: string, ...args: any[]) => string,
): void;
