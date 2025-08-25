import { prepareAndOverrideData } from '@/function/generate/dataProcessor';
import { handlePresetPath } from '@/function/generate/generate';
import { handleCustomPath } from '@/function/generate/generateRaw';
import { processUserInputWithImages } from '@/function/generate/inputProcessor';
import { generateResponse } from '@/function/generate/responseGenerator';
import { detail, GenerateConfig, GenerateRawConfig, InjectionPrompt, Overrides } from '@/function/generate/types';
import { setupImageArrayProcessing, unblockGeneration } from '@/function/generate/utils';

import { event_types, eventSource, stopGeneration } from '@sillytavern/script';

import log from 'loglevel';

declare const $: any;

let abortController = new AbortController();

let currentImageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined;

/**
 * 清理图片处理相关的监听器和Promise
 */
function cleanupImageProcessing(): void {
  if (currentImageProcessingSetup) {
    try {
      currentImageProcessingSetup.cleanup();

      currentImageProcessingSetup.rejectImageProcessing(new Error('Generation stopped by user'));

      log.info('[Generate:停止] 已清理图片处理相关逻辑');
    } catch (error) {
      log.warn('[Generate:停止] 清理图片处理时出错:', error);
    }
    currentImageProcessingSetup = undefined;
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
 * 从InjectionPrompt转换为InjectionPrompt
 * @param inject 注入提示词
 * @returns InjectionPrompt
 */
export function fromInjectionPrompt(inject: InjectionPrompt): InjectionPrompt {
  const position_map = {
    before_prompt: 'before_prompt',
    in_chat: 'in_chat',
    after_prompt: 'after_prompt',
    none: 'none',
  } as const;
  return {
    role: inject.role,
    content: inject.content,
    position: position_map[inject.position] as 'before_prompt' | 'in_chat' | 'after_prompt' | 'none',
    depth: inject.depth,
    should_scan: inject.should_scan,
  };
}

/**
 * 从GenerateConfig转换为detail.GenerateParams
 * @param config 生成配置
 * @returns detail.GenerateParams
 */
export function fromGenerateConfig(config: GenerateConfig): detail.GenerateParams {
  return {
    user_input: config.user_input,
    use_preset: true,
    image: config.image,
    stream: config.should_stream ?? false,
    overrides: config.overrides !== undefined ? fromOverrides(config.overrides) : undefined,
    inject: config.injects !== undefined ? config.injects.map(fromInjectionPrompt) : undefined,
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
    user_input: config.user_input,
    use_preset: false,
    image: config.image,
    stream: config.should_stream ?? false,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
    overrides: config.overrides ? fromOverrides(config.overrides) : undefined,
    inject: config.injects ? config.injects.map(fromInjectionPrompt) : undefined,
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
 * @returns Promise<string> 生成的响应文本
 */
async function iframeGenerate({
  user_input = '',
  use_preset = true,
  image = undefined,
  overrides = undefined,
  max_chat_history = undefined,
  inject = [],
  order = undefined,
  stream = false,
  custom_api = undefined,
}: detail.GenerateParams = {}): Promise<string> {
  abortController = new AbortController();

  // 1. 处理用户输入和图片（正则，宏，图片数组）
  const inputResult = await processUserInputWithImages(user_input, use_preset, image);
  const { processedUserInput, imageProcessingSetup, processedImageArray } = inputResult;

  currentImageProcessingSetup = imageProcessingSetup;

  await eventSource.emit(
    event_types.GENERATION_AFTER_COMMANDS,
    'quiet',
    {},
    false,
  );

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

  await eventSource.emit(event_types.GENERATE_AFTER_DATA, generate_data);

  try {
    // 4. 根据 stream 参数决定生成方式
    log.info('[Generate:发送提示词]', generate_data);
    const result = await generateResponse(generate_data, stream, imageProcessingSetup, abortController, custom_api);

    currentImageProcessingSetup = undefined;

    return result;
  } catch (error) {
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }

    currentImageProcessingSetup = undefined;

    throw error;
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
$(document).on('click', '#mes_stop', function () {
  const wasStopped = stopGeneration();
  if (wasStopped) {
    if (abortController) {
      abortController.abort('Clicked stop button');
    }

    cleanupImageProcessing();

    unblockGeneration();
  }
});
