export const iframe_client_generate = `
;
/**
 * 使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - \`iframe_events.GENERATION_STARTED\`: 生成开始
 * - 若启用流式传输, \`iframe_events.STREAM_TOKEN_RECEIVED_FULLY\`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, \`iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY\`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - \`iframe_events.GENERATION_ENDED\`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - \`user_input?:string\`: 用户输入
 *   - \`should_stream?:boolean\`: 是否启用流式传输; 默认为 'false'
 *   - \`overrides?:Overrides\`: 覆盖选项. 若设置, 则 \`overrides\` 中给出的字段将会覆盖对应的提示词. 如 \`overrides.char_description = '覆盖的角色描述';\` 将会覆盖角色描述
 *   - \`injects?:InjectionPrompt[]\`: 要额外注入的提示词
 *   - \`max_chat_history?:'all'|number\`: 最多使用多少条聊天历史
 * @returns 生成的最终文本
 *
 * @example
 * // 流式生成
 * const result = await generate({ user_input: '你好', should_stream: true });
 *
 * @example
 * // 注入、覆盖提示词
 * const result = await generate({
 *   user_input: '你好',
 *   injects: [{ role: 'system', content: '思维链...', position: 'in_chat', depth: 0, should_scan: true, }]
 *   overrides: {
 *     char_personality: '温柔',
 *     world_info_before: '',
 *     chat_history: {
 *       prompts: [],
 *     }
 *   }
 * });
 */
async function generate(config) {
    return await detail.make_iframe_promise({
        request: '[Generate][generate]',
        config: config,
    });
}
;
/**
 * 不使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - \`iframe_events.GENERATION_STARTED\`: 生成开始
 * - 若启用流式传输, \`iframe_events.STREAM_TOKEN_RECEIVED_FULLY\`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, \`iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY\`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - \`iframe_events.GENERATION_ENDED\`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - \`user_input?:string\`: 用户输入
 *   - \`should_stream?:boolean\`: 是否启用流式传输; 默认为 'false'
 *   - \`overrides?:Overrides\`: 覆盖选项. 若设置, 则 \`overrides\` 中给出的字段将会覆盖对应的提示词. 如 \`overrides.char_description = '覆盖的角色描述';\` 将会覆盖角色描述
 *   - \`injects?:InjectionPrompt[]\`: 要额外注入的提示词
 *   - \`ordered_prompts?:(BuiltinPrompt|RolePrompt)[]\`: 一个提示词数组, 数组元素将会按顺序发给 ai, 因而相当于自定义预设
 * @returns 生成的最终文本
 *
 * @example
 * // 自定义内置提示词顺序, 未在 ordered_prompts 中给出的将不会被使用
 * const result = await generateRaw({
 *   user_input: '你好',
 *   ordered_prompts: [
 *     'char_description',
 *     { role: 'system', content: '系统提示' },
 *     'chat_history',
 *     'user_input',
 *   ]
 * })
 */
async function generateRaw(config) {
    return await detail.make_iframe_promise({
        request: '[Generate][generateRaw]',
        config: config,
    });
}
;
;
;
;
/**
 * 预设为内置提示词设置的默认顺序
 */
const builtin_prompt_default_order = [
    'world_info_before', // 世界书(角色定义前)
    'persona_description', // 用户描述
    'char_description', // 角色描述
    'char_personality', // 角色性格
    'scenario', // 场景
    'world_info_after', // 世界书(角色定义后)
    'dialogue_examples', // 对话示例
    'chat_history', // 聊天历史 (含世界书中按深度插入的条目、作者注释)
    'user_input', // 用户输入
];
`