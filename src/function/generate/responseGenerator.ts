import {
  createGenerationParameters,
  getChatCompletionModelCompat,
} from '@/function/generate/createGenerationParametersCompat';
import { CustomApiConfig, GenerateToolCallResult, JsonSchema, ToolChoice, ToolDefinition } from '@/function/generate/types';
import {
  accumulateToolCallDeltas,
  clearInjectionPrompts,
  extractMessageFromData,
  extractReasoningSignatureFromData,
  extractToolCallsFromData,
  normalizeBaseURL,
  setupImageArrayProcessing,
} from '@/function/generate/utils';
import { saveChatConditionalDebounced } from '@/util/tavern';
import {
  cleanUpMessage,
  countOccurrences,
  eventSource,
  event_types,
  getRequestHeaders,
  isOdd,
} from '@sillytavern/script';
import {
  getChatCompletionModel,
  getStreamingReply,
  oai_settings,
  proxies,
  sendOpenAIRequest,
  tryParseStreamingError,
} from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { getEventSourceStream } from '@sillytavern/scripts/sse-stream';
import { Stopwatch, uuidv4 } from '@sillytavern/scripts/utils';

/**
 * 流式处理器类
 * 处理流式生成的响应数据
 */
class StreamingProcessor {
  public generator: () => AsyncGenerator<{ text: string; toolCalls?: any[]; state?: any }, void, void>;
  public stoppingStrings?: any;
  public result: string;
  public toolCalls: any[];
  public reasoningSignature: string;
  public toolSignatures: Record<string, string>;
  public isStopped: boolean;
  public isFinished: boolean;
  public abortController: AbortController;
  private messageBuffer: string;
  private generationId: string;

  constructor(generationId: string, abortController: AbortController) {
    this.result = '';
    this.toolCalls = [];
    this.reasoningSignature = '';
    this.toolSignatures = {};
    this.messageBuffer = '';
    this.isStopped = false;
    this.isFinished = false;
    this.generator = this.nullStreamingGeneration;
    this.abortController = abortController;
    this.generationId = generationId;
  }

  onProgressStreaming(data: { text: string; isFinal: boolean }) {
    // 计算增量文本
    const newText = data.text.slice(this.messageBuffer.length);
    this.messageBuffer = data.text;
    // @ts-expect-error 兼容酒馆旧版本
    let processedText = cleanUpMessage(newText, false, false, !data.isFinal, this.stoppingStrings);

    const charsToBalance = ['*', '"', '```'];
    for (const char of charsToBalance) {
      if (!data.isFinal && isOdd(countOccurrences(processedText, char))) {
        const separator = char.length > 1 ? '\n' : '';
        processedText = processedText.trimEnd() + separator + char;
      }
    }

    eventSource.emit('js_stream_token_received_fully', data.text, this.generationId);
    eventSource.emit('js_stream_token_received_incrementally', processedText, this.generationId);

    if (data.isFinal) {
      // @ts-expect-error 兼容酒馆旧版本
      const message = cleanUpMessage(data.text, false, false, false, this.stoppingStrings);
      eventSource.emit('js_generation_before_end', { message }, this.generationId);
      eventSource.emit('js_generation_ended', message, this.generationId);
      data.text = message;
    }
  }

  onErrorStreaming() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStopped = true;
    saveChatConditionalDebounced();
  }

  // eslint-disable-next-line require-yield
  async *nullStreamingGeneration(): AsyncGenerator<{ text: string; toolCalls?: any[]; state?: any }, void, void> {
    throw Error('Generation function for streaming is not hooked up');
  }

  async generate(): Promise<string> {
    try {
      const sw = new Stopwatch(1000 / power_user.streaming_fps);

      for await (const { text, toolCalls, state } of this.generator()) {
        if (this.isStopped) {
          this.messageBuffer = '';
          return this.result;
        }

        this.result = text;
        if (toolCalls) {
          this.toolCalls = toolCalls;
        }
        if (state) {
          if (typeof state.signature === 'string' && state.signature) {
            this.reasoningSignature = state.signature;
          }
          if (state.toolSignatures && typeof state.toolSignatures === 'object') {
            Object.assign(this.toolSignatures, state.toolSignatures);
          }
        }
        await sw.tick(() => this.onProgressStreaming({ text: this.result, isFinal: false }));
      }

      if (!this.isStopped) {
        this.onProgressStreaming({ text: this.result, isFinal: true });
      } else {
        this.messageBuffer = '';
      }
    } catch (err) {
      if (!this.isFinished) {
        this.onErrorStreaming();
        throw Error(`Generate method error: ${err}`);
      }
      this.messageBuffer = '';
      return this.result;
    }

    this.isFinished = true;
    return this.result;
  }
}

/**
 * 解析代理预设配置
 * 根据 proxy_preset 名称查找酒馆已保存的代理预设
 * - 预设未找到：回退到 customApi（保留用户传的 apiurl 和 key）
 * - 预设找到：完全使用预设的 url 和 password（即使为空也不回退）
 */
function resolveProxyPreset(customApi: CustomApiConfig): CustomApiConfig {
  if (!customApi.proxy_preset) return customApi;

  const preset = proxies.find(p => p.name === customApi.proxy_preset?.trim());
  if (!preset) {
    console.warn(
      `代理预设 '${customApi.proxy_preset}' 未找到，将回退到 ${customApi.apiurl ? 'custom_api.apiurl' : '当前 ST 源'}`,
    );
    return customApi;
  }

  return {
    ...customApi,
    apiurl: preset.url,
    key: preset.password ?? '',
  };
}

/**
 * 应用自定义API参数覆盖
 */
function applyCustomApiOverrides(generate_data: any, customApi: CustomApiConfig) {
  // 只有明确指定 apiurl 时才覆盖 reverse_proxy
  if (customApi.apiurl) {
    generate_data.reverse_proxy = normalizeBaseURL(customApi.apiurl);
    generate_data.proxy_password = customApi.key || '';
  }

  if (customApi.model) {
    generate_data.model = customApi.model;
  }

  const set_param = (param: keyof CustomApiConfig) => {
    const input = customApi[param] ?? 'same_as_preset';
    if (input === 'unset') {
      delete generate_data[param];
    } else if (input !== 'same_as_preset') {
      generate_data[param] = input;
    }
  };
  set_param('max_tokens');
  set_param('temperature');
  set_param('frequency_penalty');
  set_param('presence_penalty');
  set_param('top_p');
  set_param('top_k');
}

/**
 * 发送自定义API请求（流式）
 */
async function* sendCustomApiRequestStreaming(
  messages: any[],
  signal: AbortSignal,
  customApi: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): AsyncGenerator<{ text: string; toolCalls?: any[]; state?: any }, void, void> {
  const source = customApi.source || (customApi.apiurl ? 'openai' : oai_settings.chat_completion_source);
  const settings = {
    ...oai_settings,
    chat_completion_source: source,
    stream_openai: true,
  };

  const model = getChatCompletionModelCompat(getChatCompletionModel, settings);
  const { generate_data } = (await createGenerationParameters(settings, model, 'normal', messages, {
    tools: toolOptions?.tools,
    tool_choice: toolOptions?.tool_choice,
    jsonSchema: jsonSchema,
  })) as {
    generate_data: any;
  };
  applyCustomApiOverrides(generate_data, customApi);

  await eventSource.emit(event_types.CHAT_COMPLETION_SETTINGS_READY, generate_data);

  const response = await fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(generate_data),
    signal,
  });

  if (!response.ok) {
    const responseText = await response.text();
    tryParseStreamingError(response, responseText);
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const eventStream = getEventSourceStream();
  response.body.pipeThrough(eventStream);
  const reader = eventStream.readable.getReader();
  let text = '';
  const toolCalls: any[] = [];
  const state = { reasoning: '', images: [], signature: '', toolSignatures: {} };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const rawData = value.data;
      if (rawData === '[DONE]') break;

      tryParseStreamingError(response, rawData);

      let parsed;
      try {
        parsed = JSON.parse(rawData);
      } catch {
        continue;
      }

      const chunk = getStreamingReply(parsed, state, { chatCompletionSource: source });
      if (chunk) {
        text += chunk;
      }

      // Accumulate streaming tool_calls deltas
      accumulateToolCallDeltas(toolCalls, parsed);

      yield { text, toolCalls, state };
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 发送自定义API请求（非流式）
 */
async function sendCustomApiRequestNonStreaming(
  messages: any[],
  signal: AbortSignal,
  customApi: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): Promise<any> {
  const source = customApi.source || (customApi.apiurl ? 'openai' : oai_settings.chat_completion_source);
  const settings = {
    ...oai_settings,
    chat_completion_source: source,
    stream_openai: false,
  };

  const model = getChatCompletionModelCompat(getChatCompletionModel, settings);
  const { generate_data } = (await createGenerationParameters(settings, model, 'normal', messages, {
    tools: toolOptions?.tools,
    tool_choice: toolOptions?.tool_choice,
    jsonSchema: jsonSchema,
  })) as {
    generate_data: any;
  };
  applyCustomApiOverrides(generate_data, customApi);

  await eventSource.emit(event_types.CHAT_COMPLETION_SETTINGS_READY, generate_data);

  const response = await fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(generate_data),
    signal,
  });

  if (!response.ok) {
    const responseText = await response.text();
    tryParseStreamingError(response, responseText);
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'API error');
  }

  return data;
}

/**
 * 处理非流式响应
 * @param response API响应对象
 * @returns 提取的消息文本
 */
async function handleResponse(response: any, generationId: string, hasTools: boolean): Promise<string | GenerateToolCallResult> {
  if (!response) {
    throw Error(`未得到响应`);
  }
  if (response.error) {
    if (response?.response) {
      toastr.error(response.response, t`API 错误`, {
        preventDuplicates: true,
      });
    }
    throw Error(response?.response);
  }

  // 检查是否有 tool_calls
  if (hasTools) {
    const toolCalls = extractToolCallsFromData(response);
    if (toolCalls) {
      const content = extractMessageFromData(response);
      const reasoningSignature = extractReasoningSignatureFromData(response);
      const toolCallResult: GenerateToolCallResult = {
        content,
        tool_calls: toolCalls,
        ...(reasoningSignature ? { reasoning_signature: reasoningSignature } : {}),
      };
      eventSource.emit('js_generation_before_end', { message: content }, generationId);
      eventSource.emit('js_generation_ended', content, generationId);
      return toolCallResult;
    }
  }

  const result = { message: extractMessageFromData(response) };
  eventSource.emit('js_generation_before_end', result, generationId);
  eventSource.emit('js_generation_ended', result.message, generationId);
  return result.message;
}

/**
 * 将流式累积的 toolCalls 数组转换为 GenerateToolCallResult
 */
function buildToolCallResult(
  content: string,
  toolCalls: any[],
  extras?: { reasoningSignature?: string; toolSignatures?: Record<string, string> },
): GenerateToolCallResult {
  // toolCalls 可能是嵌套数组 (来自 ST 的 ToolManager 格式: toolCalls[choiceIndex][callIndex])
  // 或扁平数组 (来自自定义 API 路径的 accumulateToolCallDeltas)
  const flatCalls = Array.isArray(toolCalls[0]) ? toolCalls[0] : toolCalls;
  const toolSignatures = extras?.toolSignatures ?? {};
  return {
    content,
    tool_calls: flatCalls.map((tc: any) => {
      const id = tc.id ?? crypto.randomUUID();
      // ST 的 ToolManager 用 signature / thoughtSignature 两种命名
      const signature = tc.thoughtSignature ?? tc.thought_signature ?? tc.signature ?? toolSignatures[id];
      return {
        id,
        type: 'function' as const,
        function: {
          name: tc.function?.name ?? tc.name ?? '',
          arguments: typeof tc.function?.arguments === 'string'
            ? tc.function.arguments
            : typeof tc.input === 'string'
              ? tc.input
              : JSON.stringify(tc.function?.arguments ?? tc.input ?? {}),
        },
        ...(signature ? { thought_signature: signature } : {}),
      };
    }),
    ...(extras?.reasoningSignature ? { reasoning_signature: extras.reasoningSignature } : {}),
  };
}

/**
 * 生成响应
 * @param generate_data 生成数据
 * @param useStream 是否使用流式传输
 * @param generationId 生成ID
 * @param imageProcessingSetup 图片数组处理设置，包含Promise和解析器
 * @param abortController 中止控制器
 * @param customApi 自定义API配置
 * @returns 生成的响应文本
 */
export async function generateResponse(
  generate_data: any,
  useStream = false,
  generationId: string | undefined = undefined,
  imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined,
  abortController: AbortController,
  customApi?: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): Promise<string | GenerateToolCallResult> {
  let result: string | GenerateToolCallResult = '';
  const hasTools = !!(toolOptions?.tools?.length);

  try {
    // 如果有图片处理，等待图片处理完成
    if (imageProcessingSetup) {
      try {
        await imageProcessingSetup.imageProcessingPromise;
      } catch (imageError: any) {
        throw new Error(`图片处理失败: ${imageError?.message || '未知错误'}`);
      }
    }
    if (generationId === undefined || generationId === '') {
      generationId = uuidv4();
    }
    eventSource.emit('js_generation_started', generationId);

    if (customApi) {
      customApi = resolveProxyPreset(customApi);
      const validCustomApi = customApi;
      if (useStream) {
        const streamingProcessor = new StreamingProcessor(generationId, abortController);
        streamingProcessor.generator = () =>
          sendCustomApiRequestStreaming(generate_data.prompt, abortController.signal, validCustomApi, toolOptions, jsonSchema);
        result = await streamingProcessor.generate();
        if (hasTools && streamingProcessor.toolCalls.length > 0) {
          result = buildToolCallResult(result, streamingProcessor.toolCalls, {
            reasoningSignature: streamingProcessor.reasoningSignature || undefined,
            toolSignatures: streamingProcessor.toolSignatures,
          });
        }
      } else {
        const response = await sendCustomApiRequestNonStreaming(
          generate_data.prompt,
          abortController.signal,
          validCustomApi,
          toolOptions,
          jsonSchema,
        );
        result = await handleResponse(response, generationId, hasTools);
      }
    } else {
      // 如果用户传了 tools/json_schema 但没有 custom_api，通过事件注入到 generate_data
      const needsInjection = hasTools || jsonSchema;
      const optionsInjector = needsInjection
        ? (data: any) => {
            if (hasTools) {
              data.tools = toolOptions!.tools;
              data.tool_choice = toolOptions!.tool_choice ?? 'auto';
            }
            if (jsonSchema) {
              data.json_schema = jsonSchema;
            }
          }
        : null;
      if (optionsInjector) {
        eventSource.once(event_types.CHAT_COMPLETION_SETTINGS_READY, optionsInjector);
      }
      try {
        if (useStream) {
          oai_settings.stream_openai = true;
          const streamingProcessor = new StreamingProcessor(generationId, abortController);
          // @ts-expect-error 类型正确
          streamingProcessor.generator = await sendOpenAIRequest(
            'normal',
            generate_data.prompt,
            abortController.signal,
          );
          result = await streamingProcessor.generate();
          if (hasTools && streamingProcessor.toolCalls.length > 0) {
            result = buildToolCallResult(result, streamingProcessor.toolCalls);
          }
        } else {
          oai_settings.stream_openai = false;
          const response = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
          result = await handleResponse(response, generationId, hasTools);
        }
      } finally {
        if (optionsInjector) {
          eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, optionsInjector);
        }
        oai_settings.stream_openai = $('#stream_toggle').is(':checked');
      }
    }
  } catch (error) {
    // 如果有图片处理设置但生成失败，确保拒绝Promise
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    throw error;
  } finally {
    await clearInjectionPrompts(['INJECTION']);
  }
  return result;
}
