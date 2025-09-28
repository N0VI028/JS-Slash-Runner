/**
 * 切换音频播放模式
 */
declare function audioMode(args: { type: string; mode: string }): Promise<void>;

/**
 * 切换播放器开关状态
 */
declare function audioEnable(args: { type: string; state?: string }): Promise<void>;

/**
 * 切换播放/暂停状态
 */
declare function audioPlay(args: { type: string; play?: string }): Promise<void>;

/**
 * 导入音频链接
 */
declare function audioImport(args: { type: string; play?: string }, url: string): Promise<void>;

/**
 * 选择并播放音频
 */
declare function audioSelect(args: { type: string }, url: string): Promise<void>;
