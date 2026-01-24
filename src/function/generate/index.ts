import { prepareAndOverrideData } from '@/function/generate/dataProcessor';
import { handlePresetPath } from '@/function/generate/generate';
import { handleCustomPath } from '@/function/generate/generateRaw';
import { processUserInputWithImages } from '@/function/generate/inputProcessor';
import { generateResponse } from '@/function/generate/responseGenerator';
import { detail, GenerateConfig, GenerateRawConfig, Overrides } from '@/function/generate/types';
import { normalizeBaseURL, setupImageArrayProcessing, unblockGeneration } from '@/function/generate/utils';
import {
  deactivateSendButtons,
  event_types,
  eventSource,
  getRequestHeaders,
  stopGeneration,
} from '@sillytavern/script';
import { uuidv4 } from '@sillytavern/scripts/utils';

declare const $: any;

type GenerationControllerEntry = {
  abortController: AbortController;
  bindToStopButton: boolean;
};

const generationControllers = new Map<string, GenerationControllerEntry>();
const stopButtonBoundGenerationIds = new Set<string>();

export async function getModelList(custom_api: { apiurl: string; key?: string }): Promise<string[]> {
  const url = normalizeBaseURL(custom_api?.apiurl);

  const response = await fetch('/api/backends/chat-completions/status', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      reverse_proxy: url,
      proxy_password: custom_api.key ?? '',
      chat_completion_source: 'openai',
    }),
    cache: 'no-cache',
  });

  const json = await response.json();

  return _(json?.data ?? [])
    .map((model: any) => String(model?.id ?? model?.name ?? '').trim())
    .filter(Boolean)
    .sort()
    .sortedUniq()
    .value();
}

/**
 * 中断指定的生成请求
 * @param id 生成ID
 */
export function stopGenerationById(id: string) {
  const entry = generationControllers.get(id);
  if (!entry) return false;

  entry.abortController.abort(`生成 ID '${id}' 已停止`);
  generationControllers.delete(id);

  if (entry.bindToStopButton) {
    stopButtonBoundGenerationIds.delete(id);
    if (stopButtonBoundGenerationIds.size === 0) {
      unblockGeneration();
    }
  }

  eventSource.emit(event_types.GENERATION_STOPPED, id);
  return true;
}

/**
 * 中断所有TH-generate的生成任务
 */
export function stopAllGeneration() {
  try {
    const hadStopButtonBoundGeneration = stopButtonBoundGenerationIds.size > 0;

    for (const [id, entry] of generationControllers.entries()) {
      entry.abortController.abort(`生成 ID '${id}' 已停止`);
      eventSource.emit(event_types.GENERATION_STOPPED, id);
    }
    generationControllers.clear();

    stopButtonBoundGenerationIds.clear();
    if (hadStopButtonBoundGeneration) {
      unblockGeneration();
    }
    return true;
  } catch (error) {
    console.error(`[TavernHelper][Generate:停止] 中断所有生成任务时出错: ${error}`);
    return false;
  }
}

/**
 * 清理图片处理相关的监听器和Promise
 */
function cleanupImageProcessing(imageProcessingSetup?: ReturnType<typeof setupImageArrayProcessing>): void {
  if (imageProcessingSetup) {
    try {
      imageProcessingSetup.cleanup();
      imageProcessingSetup.rejectImageProcessing(new Error('Generation stopped'));
    } catch (error) {
      console.warn(`[TavernHelper][Generate:停止] 清理图片处理时出错: ${error}`);
    }
  }
}

/**
 * 从Overrides转换为detail.OverrideConfig
 * @param overrides 覆盖配置
 * @returns detail.OverrideConfig
 */
export function fromOverrides(overrides: Overrides): detail.OverrideConfig {
  return {
    world_info_before: overrides.world_info_before,
    persona_description: overrides.persona_description,
    char_description: overrides.char_description,
    char_personality: overrides.char_personality,
    scenario: overrides.scenario,
    world_info_after: overrides.world_info_after,
    dialogue_examples: overrides.dialogue_examples,

    with_depth_entries: overrides.chat_history?.with_depth_entries,
    author_note: overrides.chat_history?.author_note,
    chat_history: overrides.chat_history?.prompts,
  };
}

/**
 * 从GenerateConfig转换为detail.GenerateParams
 * @param config 生成配置
 * @returns detail.GenerateParams
 */
export function fromGenerateConfig(config: GenerateConfig): detail.GenerateParams {
  return {
    generation_id: config.generation_id,
    user_input: config.user_input,
    use_preset: true,
    image: config.image,
    stream: config.should_stream ?? false,
    bindToStopButton: !(config.should_silence ?? false),
    overrides: config.overrides !== undefined ? fromOverrides(config.overrides) : undefined,
    inject: config.injects,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
    custom_api: config.custom_api,
  };
}

/**
 * 从GenerateRawConfig转换为detail.GenerateParams
 * @param config 原始生成配置
 * @returns detail.GenerateParams
 */
export function fromGenerateRawConfig(config: GenerateRawConfig): detail.GenerateParams {
  return {
    generation_id: config.generation_id,
    user_input: config.user_input,
    use_preset: false,
    image: config.image,
    stream: config.should_stream ?? false,
    bindToStopButton: !(config.should_silence ?? false),
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
    overrides: config.overrides ? fromOverrides(config.overrides) : undefined,
    inject: config.injects,
    order: config.ordered_prompts,
    custom_api: config.custom_api,
  };
}

/**
 * 生成AI响应的核心函数
 * @param config 生成配置参数
 * @param config.user_input 用户输入文本
 * @param config.use_preset 是否使用预设
 * @param config.image 图片参数，可以是单个图片(File|string)或图片数组(File|string)[]
 * @param config.overrides 覆盖配置
 * @param config.max_chat_history 最大聊天历史数量
 * @param config.inject 注入的提示词
 * @param config.order 提示词顺序
 * @param config.stream 是否启用流式传输
 * @param config.bindToStopButton 是否绑定到酒馆停止按钮；默认为 true
 * @returns Promise<string> 生成的响应文本
 */
async function iframeGenerate({
  generation_id,
  user_input = '',
  use_preset = true,
  image = undefined,
  overrides = undefined,
  max_chat_history = undefined,
  inject = [],
  order = undefined,
  stream = false,
  bindToStopButton = true,
  custom_api = undefined,
}: detail.GenerateParams = {}): Promise<string> {
  const generationId = generation_id || uuidv4();

  if (generationControllers.has(generationId)) {
    throw new Error(`ID为 '${generationId}' 的请求正在进行中，无法启动用同一 ID 的生成任务`);
  }

  const abortController = new AbortController();
  const shouldBindToStopButton = typeof bindToStopButton === 'boolean' ? bindToStopButton : true;

  generationControllers.set(generationId, {
    abortController,
    bindToStopButton: shouldBindToStopButton,
  });

  if (shouldBindToStopButton) {
    const shouldDeactivateSendButtons = stopButtonBoundGenerationIds.size === 0;
    stopButtonBoundGenerationIds.add(generationId);
    if (shouldDeactivateSendButtons) {
      deactivateSendButtons();
    }
  }

  let imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined;

  try {
    // 1. 处理用户输入和图片（正则，宏，图片数组）
    const inputResult = await processUserInputWithImages(user_input, use_preset, image);
    const { processedUserInput, processedImageArray } = inputResult;
    imageProcessingSetup = inputResult.imageProcessingSetup;

    await eventSource.emit(event_types.GENERATION_AFTER_COMMANDS, 'normal', {}, false);

    // 2. 准备过滤后的基础数据
    const baseData = await prepareAndOverrideData(
      {
        overrides,
        max_chat_history,
        inject,
        order,
      },
      processedUserInput,
    );

    // 3. 根据 use_preset 分流处理
    const generate_data = use_preset
      ? await handlePresetPath(baseData, processedUserInput, {
          image,
          overrides,
          max_chat_history,
          inject,
          order,
        })
      : await handleCustomPath(
          baseData,
          {
            image,
            overrides,
            max_chat_history,
            inject,
            order,
            processedImageArray,
          },
          processedUserInput,
        );

    await eventSource.emit(event_types.GENERATE_AFTER_DATA, generate_data, false);
    // 4. 根据 stream 参数决定生成方式
    const result = await generateResponse(
      generate_data,
      stream,
      generationId,
      imageProcessingSetup,
      abortController,
      custom_api,
    );

    return result;
  } catch (error) {
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    throw error;
  } finally {
    // 清理
    cleanupImageProcessing(imageProcessingSetup);
    generationControllers.delete(generationId);

    if (shouldBindToStopButton) {
      stopButtonBoundGenerationIds.delete(generationId);
      if (stopButtonBoundGenerationIds.size === 0) {
        unblockGeneration();
      }
    }
  }
}

export async function generate(config: GenerateConfig) {
  const converted_config = fromGenerateConfig(config);
  return await iframeGenerate(converted_config);
}

export async function generateRaw(config: GenerateRawConfig) {
  const converted_config = fromGenerateRawConfig(config);
  return await iframeGenerate(converted_config);
}

/**
 * 点击停止按钮时的逻辑
 */
$(document)
  .off('click.tavernhelper_generate', '#mes_stop')
  .on('click.tavernhelper_generate', '#mes_stop', function () {
    stopGeneration();

    if (stopButtonBoundGenerationIds.size === 0) {
      return;
    }

    const idsToAbort = Array.from(stopButtonBoundGenerationIds.values());
    for (const id of idsToAbort) {
      const entry = generationControllers.get(id);
      if (!entry) {
        stopButtonBoundGenerationIds.delete(id);
        continue;
      }

      entry.abortController.abort('点击停止按钮');
      generationControllers.delete(id);
      stopButtonBoundGenerationIds.delete(id);
      eventSource.emit(event_types.GENERATION_STOPPED, id);
    }

    if (stopButtonBoundGenerationIds.size === 0) {
      unblockGeneration();
    }
  });
