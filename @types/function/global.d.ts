/**
 * 将接口共享到全局, 使其可以在其他前端界面或脚本中使用.
 *
 * 其他前端界面或脚本将能通过 `await waitGlobalInitialized(global)` 来等待初始化完毕, 从而用 `global` 为变量名访问该接口.
 *
 * @param global 要共享的接口名称
 * @param value 要共享的接口内容
 *
 * @example
 * // 共享 Mvu 接口到全局
 * initializeGlobal('Mvu', Mvu);
 * // 此后其他前端界面或脚本中可以通过 `await waitGlobalInitialized('Mvu')` 来等待初始化完毕, 从而用 `Mvu` 为变量名访问该接口
 */
declare function initializeGlobal(global: LiteralUnion<'Mvu', string>, value: any): void;

/**
 * 等待其他前端界面或脚本中共享出来的全局接口初始化完毕, 并使之在当前前端界面或脚本中可用.
 *
 * 这需要其他前端界面或脚本通过 `initializeGlobal(global, value)` 来共享接口.
 *
 * @param global 要初始化的全局接口名称
 *
 * @example
 * await waitGlobalInitialized('Mvu');
 * ...此后可以直接使用 Mvu 接口
 */
declare function waitGlobalInitialized<T>(global: LiteralUnion<'Mvu', string>): Promise<T>;
