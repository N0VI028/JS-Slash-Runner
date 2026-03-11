import { getTavernVersion } from '@/function/version';
import { compare } from 'compare-versions';

/**
 * getChatCompletionModel 兼容调用
 * 1.14.0: getChatCompletionModel(source: string)
 * 1.15.0+: getChatCompletionModel(settings: object)
 */
export function getChatCompletionModelCompat(getChatCompletionModel: any, settings: any): string {
  try {
    const version = getTavernVersion();
    if (compare(version, '1.15.0', '>=')) {
      return getChatCompletionModel(settings);
    }
  } catch {
    // fall through
  }
  return getChatCompletionModel(settings.chat_completion_source);
}

/**
 * 动态导入 createGenerationParameters 函数
 * 版本 >= 1.15.0 时从 SillyTavern 导入，否则使用 fallback 实现
 */
export async function createGenerationParameters(
  settings: any,
  model: string,
  type: string,
  messages: any[],
  options: { jsonSchema?: any } = {},
): Promise<{ generate_data: any; stream?: boolean; canMultiSwipe?: boolean }> {
  const version = getTavernVersion();

  try {
    // 检查版本是否 >= 1.15.0
    if (compare(version, '1.15.0', '>=')) {
      // @ts-expect-error 低版本没有，TS会报错
      const { createGenerationParameters: nativeFunc } = await import('@sillytavern/scripts/openai');
      return (await nativeFunc(settings, model, type, messages, options)) as {
        generate_data: any;
        stream?: boolean;
        canMultiSwipe?: boolean;
      };
    }
  } catch (error) {
    console.warn('Failed to import native createGenerationParameters, using fallback:', error);
  }

  // Fallback 实现（用于 < 1.15.0 版本）
  return createGenerationParametersFallback(settings, model, type, messages, options);
}

/**
 * Fallback 实现（基于 SillyTavern 1.14.0 的 sendOpenAIRequest, 只复制了主流渠道）
 * 用于向后兼容 < 1.15.0 版本
 */
async function createGenerationParametersFallback(
  settings: any,
  model: string,
  type: string,
  messages: any[],
  { jsonSchema = null }: { jsonSchema?: any } = {},
): Promise<{ generate_data: any; stream?: boolean; canMultiSwipe?: boolean }> {
  const { chat_completion_sources, getChatCompletionModel } = (await import('@sillytavern/scripts/openai')) as any;
  const { getCustomStoppingStrings } = (await import('@sillytavern/scripts/power-user')) as any;
  const { name1, name2, substituteParams } = (await import('@sillytavern/script')) as any;
  const { getGroupNames } = (await import('@sillytavern/scripts/group-chats')) as any;
  const openai_max_stop_strings =
    (await import('@sillytavern/scripts/openai').then((m: any) => m.openai_max_stop_strings)) ?? 4;

  // HACK: Filter out null and non-object messages
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array');
  }
  messages = messages.filter((msg: any) => msg && typeof msg === 'object');

  const isClaude = settings.chat_completion_source === chat_completion_sources.CLAUDE;
  const isOpenRouter = settings.chat_completion_source === chat_completion_sources.OPENROUTER;
  const isGoogle = settings.chat_completion_source === chat_completion_sources.MAKERSUITE;
  const isVertexAI = settings.chat_completion_source === chat_completion_sources.VERTEXAI;
  const isOAI = settings.chat_completion_source === chat_completion_sources.OPENAI;
  const isCustom = settings.chat_completion_source === chat_completion_sources.CUSTOM;
  const isDeepSeek = settings.chat_completion_source === chat_completion_sources.DEEPSEEK;
  const isXAI = settings.chat_completion_source === chat_completion_sources.XAI;
  const isAzureOpenAI = settings.chat_completion_source === chat_completion_sources.AZURE_OPENAI;
  const isQuiet = type === 'quiet';
  const isImpersonate = type === 'impersonate';
  const isContinue = type === 'continue';

  // getChatCompletionModel 在不同版本中签名不同
  // 新版本 (>= 1.15.0): getChatCompletionModel(settings)  接收 settings 对象
  // 旧版本 (< 1.15.0): getChatCompletionModel(source)    接收 source 字符串
  let currentModel = model;
  try {
    currentModel = getChatCompletionModelCompat(getChatCompletionModel, settings);
  } catch {
    currentModel = model;
  }

  const stream =
    settings.stream_openai && !isQuiet && !((isOAI || isAzureOpenAI) && ['o1-2024-12-17', 'o1'].includes(currentModel));

  const canMultiSwipe =
    settings.n > 1 &&
    !isContinue &&
    !isImpersonate &&
    !isQuiet &&
    (isOAI ||
      isAzureOpenAI ||
      isCustom ||
      isXAI ||
      settings.chat_completion_source === chat_completion_sources.AIMLAPI ||
      settings.chat_completion_source === chat_completion_sources.MOONSHOT);

  const generate_data: any = {
    type: type,
    messages: messages,
    model: model,
    temperature: Number(settings.temp_openai),
    frequency_penalty: Number(settings.freq_pen_openai),
    presence_penalty: Number(settings.pres_pen_openai),
    top_p: Number(settings.top_p_openai),
    max_tokens: settings.openai_max_tokens,
    stream: stream,
    stop: getCustomStoppingStrings(openai_max_stop_strings),
    chat_completion_source: settings.chat_completion_source,
    n: canMultiSwipe ? settings.n : undefined,
    user_name: name1,
    char_name: name2,
    group_names: getGroupNames(),
    custom_prompt_post_processing: settings.custom_prompt_post_processing,
  };

  // Azure OpenAI specific
  if (isAzureOpenAI) {
    generate_data.azure_base_url = settings.azure_base_url;
    generate_data.azure_deployment_name = settings.azure_deployment_name;
    generate_data.azure_api_version = settings.azure_api_version;
  }

  // Claude specific
  if (isClaude) {
    generate_data['top_k'] = Number(settings.top_k_openai);
    generate_data['claude_use_sysprompt'] = settings.claude_use_sysprompt;
    generate_data['stop'] = getCustomStoppingStrings();
    if (!isQuiet && !(isContinue && settings.continue_prefill)) {
      generate_data['assistant_prefill'] = isImpersonate
        ? substituteParams(settings.assistant_impersonation)
        : substituteParams(settings.assistant_prefill);
    }
  }

  // OpenRouter specific
  if (isOpenRouter) {
    generate_data['top_k'] = Number(settings.top_k_openai);
    generate_data['min_p'] = Number(settings.min_p_openai);
    generate_data['repetition_penalty'] = Number(settings.repetition_penalty_openai);
    generate_data['top_a'] = Number(settings.top_a_openai);
    generate_data['use_fallback'] = settings.openrouter_use_fallback;
    generate_data['provider'] = settings.openrouter_providers;
    generate_data['allow_fallbacks'] = settings.openrouter_allow_fallbacks;
    generate_data['middleout'] = settings.openrouter_middleout;
  }

  // Google MakerSuite / Vertex AI specific
  if (isGoogle || isVertexAI) {
    const stopStringsLimit = 5;
    generate_data['top_k'] = Number(settings.top_k_openai);
    generate_data['stop'] = getCustomStoppingStrings(stopStringsLimit)
      .slice(0, stopStringsLimit)
      .filter((x: string) => x.length >= 1 && x.length <= 16);
    generate_data['use_makersuite_sysprompt'] = settings.use_makersuite_sysprompt;
    if (isVertexAI) {
      generate_data['vertexai_auth_mode'] = settings.vertexai_auth_mode;
      generate_data['vertexai_region'] = settings.vertexai_region;
      generate_data['vertexai_express_project_id'] = settings.vertexai_express_project_id;
    }
  }

  // Custom API specific
  if (isCustom) {
    generate_data['custom_url'] = settings.custom_url;
    generate_data['custom_include_body'] = settings.custom_include_body;
    generate_data['custom_exclude_body'] = settings.custom_exclude_body;
    generate_data['custom_include_headers'] = settings.custom_include_headers;
  }

  // DeepSeek specific
  if (isDeepSeek) {
    generate_data.top_p = generate_data.top_p || Number.EPSILON;
  }

  // XAI specific
  if (isXAI) {
    if (model.includes('grok-3-mini')) {
      delete generate_data.presence_penalty;
      delete generate_data.frequency_penalty;
      delete generate_data.stop;
    }

    if (model.includes('grok-4') || model.includes('grok-code')) {
      delete generate_data.presence_penalty;
      delete generate_data.frequency_penalty;
      if (!model.includes('grok-4-fast-non-reasoning')) {
        delete generate_data.stop;
      }
    }
  }

  // Empty array will produce a validation error
  if (!Array.isArray(generate_data.stop) || !generate_data.stop.length) {
    delete generate_data.stop;
  }

  if (jsonSchema) {
    generate_data.json_schema = jsonSchema;
  }

  return { generate_data, stream, canMultiSwipe };
}
