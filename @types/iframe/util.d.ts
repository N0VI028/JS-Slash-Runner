/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-iframe-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-iframe-脚本名称`; 对于脚本库是 `tavern-helper-script-脚本名称`
 */
declare function getIframeName(): string;

/**
 * 获取脚本的脚本库 id, **只能在脚本内使用**
 *
 * @returns 脚本库的 id
 */
declare function getScriptId(): string;

/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 */
declare function getCurrentMessageId(): number;

/**
 * 将接口共享到全局, 使之在其他 iframe 中可用
 *
 * 其他 iframe 将能通过 `await waitGlobalInitialized(global)` 来等待初始化完毕, 从而用 `global` 为变量名访问该接口
 *
 * @param global 要共享的接口名称
 * @param value 要共享的接口内容
 *
 * @example
 * initializeGlobal('Mvu', Mvu);
 */
declare function initializeGlobal(global: string, value: any): void;

/**
 * 等待其他 iframe 中共享出来的全局接口初始化完毕, 并使之在当前 iframe 中可用
 *
 * 这需要其他 iframe 通过 `initializeGlobal(global, value)` 来共享接口
 *
 * @param global 要初始化的全局接口名称, 当前已知的仅有 'Mvu'
 *
 * @example
 * await waitGlobalInitialized('Mvu');
 * ...此后可以直接使用 Mvu
 */
declare function waitGlobalInitialized(global: LiteralUnion<'Mvu', string>): Promise<void>;
