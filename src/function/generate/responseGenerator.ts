import {
  createGenerationParameters,
  getChatCompletionModelCompat,
} from '@/function/generate/createGenerationParametersCompat';
import { CustomApiConfig, GenerateToolCallResult, JsonSchema, ToolChoice, ToolDefinition } from '@/function/generate/types';
import {
  clearInjectionPrompts,
  extractMessageFromData,
  normalizeBaseURL,
  setupImageArrayProcessing,
} from '@/function/generate/utils';
import {
  accumulateToolCallDeltasForSupportedSources,
  extractReasoningSignatureForSupportedSources,
  extractToolCallsForSupportedSources,
  getIgnoredToolCallWarningMessage,
  hasToolCallRequestOptions,
  isSupportedToolCallSource,
  normalizeRequestToolOptionsForSource,
  normalizeAccumulatedToolCalls,
  resolveToolCallSource,
  SupportedToolCallSource,
} from '@/function/generate/toolCallCompat';
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
import YAML from 'yaml';

/**
 * 用 YAML 形式覆盖自定义请求头中的 Authorization，保留其他已有头
 * @param customIncludeHeaders 自定义请求头 YAML 字符串
 * @param key 要覆盖写入的 API Key
 * @returns 更新后的 YAML 字符串
 */
function overrideCustomAuthorizationHeader(customIncludeHeaders: unknown, key: string): string {
  const parsed =
    typeof customIncludeHeaders === 'string' && customIncludeHeaders.trim()
      ? YAML.parse(customIncludeHeaders)
      : undefined;

  const headers = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  headers.Authorization = `Bearer ${key}`;
  return YAML.stringify(headers).trimEnd();
}

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

function applyCustomApiOverrides(generateData: any, customApi: CustomApiConfig) {
  if (customApi.apiurl) {
    const normalizedApiUrl = normalizeBaseURL(customApi.apiurl);
    generateData.reverse_proxy = normalizedApiUrl;
    generateData.proxy_password = customApi.key || '';
    if (generateData.chat_completion_source === 'custom') {
      generateData.custom_url = normalizedApiUrl;
      if (customApi.key) {
        generateData.custom_include_headers = overrideCustomAuthorizationHeader(
          generateData.custom_include_headers,
          customApi.key,
        );
      }
    }
  }

  if (customApi.model) {
    generateData.model = customApi.model;
  }

  const setParam = (param: keyof CustomApiConfig) => {
    const input = customApi[param] ?? 'same_as_preset';
    if (input === 'unset') {
      delete generateData[param];
    } else if (input !== 'same_as_preset') {
      generateData[param] = input;
    }
  };
  setParam('max_tokens');
  setParam('temperature');
  setParam('frequency_penalty');
  setParam('presence_penalty');
  setParam('top_p');
  setParam('top_k');
}

function resolveEffectiveToolCallOptions(
  customApi: CustomApiConfig | undefined,
  toolOptions: { tools?: ToolDefinition[]; tool_choice?: ToolChoice } | undefined,
  jsonSchema: JsonSchema | undefined,
): {
  source: string | undefined;
  supportedSource: SupportedToolCallSource | undefined;
  effectiveToolOptions: { tools?: ToolDefinition[]; tool_choice?: ToolChoice } | undefined;
  effectiveJsonSchema: JsonSchema | undefined;
} {
  const source = resolveToolCallSource({
    customSource: customApi?.source,
    hasCustomApiUrl: Boolean(customApi?.apiurl),
    defaultSource: oai_settings.chat_completion_source,
  });
  const supportedSource = isSupportedToolCallSource(source) ? source : undefined;
  const hasToolCallOptions = hasToolCallRequestOptions({ toolOptions, jsonSchema });

  if (!supportedSource && hasToolCallOptions) {
    toastr.warning(getIgnoredToolCallWarningMessage(source), 'Tool Calling', {
      preventDuplicates: true,
    });
  }

  const normalizedToolOptions = supportedSource
    ? normalizeRequestToolOptionsForSource(supportedSource, toolOptions)
    : { toolOptions: undefined, warnings: [] };

  for (const warning of normalizedToolOptions.warnings) {
    toastr.warning(warning, 'Tool Calling', {
      preventDuplicates: true,
    });
  }

  return {
    source,
    supportedSource,
    effectiveToolOptions: supportedSource ? normalizedToolOptions.toolOptions : undefined,
    effectiveJsonSchema: supportedSource ? jsonSchema : undefined,
  };
}

async function* sendCustomApiRequestStreaming(
  messages: any[],
  signal: AbortSignal,
  customApi: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): AsyncGenerator<{ text: string; toolCalls?: any[]; state?: any }, void, void> {
  const source = resolveToolCallSource({
    customSource: customApi.source,
    hasCustomApiUrl: Boolean(customApi.apiurl),
    defaultSource: oai_settings.chat_completion_source,
  }) ?? 'openai';
  const toolCallSource = isSupportedToolCallSource(source) ? source : undefined;
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
  })) as { generate_data: any };
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

      if (toolCallSource) {
        accumulateToolCallDeltasForSupportedSources(toolCalls, parsed, toolCallSource);
      }

      yield { text, toolCalls, state };
    }
  } finally {
    reader.releaseLock();
  }
}

async function sendCustomApiRequestNonStreaming(
  messages: any[],
  signal: AbortSignal,
  customApi: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): Promise<any> {
  const source = resolveToolCallSource({
    customSource: customApi.source,
    hasCustomApiUrl: Boolean(customApi.apiurl),
    defaultSource: oai_settings.chat_completion_source,
  }) ?? 'openai';
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
  })) as { generate_data: any };
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

async function handleResponse(
  response: any,
  generationId: string,
  hasTools: boolean,
  source?: SupportedToolCallSource,
): Promise<string | GenerateToolCallResult> {
  if (!response) {
    throw Error('未得到响应');
  }
  if (response.error) {
    if (response?.response) {
      toastr.error(response.response, t`API 错误`, {
        preventDuplicates: true,
      });
    }
    throw Error(response?.response);
  }

  if (hasTools && source) {
    const toolCalls = extractToolCallsForSupportedSources(response, source);
    if (toolCalls) {
      const content = extractMessageFromData(response);
      const reasoningSignature = extractReasoningSignatureForSupportedSources(response, source);
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

export async function generateResponse(
  generateData: any,
  useStream = false,
  generationId: string | undefined = undefined,
  imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined,
  abortController: AbortController,
  customApi?: CustomApiConfig,
  toolOptions?: { tools?: ToolDefinition[]; tool_choice?: ToolChoice },
  jsonSchema?: JsonSchema,
): Promise<string | GenerateToolCallResult> {
  let result: string | GenerateToolCallResult = '';
  const {
    supportedSource,
    effectiveToolOptions,
    effectiveJsonSchema,
  } = resolveEffectiveToolCallOptions(customApi, toolOptions, jsonSchema);
  const hasTools = !!(effectiveToolOptions?.tools?.length);

  try {
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
          sendCustomApiRequestStreaming(
            generateData.prompt,
            abortController.signal,
            validCustomApi,
            effectiveToolOptions,
            effectiveJsonSchema,
          );
        result = await streamingProcessor.generate();
        if (hasTools && streamingProcessor.toolCalls.length > 0) {
          const normalizedToolCalls = normalizeAccumulatedToolCalls(
            Array.isArray(streamingProcessor.toolCalls[0])
              ? streamingProcessor.toolCalls[0]
              : streamingProcessor.toolCalls,
          ).map(toolCall => ({
            ...toolCall,
            ...(toolCall.thought_signature
              ? {}
              : { thought_signature: streamingProcessor.toolSignatures[toolCall.id] }),
          }));
          result = {
            content: result,
            tool_calls: normalizedToolCalls,
            ...(streamingProcessor.reasoningSignature ? { reasoning_signature: streamingProcessor.reasoningSignature } : {}),
          };
        }
      } else {
        const response = await sendCustomApiRequestNonStreaming(
          generateData.prompt,
          abortController.signal,
          validCustomApi,
          effectiveToolOptions,
          effectiveJsonSchema,
        );
        result = await handleResponse(response, generationId, hasTools, supportedSource);
      }
    } else {
      const needsInjection = hasTools || effectiveJsonSchema;
      const optionsInjector = needsInjection
        ? (data: any) => {
          if (hasTools) {
            data.tools = effectiveToolOptions!.tools;
            data.tool_choice = effectiveToolOptions!.tool_choice ?? 'auto';
          }
          if (effectiveJsonSchema) {
            data.json_schema = effectiveJsonSchema;
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
          // @ts-expect-error ST 返回的是异步生成器
          streamingProcessor.generator = await sendOpenAIRequest(
            'normal',
            generateData.prompt,
            abortController.signal,
          );
          result = await streamingProcessor.generate();
          if (hasTools && streamingProcessor.toolCalls.length > 0) {
            const normalizedToolCalls = normalizeAccumulatedToolCalls(
              Array.isArray(streamingProcessor.toolCalls[0])
                ? streamingProcessor.toolCalls[0]
                : streamingProcessor.toolCalls,
            ).map(toolCall => ({
              ...toolCall,
              ...(toolCall.thought_signature
                ? {}
                : { thought_signature: streamingProcessor.toolSignatures[toolCall.id] }),
            }));
            result = {
              content: result,
              tool_calls: normalizedToolCalls,
              ...(streamingProcessor.reasoningSignature ? { reasoning_signature: streamingProcessor.reasoningSignature } : {}),
            };
          }
        } else {
          oai_settings.stream_openai = false;
          const response = await sendOpenAIRequest('normal', generateData.prompt, abortController.signal);
          result = await handleResponse(response, generationId, hasTools, supportedSource);
        }
      } finally {
        if (optionsInjector) {
          eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, optionsInjector);
        }
        oai_settings.stream_openai = $('#stream_toggle').is(':checked');
      }
    }
  } catch (error) {
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    throw error;
  } finally {
    await clearInjectionPrompts(['INJECTION']);
  }

  return result;
}
