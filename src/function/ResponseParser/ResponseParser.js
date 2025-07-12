
export const ResponseParser = {
    extractMessageWithCotFromData
}

/**
 * 从数据中提取消息和 COT
 * @param data 
 * @returns { content: string; cot: string }
 */
/**
 * 提取 Google Gemini 的 COT 
 */
function extractMessageWithCotFromData(data) {
    let cot = '';
    let content = '';

    // 如果 data 是 string，说明没有 cot 直接返回
    if (typeof data === 'string') {
        return { content: data, cot: '' };
    }

    // 如果 data 是 null 或 undefined，直接返回空
    if (!data) {
        return { content: '', cot: '' };
    }

    // ---- 新增：优先处理 Gemini API 的特殊结构 ----

    const parts = data?.responseContent?.parts;
    // 通常来说, parts 是 [{…}, {…}]
    // 其中, 第一个是 cot, 
    // [{text : '1' , thought : true}, {text : '2'}]
    if (!Array.isArray(parts)) {
        // 如果不是数组或不存在，说明没有可查找的内容
        cot = '';
    }
    else {
        // 3使用 .find() 方法查找第一个满足条件的 part。
        // 条件是：part 存在，并且其 thought 属性严格等于 true。
        const thoughtPart = parts.find(part => part && part.thought === true);
        cot = thoughtPart?.text ?? '';
    }

    // 这里仍然是之前的逻辑
    content = (
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.text ??
        data?.message?.content?.[0]?.text ??
        data?.message?.tool_plan ??
        ''
    )
    return { content, cot }
}