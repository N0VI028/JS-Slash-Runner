/**
 * 纯函数解析器：从各 provider 的 chat-completions 响应中抽取 tool_calls、reasoning
 * signature 和消息文本。
 *
 * 这里刻意不依赖任何 SillyTavern 运行时，以便可以在 Node 环境下进行单元测试。
 */

export type NormalizedToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  /**
   * 加密的 reasoning/thought 签名。仅在 provider 返回时存在（当前主要是 Google Gemini 的 thoughtSignature，
   * 以及 OpenRouter 的 reasoning_details 中 id 与该 tool_call 绑定的 encrypted 数据），
   * 用户在多轮 tool call 时需要把它原样回传以维持推理上下文。
   */
  thought_signature?: string;
};

const randomId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `call_${Math.random().toString(36).slice(2)}`;

/**
 * 从响应数据中提取 tool_calls（兼容 OpenAI / Claude / Google / OpenRouter 格式）
 *
 * 同时尽力捕获 thought_signature（Gemini）/ reasoning.encrypted（OpenRouter）并挂到每个 tool_call 上，
 * 以便上层用户可以把它透传回下一轮请求，实现多轮工具调用。
 */
export function extractToolCallsFromData(data: any): NormalizedToolCall[] | null {
  if (!data || typeof data === 'string') return null;

  // 预先收集 OpenRouter reasoning_details 里 id 形如 tool_*/call_* 的 encrypted 签名，
  // 稍后按 tool_call.id 匹配挂载
  const toolSignatures: Record<string, string> = {};
  const reasoningDetails = [
    ...(data?.choices?.[0]?.message?.reasoning_details || []),
    ...(data?.choices?.[0]?.delta?.reasoning_details || []),
  ];
  for (const detail of reasoningDetails) {
    if (
      detail?.type === 'reasoning.encrypted' &&
      detail?.data &&
      typeof detail?.id === 'string' &&
      /^(tool_|call_)/.test(detail.id)
    ) {
      toolSignatures[detail.id] = detail.data;
    }
  }

  // OpenAI 格式: choices[0].message.tool_calls
  const oaiToolCalls = data?.choices?.[0]?.message?.tool_calls;
  if (Array.isArray(oaiToolCalls) && oaiToolCalls.length > 0) {
    return oaiToolCalls.map((tc: any) => {
      const id = tc.id ?? randomId();
      const signature = tc.thoughtSignature ?? tc.thought_signature ?? tc.signature ?? toolSignatures[id];
      return {
        id,
        type: 'function' as const,
        function: {
          name: tc.function?.name ?? '',
          arguments:
            typeof tc.function?.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments ?? {}),
        },
        ...(signature ? { thought_signature: signature } : {}),
      };
    });
  }

  // Claude 格式: content[] with type === 'tool_use'
  const claudeContent = data?.content ?? data?.message?.content;
  if (Array.isArray(claudeContent)) {
    const toolUseBlocks = claudeContent.filter((b: any) => b?.type === 'tool_use' && b?.name);
    if (toolUseBlocks.length > 0) {
      return toolUseBlocks.map((b: any) => ({
        id: b.id ?? randomId(),
        type: 'function' as const,
        function: {
          name: b.name,
          arguments: typeof b.input === 'string' ? b.input : JSON.stringify(b.input ?? {}),
        },
      }));
    }
  }

  // Google 格式: 直接从 candidates[0].content.parts[] 或 ST 后端包装的 responseContent.parts[] 读取 functionCall
  // Gemini 的 thoughtSignature 可能挂在 functionCall 所在的 part 上
  const parts = data?.candidates?.[0]?.content?.parts ?? data?.responseContent?.parts;
  if (Array.isArray(parts)) {
    const fnParts = parts.filter((p: any) => p?.functionCall);
    if (fnParts.length > 0) {
      return fnParts.map((p: any) => ({
        id: randomId(),
        type: 'function' as const,
        function: {
          name: p.functionCall.name,
          arguments:
            typeof p.functionCall.args === 'string'
              ? p.functionCall.args
              : JSON.stringify(p.functionCall.args ?? {}),
        },
        ...(p.thoughtSignature ? { thought_signature: p.thoughtSignature } : {}),
      }));
    }
  }

  return null;
}

/**
 * 从响应数据中提取顶层的 reasoning signature（非绑定到具体 tool_call 的那一份）。
 *
 * - Gemini/Vertex: responseContent.parts[] 或 candidates[0].content.parts[] 中带 text 且带 thoughtSignature 的 part
 * - OpenRouter: choices[0].message.reasoning_details[] 中 type==='reasoning.encrypted' 且 id 不是 tool_* 的项
 * - Claude: content[] 中 type==='thinking' 块上的 signature 字段
 *
 * 返回 null 表示数据中没有可用的签名。
 */
export function extractReasoningSignatureFromData(data: any): string | null {
  if (!data || typeof data === 'string') return null;

  // Gemini: ST 后端会把 responseContent 原样挂回 OAI 包装
  const geminiParts = data?.responseContent?.parts ?? data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(geminiParts)) {
    for (const part of geminiParts) {
      if (part?.thoughtSignature && typeof part?.text === 'string') {
        return part.thoughtSignature;
      }
    }
  }

  // OpenRouter
  const reasoningDetails = data?.choices?.[0]?.message?.reasoning_details;
  if (Array.isArray(reasoningDetails)) {
    for (const detail of reasoningDetails) {
      if (detail?.type === 'reasoning.encrypted' && detail?.data) {
        const id = typeof detail.id === 'string' ? detail.id : '';
        if (!/^(tool_|call_)/.test(id)) {
          return detail.data;
        }
      }
    }
  }

  // Claude: thinking 块上的 signature
  const claudeContent = data?.content ?? data?.message?.content;
  if (Array.isArray(claudeContent)) {
    for (const block of claudeContent) {
      if (block?.type === 'thinking' && typeof block?.signature === 'string' && block.signature) {
        return block.signature;
      }
    }
  }

  return null;
}

/**
 * 从流式 chunk 中累积 tool_calls delta（OpenAI 流式格式）
 * 与 ST 的 ToolManager.parseToolCalls 类似，但不依赖 ToolManager 注册状态
 */
export function accumulateToolCallDeltas(toolCalls: any[], parsed: any): void {
  // OpenAI 流式格式: choices[0].delta.tool_calls[]
  const deltas = parsed?.choices?.[0]?.delta?.tool_calls;
  if (!Array.isArray(deltas)) return;

  for (const delta of deltas) {
    const idx = delta?.index ?? 0;

    if (!toolCalls[idx]) {
      toolCalls[idx] = {
        id: delta.id ?? '',
        type: delta.type ?? 'function',
        function: { name: '', arguments: '' },
      };
    }

    const target = toolCalls[idx];
    if (delta.id) target.id = delta.id;
    if (delta.type) target.type = delta.type;
    if (delta.function?.name) target.function.name += delta.function.name;
    if (delta.function?.arguments) target.function.arguments += delta.function.arguments;
    // Gemini 流式一般在最后一段 chunk 才给 thoughtSignature
    if (delta.thoughtSignature) target.thoughtSignature = delta.thoughtSignature;
  }
}

/**
 * 从响应数据中提取消息内容
 * @param data 响应数据
 * @returns 提取的消息字符串
 */
export function extractMessageFromData(data: any): string {
  if (typeof data === 'string') {
    return data;
  }

  return (
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.text ??
    data?.message?.content?.[0]?.text ??
    data?.message?.tool_plan ??
    ''
  );
}
