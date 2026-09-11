import { prepareAndOverrideData } from '@/function/generate/dataProcessor';
import { handlePresetPath } from '@/function/generate/generate';
import { handleCustomPath } from '@/function/generate/generateRaw';
import { processUserInputWithImages } from '@/function/generate/inputProcessor';
import { generateResponse } from '@/function/generate/responseGenerator';
import {
  detail,
  GenerateConfig,
  GenerateRawConfig,
  GenerateToolCallResult,
  Overrides,
  PlaceholderPrompt,
  RolePrompt,
} from '@/function/generate/types';
import { normalizeBaseURL, setupImageArrayProcessing, unblockGeneration } from '@/function/generate/utils';
import { InjectionPrompt } from '@/function/inject';
import { getPreset, isPresetPlaceholderPrompt, PresetPrompt } from '@/function/preset';
import { substitudeMacros } from '@/function/util';
import {
  deactivateSendButtons,
  event_types,
  eventSource,
  getRequestHeaders,
  stopGeneration,
} from '@sillytavern/script';
import { proxies } from '@sillytavern/scripts/openai';
import { uuidv4 } from '@sillytavern/scripts/utils';

declare const $: any;

type GenerationControllerEntry = {
  abortController: AbortController;
  bindToStopButton: boolean;
};

const generationControllers = new Map<string, GenerationControllerEntry>();
const stopButtonBoundGenerationIds = new Set<string>();
const reservedGenerationIds = new Set<string>();
type Result = string | GenerateToolCallResult;
type Admission = {
  id: string;
  group: string;
  bindToStopButton: boolean;
  cancelled: boolean;
  run: () => Promise<Result>;
  resolve: (value: Result) => void;
  reject: (error: unknown) => void;
};
const waiting: Admission[] = [];
const pendingAdmissions = new Map<string, Admission>();
let activeGroup: string | undefined;
let activeCount = 0;

function normalizedGroup(value: GenerateConfig['concurrency_group']): string {
  if (value === 'bypass') {
    return 'bypass';
  }
  if (value === 'unique') {
    return uuidv4();
  }
  return value && value !== 'default' ? value : 'default';
}

function releaseGroup() {
  activeCount--;
  if (activeCount === 0) {
    activeGroup = undefined;
    pump();
  }
}

function start(item: Admission) {
  pendingAdmissions.delete(item.id);
  if (item.cancelled) {
    releaseGroup();
    return;
  }
  void item.run().then(item.resolve, item.reject).finally(releaseGroup);
}

function pump() {
  if (activeGroup !== undefined) {
    return;
  }
  const next = waiting[0];
  if (!next) {
    return;
  }
  activeGroup = next.group;
  const batch = waiting.filter(item => item.group === activeGroup);
  for (const item of batch) {
    waiting.splice(waiting.indexOf(item), 1);
  }
  activeCount += batch.length;
  for (const item of batch) {
    start(item);
  }
}

function admit(id: string, group: string, bindToStopButton: boolean, run: () => Promise<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    const item = { id, group, bindToStopButton, cancelled: false, run, resolve, reject };
    if (group === 'bypass') {
      void run().then(resolve, reject);
    } else if (activeGroup === group) {
      activeCount++;
      start(item);
    } else {
      waiting.push(item);
      pendingAdmissions.set(id, item);
      pump();
    }
  });
}

function cancelPending(id: string, reason: unknown): boolean {
  const item = pendingAdmissions.get(id);
  if (!item || item.cancelled) {
    return false;
  }
  item.cancelled = true;
  pendingAdmissions.delete(id);
  const index = waiting.indexOf(item);
  if (index >= 0) {
    waiting.splice(index, 1);
  }
  item.reject(reason);
  eventSource.emit(event_types.GENERATION_STOPPED, id);
  return true;
}

export function getProxyPresetNames(): string[] {
  return proxies.map(proxy => proxy.name);
}

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
  if (!entry) {
    return cancelPending(id, `生成 ID '${id}' 已停止`);
  }

  if (entry.abortController.signal.aborted) {
    return true;
  }
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
    const active = Array.from(generationControllers.entries());
    const pending = Array.from(pendingAdmissions.keys());
    for (const [id] of active) {
      stopGenerationById(id);
    }
    for (const id of pending) {
      cancelPending(id, `生成 ID '${id}' 已停止`);
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
    tools: config.tools,
    tool_choice: config.tool_choice,
    json_schema: config.json_schema,
  };
}

function toOrderedPrompt(prompt: PresetPrompt): PlaceholderPrompt | RolePrompt {
  if (isPresetPlaceholderPrompt(prompt)) {
    return _.snakeCase(prompt.id) as PlaceholderPrompt;
  }
  return {
    role: prompt.role,
    content: substitudeMacros(prompt.content!),
  };
}

function toInChatPrompt(prompt: PresetPrompt): Omit<InjectionPrompt, 'id'> {
  // Assert (prompt.position.type === 'in_chat' && prompt.content is string)
  prompt.content = substitudeMacros(prompt.content!);
  return {
    position: 'in_chat',
    depth: prompt.position!.depth!,
    role: prompt.role,
    content: substitudeMacros(prompt.content),
  };
}

export function convertGenerateWithCustomPreset(config: GenerateConfig): GenerateRawConfig {
  const preset = getPreset(config.preset_name ?? 'in_use');
  const prompts = preset.prompts.filter(prompt => prompt.enabled);
  const [in_chat, ordered] = _.partition(prompts, prompt => prompt.position?.type === 'in_chat');

  const ordered_prompts = ordered
    .map(toOrderedPrompt)
    .filter(prompt => typeof prompt === 'string' || prompt.content.trim() !== '');

  const injects = _.concat(
    config.injects ?? [],
    _(in_chat)
      .sortBy(['position.depth', 'position.order'])
      .map(toInChatPrompt)
      .filter(prompt => prompt.content.trim() !== '')
      .value(),
  );

  const custom_api = { ...config.custom_api };
  const setValidly = (
    param: string,
    value: number | undefined,
    min: number | null = null,
    max: number | null = null,
  ) => {
    if (typeof value !== 'number') {
      return;
    }
    if (min !== null) {
      value = Math.max(min, value);
    }
    if (max !== null) {
      value = Math.min(max, value);
    }
    _.set(custom_api, param, value);
  };
  setValidly('max_tokens', preset.settings.max_completion_tokens);
  setValidly('temperature', preset.settings.temperature, 0, 2);
  setValidly('frequency_penalty', preset.settings.frequency_penalty, -2, 2);
  setValidly('presence_penalty', preset.settings.presence_penalty, -2, 2);
  setValidly('top_p', preset.settings.top_p, 0, 1);
  setValidly('top_k', preset.settings.top_k, 0, 100);

  return {
    ...config,
    ordered_prompts,
    injects,
    custom_api,
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
    tools: config.tools,
    tool_choice: config.tool_choice,
    json_schema: config.json_schema,
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
async function iframeGenerate(
  {
    generation_id,
    user_input = '',
    use_preset = true,
    image = undefined,
    overrides = undefined,
    max_chat_history = undefined,
    inject = [],
    order = undefined,
    stream = false,
    custom_api = undefined,
    tools = undefined,
    tool_choice = undefined,
    json_schema = undefined,
  }: detail.GenerateParams = {},
  abortController: AbortController,
): Promise<Result> {
  const generationId = generation_id!;

  let imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined;

  try {
    // 1. 处理用户输入和图片（正则，宏，图片数组）
    const inputResult = await processUserInputWithImages(user_input, use_preset, image);
    const { processedUserInput, processedImageArray } = inputResult;
    imageProcessingSetup = inputResult.imageProcessingSetup;
    abortController.signal.throwIfAborted();

    await eventSource.emit(event_types.GENERATION_AFTER_COMMANDS, 'normal', {}, false);
    abortController.signal.throwIfAborted();

    // 2. 准备过滤后的基础数据
    const baseData = await prepareAndOverrideData(
      {
        use_preset,
        overrides,
        max_chat_history,
        inject,
        order,
      },
      processedUserInput,
    );
    abortController.signal.throwIfAborted();

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
    abortController.signal.throwIfAborted();

    await eventSource.emit(event_types.GENERATE_AFTER_DATA, generate_data, false);
    abortController.signal.throwIfAborted();
    // 4. 根据 stream 参数决定生成方式
    const toolOptions = tools?.length ? { tools, tool_choice } : undefined;
    const result = await generateResponse(
      generate_data,
      stream,
      generationId,
      imageProcessingSetup,
      abortController,
      custom_api,
      toolOptions,
      json_schema,
    );
    abortController.signal.throwIfAborted();

    return result;
  } catch (error) {
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    throw error;
  } finally {
    // 清理
    cleanupImageProcessing(imageProcessingSetup);
  }
}

async function runGeneration(
  config: GenerateConfig | GenerateRawConfig,
  type: 'generate' | 'generateRaw',
): Promise<Result> {
  config.generation_id = config.generation_id || uuidv4();
  const id = config.generation_id;
  if (reservedGenerationIds.has(id)) {
    throw new Error(`ID为 '${id}' 的请求正在进行中`);
  }
  reservedGenerationIds.add(id);
  try {
    return await admit(id, normalizedGroup(config.concurrency_group), !(config.should_silence ?? false), async () => {
      const controller = new AbortController();
      const bind = !(config.should_silence ?? false);
      try {
        generationControllers.set(id, { abortController: controller, bindToStopButton: bind });
        if (bind) {
          if (!stopButtonBoundGenerationIds.size) {
            deactivateSendButtons();
          }
          stopButtonBoundGenerationIds.add(id);
        }
        await eventSource.emit('js_generation_requested', id, type, config);
        controller.signal.throwIfAborted();
        const params =
          type === 'generate'
            ? (config as GenerateConfig).preset_name && (config as GenerateConfig).preset_name !== 'in_use'
              ? fromGenerateRawConfig(convertGenerateWithCustomPreset(config as GenerateConfig))
              : fromGenerateConfig(config as GenerateConfig)
            : fromGenerateRawConfig(config as GenerateRawConfig);
        return await iframeGenerate(params, controller);
      } finally {
        if (generationControllers.get(id)?.abortController === controller) {
          generationControllers.delete(id);
        }
        if (stopButtonBoundGenerationIds.delete(id) && !stopButtonBoundGenerationIds.size) {
          unblockGeneration();
        }
      }
    });
  } finally {
    reservedGenerationIds.delete(id);
  }
}

export function generate(config: GenerateConfig): Promise<Result> {
  return runGeneration(config, 'generate');
}

export function generateRaw(config: GenerateRawConfig): Promise<Result> {
  return runGeneration(config, 'generateRaw');
}

/**
 * 点击停止按钮时的逻辑
 */
$(document)
  .off('click.tavernhelper_generate', '#mes_stop')
  .on('click.tavernhelper_generate', '#mes_stop', function () {
    stopGeneration();

    const idsToAbort = Array.from(stopButtonBoundGenerationIds.values());
    const pendingIds = Array.from(pendingAdmissions.values())
      .filter(item => item.bindToStopButton)
      .map(item => item.id);
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

    for (const id of pendingIds) {
      cancelPending(id, '点击停止按钮');
    }

    if (stopButtonBoundGenerationIds.size === 0) {
      unblockGeneration();
    }
  });
