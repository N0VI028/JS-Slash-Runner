import { GenerateToolCallResult, ToolChoice, ToolDefinition } from '@/function/generate/types';

export type SupportedToolCallSource =
  | 'openai'
  | 'claude'
  | 'openrouter'
  | 'makersuite'
  | 'vertexai'
  | 'azure_openai'
  | 'custom'
  | 'deepseek'
  | 'xai';

type ToolCallResponseFamily = 'openai' | 'claude' | 'makersuite';

type NormalizedToolCall = GenerateToolCallResult['tool_calls'][number];
type RequestToolOptions = { tools?: ToolDefinition[]; tool_choice?: ToolChoice };
type NormalizedRequestToolChoice = ToolChoice | 'any';
type NormalizedRequestToolOptions = { tools?: ToolDefinition[]; tool_choice?: NormalizedRequestToolChoice };

const CLAUDE_INPUT_DELTA_KEY = '__input_json_delta';
const SUPPORTED_TOOL_CALL_SOURCES: SupportedToolCallSource[] = [
  'openai',
  'claude',
  'openrouter',
  'makersuite',
  'vertexai',
  'azure_openai',
  'custom',
  'deepseek',
  'xai',
];

function getToolCallResponseFamily(source: SupportedToolCallSource): ToolCallResponseFamily | undefined {
  switch (source) {
    case 'claude':
      return 'claude';
    case 'makersuite':
    case 'vertexai':
      return 'makersuite';
    case 'openai':
    case 'openrouter':
    case 'azure_openai':
    case 'custom':
    case 'deepseek':
    case 'xai':
      return 'openai';
    default:
      return undefined;
  }
}

export function resolveToolCallSource(input: {
  customSource?: string;
  hasCustomApiUrl?: boolean;
  defaultSource?: string;
}): string | undefined {
  if (input.customSource) {
    return input.customSource;
  }

  if (input.hasCustomApiUrl) {
    return 'openai';
  }

  return input.defaultSource;
}

export function isSupportedToolCallSource(source: string | undefined): source is SupportedToolCallSource {
  return typeof source === 'string' && SUPPORTED_TOOL_CALL_SOURCES.includes(source as SupportedToolCallSource);
}

export function hasToolCallRequestOptions(input: {
  toolOptions?: { tools?: unknown[] };
  jsonSchema?: unknown;
}): boolean {
  return Boolean((input.toolOptions?.tools?.length ?? 0) > 0 || input.jsonSchema);
}

function findForcedFunctionName(toolChoice: ToolChoice | undefined): string | undefined {
  if (!toolChoice || typeof toolChoice === 'string') {
    return undefined;
  }

  return toolChoice.function?.name;
}

export function normalizeRequestToolOptionsForSource(
  source: SupportedToolCallSource,
  toolOptions?: RequestToolOptions,
): { toolOptions?: NormalizedRequestToolOptions; warnings: string[] } {
  if (!toolOptions?.tools?.length) {
    return { toolOptions, warnings: [] };
  }

  const warnings: string[] = [];
  const tools = toolOptions.tools;
  const toolChoice = toolOptions.tool_choice;
  const forcedFunctionName = findForcedFunctionName(toolChoice);

  if (source === 'claude') {
    if (toolChoice === 'required') {
      return {
        toolOptions: { tools, tool_choice: 'any' },
        warnings,
      };
    }

    if (forcedFunctionName) {
      const forcedTools = tools.filter(tool => tool.function?.name === forcedFunctionName);
      if (forcedTools.length > 0) {
        warnings.push(`Claude 不兼容 OpenAI 风格的指定函数 tool_choice，已改为仅暴露目标工具 ${forcedFunctionName} 并强制 tool use。`);
        return {
          toolOptions: { tools: forcedTools, tool_choice: 'any' },
          warnings,
        };
      }

      warnings.push(`Claude 指定工具 ${forcedFunctionName} 未在 tools 中找到，已回退为 auto。`);
      return {
        toolOptions: { tools, tool_choice: 'auto' },
        warnings,
      };
    }

    return {
      toolOptions: { tools, tool_choice: toolChoice },
      warnings,
    };
  }

  if (source === 'makersuite' || source === 'vertexai') {
    if (toolChoice === 'none') {
      warnings.push(`${source} 当前不发送 tool_choice=none，已移除工具定义。`);
      return {
        toolOptions: undefined,
        warnings,
      };
    }

    if (forcedFunctionName) {
      const forcedTools = tools.filter(tool => tool.function?.name === forcedFunctionName);
      if (forcedTools.length > 0) {
        warnings.push(`${source} 不兼容 OpenAI 风格的指定函数 tool_choice，已改为仅暴露目标工具 ${forcedFunctionName}。`);
        return {
          toolOptions: { tools: forcedTools },
          warnings,
        };
      }

      warnings.push(`${source} 指定工具 ${forcedFunctionName} 未在 tools 中找到，已忽略 tool_choice。`);
      return {
        toolOptions: { tools },
        warnings,
      };
    }

    if (toolChoice === 'required') {
      warnings.push(`${source} 当前不支持严格 required tool_choice，已保留 tools 并忽略该选项。`);
    }

    return {
      toolOptions: { tools },
      warnings,
    };
  }

  return {
    toolOptions,
    warnings,
  };
}

export function getIgnoredToolCallWarningMessage(source: string | undefined): string {
  const sourceLabel = source ?? 'unknown';
  return `当前源 ${sourceLabel} 不支持 tools/json_schema，已忽略这些参数并继续请求`;
}

function normalizeArguments(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value ?? {});
}

function normalizeToolCall(input: {
  id?: string;
  name?: string;
  arguments?: unknown;
  input?: unknown;
  args?: unknown;
  thoughtSignature?: string;
  thought_signature?: string;
  signature?: string;
}): NormalizedToolCall {
  const thoughtSignature = input.thought_signature ?? input.thoughtSignature ?? input.signature;
  return {
    id: input.id ?? crypto.randomUUID(),
    type: 'function',
    function: {
      name: input.name ?? '',
      arguments: normalizeArguments(input.arguments ?? input.input ?? input.args),
    },
    ...(thoughtSignature ? { thought_signature: thoughtSignature } : {}),
  };
}

function mergeToolCallDelta(target: Record<string, any>, delta: Record<string, any>): void {
  for (const key in delta) {
    if (!Object.prototype.hasOwnProperty.call(delta, key)) continue;
    if (key === '__proto__' || key === 'constructor') continue;

    const deltaValue = delta[key];
    const targetValue = target[key];

    if (deltaValue === null || deltaValue === undefined) {
      target[key] = deltaValue;
      continue;
    }

    if (typeof deltaValue === 'string') {
      target[key] = typeof targetValue === 'string' ? targetValue + deltaValue : deltaValue;
      continue;
    }

    if (typeof deltaValue === 'object' && !Array.isArray(deltaValue)) {
      if (typeof targetValue !== 'object' || targetValue === null || Array.isArray(targetValue)) {
        target[key] = {};
      }
      mergeToolCallDelta(target[key], deltaValue);
      continue;
    }

    target[key] = deltaValue;
  }
}

function ensureToolCallAt(toolCalls: Record<string, any>[], index: number): Record<string, any> {
  if (!toolCalls[index]) {
    toolCalls[index] = {};
  }
  return toolCalls[index];
}

export function extractToolCallsForSupportedSources(
  data: unknown,
  source: SupportedToolCallSource,
): NormalizedToolCall[] | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const family = getToolCallResponseFamily(source);
  if (family === 'openai') {
    const toolCalls = (data as any)?.choices?.[0]?.message?.tool_calls;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return null;
    }

    const toolSignatures: Record<string, string> = {};
    if (source === 'openrouter') {
      const reasoningDetails = (data as any)?.choices?.[0]?.message?.reasoning_details;
      if (Array.isArray(reasoningDetails)) {
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
      }
    }

    return toolCalls.map((toolCall: any) =>
      normalizeToolCall({
        id: toolCall?.id,
        name: toolCall?.function?.name,
        arguments: toolCall?.function?.arguments,
        thoughtSignature: toolCall?.thoughtSignature ?? toolSignatures[toolCall?.id ?? ''],
        thought_signature: toolCall?.thought_signature,
        signature: toolCall?.signature,
      }),
    );
  }

  if (family === 'claude') {
    const blocks = (data as any)?.content ?? (data as any)?.message?.content;
    if (!Array.isArray(blocks)) {
      return null;
    }

    const toolUses = blocks.filter((block: any) => block?.type === 'tool_use' && block?.name);
    if (toolUses.length === 0) {
      return null;
    }

    return toolUses.map((toolUse: any) =>
      normalizeToolCall({
        id: toolUse?.id,
        name: toolUse?.name,
        input: toolUse?.input,
        thoughtSignature: toolUse?.thoughtSignature,
        thought_signature: toolUse?.thought_signature,
        signature: toolUse?.signature,
      }),
    );
  }

  if (family !== 'makersuite') {
    return null;
  }

  const parts = (data as any)?.candidates?.[0]?.content?.parts ?? (data as any)?.responseContent?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const functionCalls = parts.filter((part: any) => part?.functionCall);
  if (functionCalls.length === 0) {
    return null;
  }

  return functionCalls.map((part: any) =>
    normalizeToolCall({
      name: part.functionCall?.name,
      args: part.functionCall?.args,
      thoughtSignature: part?.thoughtSignature ?? part?.functionCall?.thoughtSignature,
      thought_signature: part?.thought_signature ?? part?.functionCall?.thought_signature,
      signature: part?.signature ?? part?.functionCall?.signature,
    }),
  );
}

export function extractReasoningSignatureForSupportedSources(
  data: unknown,
  source: SupportedToolCallSource,
): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const family = getToolCallResponseFamily(source);
  if (source === 'openrouter') {
    const reasoningDetails = (data as any)?.choices?.[0]?.message?.reasoning_details;
    if (Array.isArray(reasoningDetails)) {
      for (const detail of reasoningDetails) {
        if (detail?.type === 'reasoning.encrypted' && detail?.data) {
          const id = typeof detail?.id === 'string' ? detail.id : '';
          if (!/^(tool_|call_)/.test(id)) {
            return detail.data;
          }
        }
      }
    }
  }

  if (family === 'claude') {
    const blocks = (data as any)?.content ?? (data as any)?.message?.content;
    if (!Array.isArray(blocks)) {
      return null;
    }

    for (const block of blocks) {
      if (block?.type === 'thinking' && typeof block?.signature === 'string' && block.signature) {
        return block.signature;
      }
    }

    return null;
  }

  if (family !== 'makersuite') {
    return null;
  }

  const parts = (data as any)?.candidates?.[0]?.content?.parts ?? (data as any)?.responseContent?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    if (typeof part?.text === 'string' && typeof part?.thoughtSignature === 'string' && part.thoughtSignature) {
      return part.thoughtSignature;
    }
  }

  return null;
}

export function accumulateToolCallDeltasForSupportedSources(
  toolCalls: Record<string, any>[],
  parsed: any,
  source: SupportedToolCallSource,
): void {
  const family = getToolCallResponseFamily(source);
  if (family === 'openai') {
    const choices = parsed?.choices;
    if (!Array.isArray(choices)) {
      return;
    }

    for (const choice of choices) {
      const deltas = choice?.delta?.tool_calls;
      if (!Array.isArray(deltas)) {
        continue;
      }

      for (const delta of deltas) {
        const index = typeof delta?.index === 'number' ? delta.index : 0;
        const target = ensureToolCallAt(toolCalls, index);
        mergeToolCallDelta(target, delta);
      }
    }
    return;
  }

  if (family === 'claude') {
    if (parsed?.content_block?.type === 'tool_use') {
      const index = typeof parsed?.index === 'number' ? parsed.index : 0;
      const target = ensureToolCallAt(toolCalls, index);
      mergeToolCallDelta(target, parsed.content_block);
      return;
    }

    if (parsed?.delta?.type === 'input_json_delta') {
      const index = typeof parsed?.index === 'number' ? parsed.index : 0;
      const target = ensureToolCallAt(toolCalls, index);
      target[CLAUDE_INPUT_DELTA_KEY] = (target[CLAUDE_INPUT_DELTA_KEY] ?? '') + (parsed?.delta?.partial_json ?? '');
      return;
    }

    if (parsed?.type === 'content_block_stop') {
      const index = typeof parsed?.index === 'number' ? parsed.index : 0;
      const target = toolCalls[index];
      const deltaText = target?.[CLAUDE_INPUT_DELTA_KEY];
      if (!target || !deltaText) {
        return;
      }

      try {
        delete target[CLAUDE_INPUT_DELTA_KEY];
        mergeToolCallDelta(target, { input: JSON.parse(deltaText) });
      } catch {
        // Ignore malformed partial JSON and let the caller fall back gracefully.
      }
    }
    return;
  }

  if (family !== 'makersuite') {
    return;
  }

  const candidates = parsed?.candidates;
  if (!Array.isArray(candidates)) {
    return;
  }

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (!part?.functionCall) {
        continue;
      }

      const target = ensureToolCallAt(toolCalls, index);
      mergeToolCallDelta(target, part.functionCall);
      if (typeof part?.thoughtSignature === 'string' && part.thoughtSignature) {
        target.thoughtSignature = part.thoughtSignature;
      }
      if (typeof part?.thought_signature === 'string' && part.thought_signature) {
        target.thought_signature = part.thought_signature;
      }
      if (typeof part?.signature === 'string' && part.signature) {
        target.signature = part.signature;
      }
    }
  }
}

export function normalizeAccumulatedToolCalls(toolCalls: Record<string, any>[]): NormalizedToolCall[] {
  return toolCalls.filter(Boolean).map(toolCall =>
    normalizeToolCall({
      id: toolCall?.id,
      name: toolCall?.function?.name ?? toolCall?.name,
      arguments: toolCall?.function?.arguments,
      input: toolCall?.input,
      args: toolCall?.args,
      thoughtSignature: toolCall?.thoughtSignature,
      thought_signature: toolCall?.thought_signature,
      signature: toolCall?.signature,
    }),
  );
}
