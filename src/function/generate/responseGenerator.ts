import { CustomApiConfig } from '@/function/generate/types';
import {
  clearInjectionPrompts,
  extractMessageFromData,
  setupImageArrayProcessing,
  unblockGeneration,
} from '@/function/generate/utils';
import { saveChatConditionalDebounced } from '@/util/tavern';
import {
  cleanUpMessage,
  countOccurrences,
  deactivateSendButtons,
  eventSource,
  event_types,
  isOdd,
} from '@sillytavern/script';
import { oai_settings, sendOpenAIRequest } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { Stopwatch, uuidv4 } from '@sillytavern/scripts/utils';

/**
 * 流式处理器类
 * 处理流式生成的响应数据
 */
class StreamingProcessor {
  public generator: () => AsyncGenerator<{ text: string }, void, void>;
  public stoppingStrings?: any;
  public result: string;
  public isStopped: boolean;
  public isFinished: boolean;
  public abortController: AbortController;
  private messageBuffer: string;
  private generationId: string;

  constructor(generationId: string, abortController: AbortController) {
    this.result = '';
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
    unblockGeneration();
    saveChatConditionalDebounced();
  }

  // eslint-disable-next-line require-yield
  async *nullStreamingGeneration(): AsyncGenerator<{ text: string }, void, void> {
    throw Error('Generation function for streaming is not hooked up');
  }

  async generate() {
    try {
      const sw = new Stopwatch(1000 / power_user.streaming_fps);

      for await (const { text } of this.generator()) {
        if (this.isStopped) {
          this.messageBuffer = '';
          return;
        }

        this.result = text;
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
 * 处理非流式响应
 * @param response API响应对象
 * @returns 提取的消息文本
 */
async function handleResponse(response: any, generationId: string) {
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
  const result = { message: extractMessageFromData(response) };
  eventSource.emit('js_generation_before_end', result, generationId);
  eventSource.emit('js_generation_ended', result.message, generationId);
  return result.message;
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
): Promise<string> {
  let result = '';
  let customApiEventHandler: ((data: any) => void) | null = null;

  try {
    deactivateSendButtons();

    // 如果有自定义API配置，设置单次事件拦截
    if (customApi?.apiurl) {
      customApiEventHandler = (data: any) => {
        data.reverse_proxy = customApi.apiurl;
        data.chat_completion_source = customApi.source || 'openai';
        data.proxy_password = customApi.key || '';
        data.model = customApi.model;

        const set_param = (param: keyof CustomApiConfig) => {
          const input = customApi[param] ?? 'same_as_preset';
          if (input === 'unset') {
            _.unset(data, param);
          } else if (input !== 'same_as_preset') {
            _.set(data, param, input);
          }
        };
        set_param('max_tokens');
        set_param('temperature');
        set_param('frequency_penalty');
        set_param('presence_penalty');
        set_param('top_p');
        set_param('top_k');

        return data;
      };

      eventSource.once(event_types.CHAT_COMPLETION_SETTINGS_READY, customApiEventHandler);
    }

    // 如果有图片处理，等待图片处理完成
    if (imageProcessingSetup) {
      try {
        await imageProcessingSetup.imageProcessingPromise;
      } catch (imageError: any) {
        // 图片处理失败不应该阻止整个生成流程，但需要记录错误
        throw new Error(`图片处理失败: ${imageError?.message || '未知错误'}`);
      }
    }
    if (generationId === undefined || generationId === '') {
      generationId = uuidv4();
    }
    eventSource.emit('js_generation_started', generationId);

    const original_stream = oai_settings.stream_openai;
    try {
      if (useStream) {
        oai_settings.stream_openai = true;
        const streamingProcessor = new StreamingProcessor(generationId, abortController);
        // @ts-expect-error 类型正确
        streamingProcessor.generator = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
        result = (await streamingProcessor.generate()) as string;
      } else {
        oai_settings.stream_openai = false;
        const response = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
        result = await handleResponse(response, generationId);
      }
    } finally {
      oai_settings.stream_openai = original_stream;
    }
  } catch (error) {
    // 如果有图片处理设置但生成失败，确保拒绝Promise
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    throw error;
  } finally {
    // 清理自定义API事件监听器
    if (customApiEventHandler) {
      eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, customApiEventHandler);
    }

    //unblockGeneration();
    await clearInjectionPrompts(['INJECTION']);
  }
  return result;
}
