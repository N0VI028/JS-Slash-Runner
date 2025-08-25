import {
  cleanUpMessage,
  countOccurrences,
  deactivateSendButtons,
  eventSource,
  event_types,
  isOdd,
  saveChatConditional,
  saveSettingsDebounced,
} from '@sillytavern/script';
import { t } from '@sillytavern/scripts/i18n';
import { oai_settings, sendOpenAIRequest } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { Stopwatch } from '@sillytavern/scripts/utils';

import log from 'loglevel';
// @ts-ignore
declare const toastr: any;

import { CustomApiConfig } from '@/function/generate/types';
import {
  clearInjectionPrompts,
  extractMessageFromData,
  setupImageArrayProcessing,
  unblockGeneration,
} from '@/function/generate/utils';

const type = 'quiet';

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

  constructor() {
    this.result = '';
    this.messageBuffer = '';
    this.isStopped = false;
    this.isFinished = false;
    this.generator = this.nullStreamingGeneration;
    this.abortController = new AbortController();
  }

  onProgressStreaming(text: string, isFinal: boolean) {
    // 计算增量文本
    const newText = text.slice(this.messageBuffer.length);
    this.messageBuffer = text;
    // 兼容旧版本
    // @ts-ignore
    let processedText = cleanUpMessage(newText, false, false, !isFinal, this.stoppingStrings);

    const charsToBalance = ['*', '"', '```'];
    for (const char of charsToBalance) {
      if (!isFinal && isOdd(countOccurrences(processedText, char))) {
        const separator = char.length > 1 ? '\n' : '';
        processedText = processedText.trimEnd() + separator + char;
      }
    }

    eventSource.emit('js_stream_token_received_fully', text);
    eventSource.emit('js_stream_token_received_incrementally', processedText);

    if (isFinal) {
      // 兼容旧版本
      // @ts-ignore
      const fullText = cleanUpMessage(text, false, false, false, this.stoppingStrings);
      eventSource.emit('js_generation_ended', fullText);
    }
  }

  onErrorStreaming() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStopped = true;
    unblockGeneration();
    saveChatConditional();
  }

  // eslint-disable-next-line require-yield
  async *nullStreamingGeneration(): AsyncGenerator<{ text: string }, void, void> {
    throw Error('Generation function for streaming is not hooked up');
  }

  async generate() {
    try {
      const sw = new Stopwatch(1000 / power_user.streaming_fps);
      const timestamps = [];

      for await (const { text } of this.generator()) {
        timestamps.push(Date.now());
        if (this.isStopped) {
          this.messageBuffer = '';
          return;
        }

        this.result = text;
        await sw.tick(() => this.onProgressStreaming(text, false));
      }

      if (!this.isStopped) {
        this.onProgressStreaming(this.result, true);
      } else {
        this.messageBuffer = '';
      }

      const seconds = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
      log.warn(
        `Stream stats: ${timestamps.length} tokens, ${seconds.toFixed(2)} seconds, rate: ${Number(
          timestamps.length / seconds,
        ).toFixed(2)} TPS`,
      );
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
async function handleResponse(response: any) {
  if (!response) {
    throw Error(`未得到响应`);
  }
  if (response.error) {
    if (response?.response) {
      toastr.error(response.response, t`API Error`, {
        preventDuplicates: true,
      });
    }
    throw Error(response?.response);
  }
  const message: string = extractMessageFromData(response);
  eventSource.emit('js_generation_ended', message);
  return message;
}

/**
 * 生成响应
 * @param generate_data 生成数据
 * @param useStream 是否使用流式传输
 * @param imageProcessingSetup 图片数组处理设置，包含Promise和解析器
 * @param abortController 中止控制器
 * @param customApi 自定义API配置
 * @returns 生成的响应文本
 */
export async function generateResponse(
  generate_data: any,
  useStream = false,
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
        data.chat_completion_source = customApi.source || 'openai';
        data.reverse_proxy = customApi.apiurl;
        data.proxy_password = customApi.key;

        if (customApi.model) {
          data.model = customApi.model;
        } else {
          toastr.error('[Generate] 自定义API未指定模型');
          log.error('[Generate] 自定义API未指定模型');
          throw new Error('[Generate] 自定义API未指定模型');
        }

        log.info('[Generate] API配置修改完成', {
          newSource: data.chat_completion_source,
          newProxy: data.reverse_proxy,
          newModel: data.model,
          hasKey: data.proxy_password,
        });

        return data;
      };

      eventSource.once(event_types.CHAT_COMPLETION_SETTINGS_READY, customApiEventHandler);
    }

    // 如果有图片处理，等待图片处理完成
    if (imageProcessingSetup) {
      try {
        await imageProcessingSetup.imageProcessingPromise;
        log.debug('[Generate:图片数组处理] 图片处理已完成，继续生成流程');
      } catch (imageError: any) {
        log.error('[Generate:图片数组处理] 图片处理失败:', imageError);
        // 图片处理失败不应该阻止整个生成流程，但需要记录错误
        throw new Error(`图片处理失败: ${imageError?.message || '未知错误'}`);
      }
    }

    eventSource.emit('js_generation_started');
    if (useStream) {
      const originalStreamSetting = oai_settings.stream_openai;
      if (!originalStreamSetting) {
        oai_settings.stream_openai = true;
        saveSettingsDebounced();
      }
      const streamingProcessor = new StreamingProcessor();
      // @ts-ignore
      streamingProcessor.generator = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
      result = (await streamingProcessor.generate()) as string;
      if (originalStreamSetting !== oai_settings.stream_openai) {
        oai_settings.stream_openai = originalStreamSetting;
        saveSettingsDebounced();
      }
    } else {
      const response = await sendOpenAIRequest(type, generate_data.prompt, abortController.signal);
      result = await handleResponse(response);
    }
  } catch (error) {
    // 如果有图片处理设置但生成失败，确保拒绝Promise
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    log.error(error);
    throw error;
  } finally {
    // 清理自定义API事件监听器
    if (customApiEventHandler) {
      eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, customApiEventHandler);
      log.debug('[Generate:自定义API] 已清理事件监听器');
    }

    unblockGeneration();
    await clearInjectionPrompts(['INJECTION']);
  }
  return result;
}
