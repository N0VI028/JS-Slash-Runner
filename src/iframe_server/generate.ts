import { IframeMessage, getIframeName, getLogPrefix, registerIframeHandler } from '@/iframe_server/index';

import {
  MAX_INJECTION_DEPTH,
  activateSendButtons,
  baseChatReplace,
  characters,
  chat,
  chat_metadata,
  cleanUpMessage,
  countOccurrences,
  deactivateSendButtons,
  eventSource,
  extension_prompt_roles,
  extension_prompt_types,
  getBiasStrings,
  getCharacterCardFields,
  getExtensionPromptRoleByName,
  getMaxContextSize,
  isOdd,
  name1,
  name2,
  saveChatConditional,
  saveSettingsDebounced,
  setExtensionPrompt,
  setGenerationProgress,
  showSwipeButtons,
  stopGeneration,
  substituteParams,
  this_chid,
} from '@sillytavern/script';
import { NOTE_MODULE_NAME, metadata_keys, shouldWIAddPrompt } from '@sillytavern/scripts/authors-note';
import { extension_settings, getContext } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import {
  ChatCompletion,
  Message,
  MessageCollection,
  isImageInliningSupported,
  oai_settings,
  prepareOpenAIMessages,
  sendOpenAIRequest,
  setOpenAIMessageExamples,
  setOpenAIMessages,
  setupChatCompletionPromptManager,
} from '@sillytavern/scripts/openai';
import {
  flushEphemeralStoppingStrings,
  persona_description_positions,
  power_user,
} from '@sillytavern/scripts/power-user';
import { Prompt, PromptCollection } from '@sillytavern/scripts/PromptManager';
import { Stopwatch, getBase64Async } from '@sillytavern/scripts/utils';
import { getWorldInfoPrompt, wi_anchor_position, world_info_include_names } from '@sillytavern/scripts/world-info';

// 在文件顶部添加 abortController 声明
let abortController = new AbortController();

interface IframeGenerate extends IframeMessage {
  request: '[Generate][generate]';
  config: GenerateConfig;
}

interface IframeGenerateRaw extends IframeMessage {
  request: '[Generate][generateRaw]';
  config: GenerateRawConfig;
}

function fromOverrides(overrides: Overrides): detail.OverrideConfig {
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

function fromInjectionPrompt(inject: InjectionPrompt): detail.InjectionPrompt {
  const position_map = {
    before_prompt: 'BEFORE_PROMPT',
    in_chat: 'IN_CHAT',
    after_prompt: 'IN_PROMPT',
    none: 'NONE',
  } as const;
  return {
    role: inject.role,
    content: inject.content,
    position: position_map[inject.position],
    depth: inject.depth,
    scan: inject.should_scan,
  };
}

function fromGenerateConfig(config: GenerateConfig): detail.GenerateParams {
  return {
    user_input: config.user_input,
    use_preset: true,
    image: config.image,
    stream: config.should_stream ?? false,
    overrides: config.overrides !== undefined ? fromOverrides(config.overrides) : undefined,
    inject: config.injects !== undefined ? config.injects.map(fromInjectionPrompt) : undefined,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
  };
}

function fromGenerateRawConfig(config: GenerateRawConfig): detail.GenerateParams {
  return {
    user_input: config.user_input,
    use_preset: false,
    image: config.image,
    stream: config.should_stream ?? false,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
    overrides: config.overrides ? fromOverrides(config.overrides) : undefined,
    inject: config.injects ? config.injects.map(fromInjectionPrompt) : undefined,
    order: config.ordered_prompts,
  };
}

namespace detail {
  export interface RolePrompt {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export interface InjectionPrompt {
    role: 'system' | 'user' | 'assistant';
    content: string;
    position?: 'IN_PROMPT' | 'IN_CHAT' | 'BEFORE_PROMPT' | 'NONE';
    depth?: number;
    scan?: boolean;
  }

  export interface CustomPrompt {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  // 覆盖配置类型
  export interface OverrideConfig {
    world_info_before?: string; // 世界书（角色定义之前的部分）
    persona_description?: string; // 用户描述
    char_description?: string; // 角色描述
    char_personality?: string; // 角色高级定义-性格
    scenario?: string; // 场景
    world_info_after?: string; // 世界书（角色定义之后的部分）
    dialogue_examples?: string; // 角色高级定义-对话示例

    with_depth_entries?: boolean; // 世界书深度
    author_note?: string; // 作者注释
    chat_history?: RolePrompt[]; // 聊天历史
  }

  // 内置提示词条目类型
  export type BuiltinPromptEntry =
    | 'world_info_before' // 世界书(角色定义前)
    | 'persona_description' // 用户描述
    | 'char_description' // 角色描述
    | 'char_personality' // 角色性格
    | 'scenario' // 场景
    | 'world_info_after' // 世界书(角色定义后)
    | 'dialogue_examples' // 对话示例
    | 'chat_history' // 聊天历史
    | 'user_input'; // 用户输入

  // 生成参数类型
  export interface GenerateParams {
    user_input?: string;
    use_preset?: boolean;
    image?: File | string;
    stream?: boolean;
    overrides?: OverrideConfig;
    max_chat_history?: number;
    inject?: InjectionPrompt[];
    order?: Array<BuiltinPromptEntry | CustomPrompt>;
  }
}

const type = 'quiet';
const dryRun = false;

const character_names_behavior = {
  NONE: -1,
  DEFAULT: 0,
  COMPLETION: 1,
  CONTENT: 2,
};

const roleTypes: Record<
  'system' | 'user' | 'assistant',
  (typeof extension_prompt_roles)[keyof typeof extension_prompt_roles]
> = {
  system: extension_prompt_roles.SYSTEM,
  user: extension_prompt_roles.USER,
  assistant: extension_prompt_roles.ASSISTANT,
};
const default_order: detail.BuiltinPromptEntry[] = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'chat_history',
  'user_input',
];

class StreamingProcessor {
  public generator: () => AsyncGenerator<{ text: string }, void, void>;
  public stoppingStrings?: string[];
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
      console.warn(
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

async function iframeGenerate({
  user_input = '',
  use_preset = true,
  image = null,
  overrides = undefined,
  max_chat_history = undefined,
  inject = [],
  order = undefined,
  stream = false,
}: detail.GenerateParams = {}): Promise<string> {
  //初始化
  abortController = new AbortController();

  // 1. 处理用户输入（正则，宏）
  const processedUserInput = processUserInput(substituteParams(user_input), oai_settings) || '';

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
        },
        processedUserInput,
      );
  console.log('[Generate:发送提示词]', generate_data);
  // 4. 根据 stream 参数决定生成方式
  return await generateResponse(generate_data, stream);
}

async function prepareAndOverrideData(
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  processedUserInput: string,
) {
  const getOverrideContent = (identifier: string): string | detail.RolePrompt[] | undefined => {
    if (!config.overrides) return undefined;
    return config.overrides[identifier as keyof detail.OverrideConfig];
  };

  // 1. 处理角色卡高级定义角色备注 - 仅在chat_history未被过滤时执行
  if (!isPromptFiltered('chat_history', config)) {
    handleCharDepthPrompt();
  }

  // 2. 设置作者注释 - 仅在chat_history未被过滤时执行
  if (!isPromptFiltered('chat_history', config) && !isPromptFiltered('author_note', config)) {
    setAuthorNotePrompt(config);
  }

  // 3. 处理user角色描述 - 仅在chat_history和persona_description都未被过滤时执行
  if (!isPromptFiltered('chat_history', config) && !isPromptFiltered('persona_description', config)) {
    setPersonaDescriptionExtensionPrompt();
  }

  // 4. 获取角色卡基础字段
  const {
    description: rawDescription,
    personality: rawPersonality,
    persona: rawPersona,
    scenario: rawScenario,
    mesExamples: rawMesExamples,
    system,
    jailbreak,
  } = getCharacterCardFields();

  // 判断是否被过滤,如果被过滤返回空字符串,否则返回override的值或原始值
  const description = isPromptFiltered('char_description', config)
    ? ''
    : getOverrideContent('char_description') ?? rawDescription;

  const personality = isPromptFiltered('char_personality', config)
    ? ''
    : getOverrideContent('char_personality') ?? rawPersonality;

  const persona = isPromptFiltered('persona_description', config)
    ? ''
    : getOverrideContent('persona_description') ?? rawPersona;

  const scenario = isPromptFiltered('scenario', config) ? '' : getOverrideContent('scenario') ?? rawScenario;

  const mesExamples = isPromptFiltered('dialogue_examples', config)
    ? ''
    : getOverrideContent('dialogue_examples') ?? rawMesExamples;

  let mesExamplesArray = parseMesExamples(mesExamples);
  let oaiMessageExamples = [];
  oaiMessageExamples = setOpenAIMessageExamples(mesExamplesArray);

  // 5. 获取偏置字符串
  const { promptBias } = getBiasStrings(processedUserInput, type);

  // 6. 处理自定义注入的提示词
  if (config.inject) {
    await handleInjectedPrompts(config);
  }

  // 7. 处理聊天记录
  let oaiMessages = [];
  if (config.overrides?.chat_history) {
    oaiMessages = [...config.overrides.chat_history].reverse();
  } else {
    oaiMessages = setOpenAIMessages(await processChatHistory(chat));
    if (config.max_chat_history !== undefined) {
      oaiMessages = oaiMessages.slice(0, config.max_chat_history);
    }
  }

  // 添加临时消息用于激活世界书
  addTemporaryUserMessage(processedUserInput);
  // 8. 处理世界信息
  const worldInfo = await processWorldInfo(oaiMessages, config);

  // 移除临时消息
  removeTemporaryUserMessage();

  // 9. 处理世界书消息示例
  mesExamplesArray = !isPromptFiltered('dialogue_examples', config)
    ? await processMessageExamples(mesExamplesArray, worldInfo.worldInfoExamples)
    : [];

  return {
    characterInfo: {
      description,
      personality,
      persona,
      scenario,
      system: system,
      jailbreak: jailbreak,
    },
    chatContext: {
      oaiMessages,
      oaiMessageExamples,
      promptBias,
    },
    worldInfo,
  };
}

//处理角色卡中的深度提示词
function handleCharDepthPrompt() {
  const depthPromptText =
    baseChatReplace(characters[this_chid]?.data?.extensions?.depth_prompt?.prompt?.trim(), name1, name2) || '';
  const depthPromptDepth = characters[this_chid]?.data?.extensions?.depth_prompt?.depth ?? '4';
  const depthPromptRole = getExtensionPromptRoleByName(
    characters[this_chid]?.data?.extensions?.depth_prompt?.role ?? 'system',
  );
  setExtensionPrompt(
    'DEPTH_PROMPT',
    depthPromptText,
    extension_prompt_types.IN_CHAT,
    depthPromptDepth,
    extension_settings.note.allowWIScan,
    depthPromptRole,
  );
}
//处理作者注释
function setAuthorNotePrompt(config: detail.GenerateParams) {
  const authorNoteOverride = config?.overrides?.author_note;
  // @ts-ignore
  let prompt = authorNoteOverride ?? $('#extension_floating_prompt').val();

  setExtensionPrompt(
    NOTE_MODULE_NAME,
    prompt,
    chat_metadata[metadata_keys.position],
    chat_metadata[metadata_keys.depth],
    extension_settings.note.allowWIScan,
    chat_metadata[metadata_keys.role],
  );
}
//用户角色描述提示词设置为提示词管理器之外的选项的情况
function setPersonaDescriptionExtensionPrompt() {
  const description = power_user.persona_description;
  const INJECT_TAG = 'PERSONA_DESCRIPTION';
  setExtensionPrompt(INJECT_TAG, '', extension_prompt_types.IN_PROMPT, 0);

  if (!description || power_user.persona_description_position === persona_description_positions.NONE) {
    return;
  }

  //当user信息在作者注释前后 - 仅在作者注释未被过滤时执行
  const promptPositions = [persona_description_positions.BOTTOM_AN, persona_description_positions.TOP_AN];

  if (promptPositions.includes(power_user.persona_description_position) && shouldWIAddPrompt) {
    const originalAN = getContext().extensionPrompts[NOTE_MODULE_NAME].value;
    const ANWithDesc =
      power_user.persona_description_position === persona_description_positions.TOP_AN
        ? `${description}\n${originalAN}`
        : `${originalAN}\n${description}`;

    setExtensionPrompt(
      NOTE_MODULE_NAME,
      ANWithDesc,
      chat_metadata[metadata_keys.position],
      chat_metadata[metadata_keys.depth],
      extension_settings.note.allowWIScan,
      chat_metadata[metadata_keys.role],
    );
  }

  // user信息深度注入不依赖于作者注释的状态，直接应用
  if (power_user.persona_description_position === persona_description_positions.AT_DEPTH) {
    setExtensionPrompt(
      INJECT_TAG,
      description,
      extension_prompt_types.IN_CHAT,
      power_user.persona_description_depth,
      true,
      power_user.persona_description_role,
    );
  }
}
async function handleInjectedPrompts(promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>) {
  if (!promptConfig || !Array.isArray(promptConfig.inject)) return;

  const injects = promptConfig.inject;

  const positionMap = {
    IN_PROMPT: extension_prompt_types.IN_PROMPT,
    IN_CHAT: extension_prompt_types.IN_CHAT,
    BEFORE_PROMPT: extension_prompt_types.BEFORE_PROMPT,
    NONE: extension_prompt_types.NONE,
  };

  for (const inject of injects) {
    const validatedInject = {
      role: roleTypes[inject.role] ?? extension_prompt_roles.SYSTEM,
      content: inject.content || '',
      depth: Number(inject.depth) || 0,
      scan: Boolean(inject.scan) || true,
      position: positionMap[inject.position as keyof typeof positionMap] ?? extension_prompt_types.IN_CHAT,
    };

    // 设置用户自定义注入提示词
    setExtensionPrompt(
      `INJECTION-${inject.depth}-${inject.role}`,
      validatedInject.content,
      validatedInject.position,
      validatedInject.depth,
      validatedInject.scan,
      validatedInject.role,
    );
  }
}
// 处理聊天记录
async function processChatHistory(chat: any[]) {
  let coreChat = chat.filter(x => !x.is_system);

  return await Promise.all(
    coreChat.map(async (chatItem, index) => {
      let message = chatItem.mes;
      let regexType = chatItem.is_user ? regex_placement.USER_INPUT : regex_placement.AI_OUTPUT;

      let regexedMessage = getRegexedString(message, regexType, {
        isPrompt: true,
        depth: coreChat.length - index - 1,
      });

      return {
        ...chatItem,
        mes: regexedMessage,
        index,
      };
    }),
  );
}

// 处理世界书
async function processWorldInfo(
  oaiMessages: detail.RolePrompt[],
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  const chatForWI = oaiMessages
    .filter(x => x.role !== 'system')
    .map(x => {
      const name = x.role === 'user' ? name1 : name2;
      return world_info_include_names ? `${name}: ${x.content}` : x.content;
    })
    .reverse();

  const this_max_context = getMaxContextSize();
  const { worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth } =
    await getWorldInfoPrompt(chatForWI, this_max_context, dryRun);

  await clearInjectionPrompts(['customDepthWI']);

  if (!isPromptFiltered('with_depth_entries', config)) {
    processWorldInfoDepth(worldInfoDepth);
  }

  // 先检查是否被过滤，如果被过滤直接返回null
  const finalWorldInfoBefore = isPromptFiltered('world_info_before', config)
    ? null
    : config.overrides?.world_info_before !== undefined
    ? config.overrides.world_info_before
    : worldInfoBefore;

  const finalWorldInfoAfter = isPromptFiltered('world_info_after', config)
    ? null
    : config.overrides?.world_info_after !== undefined
    ? config.overrides.world_info_after
    : worldInfoAfter;

  return {
    worldInfoString,
    worldInfoBefore: finalWorldInfoBefore,
    worldInfoAfter: finalWorldInfoAfter,
    worldInfoExamples,
    worldInfoDepth: !isPromptFiltered('with_depth_entries', config) ? worldInfoDepth : null,
  };
}
// 处理世界信息深度部分
function processWorldInfoDepth(worldInfoDepth: any[]) {
  if (Array.isArray(worldInfoDepth)) {
    worldInfoDepth.forEach(entry => {
      const joinedEntries = entry.entries.join('\n');
      setExtensionPrompt(
        `customDepthWI-${entry.depth}-${entry.role}`,
        joinedEntries,
        extension_prompt_types.IN_CHAT,
        entry.depth,
        false,
        entry.role,
      );
    });
  }
}
// 处理世界书中示例前后
async function processMessageExamples(mesExamplesArray: string[], worldInfoExamples: any[]): Promise<string[]> {
  // 处理世界信息中的示例
  for (const example of worldInfoExamples) {
    if (!example.content.length) continue;

    const formattedExample = baseChatReplace(example.content, name1, name2);
    const cleanedExample = parseMesExamples(formattedExample);

    if (example.position === wi_anchor_position.before) {
      mesExamplesArray.unshift(...cleanedExample);
    } else {
      mesExamplesArray.push(...cleanedExample);
    }
  }

  return mesExamplesArray;
}
//处理对话示例格式
function parseMesExamples(examplesStr: string) {
  if (examplesStr.length === 0 || examplesStr === '<START>') {
    return [];
  }

  if (!examplesStr.startsWith('<START>')) {
    examplesStr = '<START>\n' + examplesStr.trim();
  }
  const blockHeading = '<START>\n';
  const splitExamples = examplesStr
    .split(/<START>/gi)
    .slice(1)
    .map(block => `${blockHeading}${block.trim()}\n`);

  return splitExamples;
}
//用户输入先正则处理
function processUserInput(user_input: string, oai_settings: any) {
  if (user_input === '') {
    user_input = oai_settings.send_if_empty.trim();
  }
  return getRegexedString(user_input, regex_placement.USER_INPUT, {
    isPrompt: true,
    depth: 0,
  });
}
//使用预设
async function handlePresetPath(
  baseData: any,
  processedUserInput: string,
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  // prepareOpenAIMessages会从设置里读取场景因此临时覆盖
  let originalScenario = null;

  try {
    const scenarioOverride = config?.overrides?.scenario;

    if (scenarioOverride && characters && characters[this_chid]) {
      // 保存原始场景
      originalScenario = characters[this_chid].scenario || null;
      characters[this_chid].scenario = scenarioOverride;
    }
    // 添加user消息(一次性)
    const userMessageTemp = {
      role: 'user',
      content: processedUserInput,
    };

    if (config.image) {
      userMessageTemp.image = await convertFileToBase64(config.image);
    }

    baseData.chatContext.oaiMessages.unshift(userMessageTemp);

    const messageData = {
      name2,
      charDescription: baseData.characterInfo.description,
      charPersonality: baseData.characterInfo.personality,
      Scenario: baseData.characterInfo.scenario,
      worldInfoBefore: baseData.worldInfo.worldInfoBefore,
      worldInfoAfter: baseData.worldInfo.worldInfoAfter,
      extensionPrompts: getContext().extensionPrompts,
      bias: baseData.chatContext.promptBias,
      type: 'normal',
      quietPrompt: '',
      quietImage: null,
      cyclePrompt: '',
      systemPromptOverride: baseData.characterInfo.system,
      jailbreakPromptOverride: baseData.characterInfo.jailbreak,
      personaDescription: baseData.characterInfo.persona,
      messages: baseData.chatContext.oaiMessages,
      messageExamples: baseData.chatContext.oaiMessageExamples,
    };

    const [prompt] = await prepareOpenAIMessages(messageData, dryRun);

    return { prompt };
  } finally {
    // 恢复原始场景
    if (originalScenario !== null && characters && characters[this_chid]) {
      characters[this_chid].scenario = originalScenario;
    }
  }
}
async function convertSystemPromptsToCollection(
  baseData: any,
  promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  const promptCollection = new PromptCollection();
  const examplesCollection = new MessageCollection('dialogue_examples');
  // 处理自定义注入
  const customPrompts = (promptConfig.order || default_order)
    .map((item, index) => {
      if (typeof item === 'object' && item.role && item.content) {
        const identifier = `custom_prompt_${index}`;
        return {
          identifier,
          role: item.role as 'system' | 'user' | 'assistant',
          content: item.content,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  for (const prompt of customPrompts) {
    promptCollection.add(
      new Prompt({
        identifier: prompt.identifier,
        role: prompt.role,
        content: prompt.content,
        system_prompt: prompt.role === 'system',
      }),
    );
  }

  // 处理角色信息
  const characterPrompts = [
    {
      id: 'char_description',
      content: baseData.characterInfo.description,
      role: 'system',
    },
    {
      id: 'char_personality',
      content: baseData.characterInfo.personality,
      role: 'system',
    },
    {
      id: 'scenario',
      content: baseData.characterInfo.scenario,
      role: 'system',
    },
  ];

  // 添加角色相关提示词
  characterPrompts.forEach(prompt => {
    if (prompt.content) {
      promptCollection.add(
        new Prompt({
          identifier: prompt.id,
          role: prompt.role,
          content: prompt.content,
          system_prompt: true,
        }),
      );
    }
  });

  //当user信息在提示词管理器中时
  if (
    power_user.persona_description &&
    power_user.persona_description_position === persona_description_positions.IN_PROMPT
  ) {
    promptCollection.add(
      new Prompt({
        identifier: 'persona_description',
        role: 'system',
        content: baseData.characterInfo.persona,
        system_prompt: true,
      }),
    );
  }

  // 处理世界信息
  if (baseData.worldInfo.world_info_before) {
    promptCollection.add(
      new Prompt({
        identifier: 'world_info_before',
        role: 'system',
        content: baseData.worldInfo.world_info_before,
        system_prompt: true,
      }),
    );
  }

  if (baseData.worldInfo.world_info_after) {
    promptCollection.add(
      new Prompt({
        identifier: 'world_info_after',
        role: 'system',
        content: baseData.worldInfo.world_info_after,
        system_prompt: true,
      }),
    );
  }

  if (baseData.chatContext.oaiMessageExamples.length > 0) {
    // 遍历所有对话示例
    for (const dialogue of [...baseData.chatContext.oaiMessageExamples]) {
      const dialogueIndex = baseData.chatContext.oaiMessageExamples.indexOf(dialogue);
      const chatMessages = [];

      for (let promptIndex = 0; promptIndex < dialogue.length; promptIndex++) {
        const prompt = dialogue[promptIndex];
        const role = 'system';
        const content = prompt.content || '';
        const identifier = `dialogue_examples ${dialogueIndex}-${promptIndex}`;

        const chatMessage = await Message.createAsync(role, content, identifier);
        await chatMessage.setName(prompt.name);
        chatMessages.push(chatMessage);
      }
      for (const message of chatMessages) {
        examplesCollection.add(message);
      }
    }
  }
  return {
    systemPrompts: promptCollection,
    dialogue_examples: examplesCollection,
  };
}
//不使用预设
async function handleCustomPath(
  baseData: any,
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  processedUserInput: string,
) {
  const chatCompletion = new ChatCompletion();
  chatCompletion.setTokenBudget(oai_settings.openai_max_context, oai_settings.openai_max_tokens);
  chatCompletion.reserveBudget(3);
  const orderArray = config.order || default_order;
  const positionMap: Record<string, number> = orderArray.reduce((acc: Record<string, number>, item, index) => {
    if (typeof item === 'string') {
      acc[item.toLowerCase()] = index;
    } else if (typeof item === 'object') {
      acc[`custom_prompt_${index}`] = index;
    }
    return acc;
  }, {});

  //转换为集合
  const { systemPrompts, dialogue_examples } = await convertSystemPromptsToCollection(baseData, config);
  const addToChatCompletionInOrder = async (source: any, index: number) => {
    if (typeof source === 'object') {
      // 处理自定义注入
      const collection = new MessageCollection(`custom_prompt_${index}`);
      const message = await Message.createAsync(source.role, source.content, `custom_prompt_${index}`);
      collection.add(message);
      chatCompletion.add(collection, index);
    } else if (systemPrompts.has(source)) {
      // 处理普通提示词
      const prompt = systemPrompts.get(source);
      const collection = new MessageCollection(source);
      const message = await Message.fromPromptAsync(prompt);
      collection.add(message);
      chatCompletion.add(collection, positionMap[source]);
    }
  };

  // 处理所有类型的提示词
  for (const [index, item] of orderArray.entries()) {
    if (typeof item === 'string') {
      // 使用 isPromptFiltered 替代 promptFilter 判断
      if (!isPromptFiltered(item, config)) {
        await addToChatCompletionInOrder(item, index);
      }
    } else if (typeof item === 'object' && item.role && item.content) {
      await addToChatCompletionInOrder(item, index);
    }
  }

  const dialogue_examplesIndex = orderArray.findIndex(
    item => typeof item === 'string' && item.toLowerCase() === 'dialogue_examples',
  );

  if (dialogue_examplesIndex !== -1 && !isPromptFiltered('dialogue_examples', config)) {
    chatCompletion.add(dialogue_examples, dialogue_examplesIndex);
  }
  //给user输入预留token
  const userInputMessage = await Message.createAsync('user', processedUserInput, 'user_input');
  chatCompletion.reserveBudget(userInputMessage);

  await processChatHistoryAndInject(baseData, config, chatCompletion, processedUserInput);
  chatCompletion.freeBudget(userInputMessage);

  //根据当前预设决定是否合并连续系统role消息
  if (oai_settings.squash_system_messages) {
    await chatCompletion.squashSystemMessages();
  }
  const prompt = chatCompletion.getChat();
  return { prompt };
}

async function processChatHistoryAndInject(
  baseData: any,
  promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  chatCompletion: ChatCompletion,
  processedUserInput: string,
) {
  const orderArray = promptConfig.order || default_order;
  const chatHistoryIndex = orderArray.findIndex(
    item => typeof item === 'string' && item.toLowerCase() === 'chat_history',
  );
  const userInputIndex = orderArray.findIndex(item => typeof item === 'string' && item.toLowerCase() === 'user_input');

  const hasUserInput = userInputIndex !== -1;
  const hasChatHistory = chatHistoryIndex !== -1;
  const isChatHistoryFiltered = isPromptFiltered('chat_history', promptConfig);

  // 创建用户输入消息
  const userMessage = await Message.createAsync('user', processedUserInput, 'user_input');

  // 仅在需要时添加图像
  if (promptConfig.image && hasUserInput) {
    await userMessage.addImage(await convertFileToBase64(promptConfig.image));
  }

  // 如果聊天记录被过滤或不在order中，只处理用户输入
  if (isChatHistoryFiltered || !hasChatHistory) {
    const insertIndex = hasUserInput ? userInputIndex : orderArray.length;
    chatCompletion.add(new MessageCollection('user_input', userMessage), insertIndex);
    return;
  }

  // 处理聊天记录
  const chatCollection = new MessageCollection('chat_history');

  // 为新聊天指示预留token
  const newChat = oai_settings.new_chat_prompt;
  const newChatMessage = await Message.createAsync('system', substituteParams(newChat), 'newMainChat');
  chatCompletion.reserveBudget(newChatMessage);

  // 添加新聊天提示词到集合的最前面
  chatCollection.add(newChatMessage);

  // 处理空消息替换
  const lastChatPrompt = baseData.chatContext.oaiMessages[baseData.chatContext.oaiMessages.length - 1];
  const emptyMessage = await Message.createAsync('user', oai_settings.send_if_empty, 'emptyUserMessageReplacement');

  if (
    lastChatPrompt &&
    lastChatPrompt.role === 'assistant' &&
    oai_settings.send_if_empty &&
    chatCompletion.canAfford(emptyMessage)
  ) {
    chatCollection.add(emptyMessage);
  }

  // 将用户消息添加到消息数组中准备处理注入
  if (!hasUserInput) {
    const userPrompt = {
      role: 'user',
      content: processedUserInput,
      identifier: 'user_input',
      image: promptConfig.image ? await convertFileToBase64(promptConfig.image) : undefined,
    };
    baseData.chatContext.oaiMessages.unshift(userPrompt);
  }

  // 处理注入和添加消息
  const messages = (await populationInjectionPrompts(baseData.chatContext.oaiMessages, promptConfig.inject)).reverse();
  const imageInlining = isImageInliningSupported();
  // 添加聊天记录
  const chatPool = [...messages];
  for (const chatPrompt of chatPool) {
    const prompt = new Prompt(chatPrompt);
    prompt.identifier = `chat_history-${messages.length - chatPool.indexOf(chatPrompt)}`;
    prompt.content = substituteParams(prompt.content);

    const chatMessage = await Message.fromPromptAsync(prompt);
    const promptManager = setupChatCompletionPromptManager();
    if (promptManager.serviceSettings.names_behavior === character_names_behavior.COMPLETION && prompt.name) {
      const messageName = promptManager.isValidName(prompt.name)
        ? prompt.name
        : promptManager.sanitizeName(prompt.name);
      await chatMessage.setName(messageName);
    }
    if (imageInlining && chatPrompt.image) {
      await chatMessage.addImage(chatPrompt.image);
    }
    if (chatCompletion.canAfford(chatMessage)) {
      chatCollection.add(chatMessage);
    } else {
      break;
    }
  }

  // 释放新聊天提示词的预留token
  chatCompletion.freeBudget(newChatMessage);

  if (hasUserInput) {
    // 按各自在order中的位置添加聊天记录和用户输入
    chatCompletion.add(chatCollection, chatHistoryIndex);
    chatCompletion.add(new MessageCollection('user_input', userMessage), userInputIndex);
  } else {
    // 聊天记录中已包含用户输入，直接添加到chat_history位置
    chatCompletion.add(chatCollection, chatHistoryIndex);
  }
}
async function populationInjectionPrompts(messages: detail.RolePrompt[], customInjects: detail.InjectionPrompt[] = []) {
  let processedMessages = [...messages];
  let totalInsertedMessages = 0;
  const injectionPrompts = [];

  const authorsNote = getContext().extensionPrompts[NOTE_MODULE_NAME];
  if (authorsNote && authorsNote.value) {
    injectionPrompts.push({
      role: getPromptRole(authorsNote.role),
      content: authorsNote.value,
      identifier: 'authorsNote',
      injection_depth: authorsNote.depth,
      injected: true,
    });
  }

  if (
    power_user.persona_description &&
    power_user.persona_description_position === persona_description_positions.AT_DEPTH
  ) {
    injectionPrompts.push({
      role: 'system',
      content: power_user.persona_description,
      identifier: 'persona_description',
      injection_depth: power_user.persona_description_depth,
      injected: true,
    });
  }

  // 处理自定义注入
  if (Array.isArray(customInjects)) {
    for (const inject of customInjects) {
      injectionPrompts.push({
        identifier: `INJECTION-${inject.role}-${inject.depth}`,
        role: inject.role,
        content: inject.content,
        injection_depth: inject.depth || 0,
        injected: true,
      });
    }
  }

  for (let i = 0; i <= MAX_INJECTION_DEPTH; i++) {
    const depthPrompts = injectionPrompts.filter(prompt => prompt.injection_depth === i && prompt.content);

    const roles = ['system', 'user', 'assistant'];
    const roleMessages = [];
    const separator = '\n';

    for (const role of roles) {
      // 直接处理当前深度和角色的所有提示词
      const rolePrompts = depthPrompts
        .filter(prompt => prompt.role === role)
        .map(x => x.content.trim())
        .join(separator);

      if (rolePrompts) {
        roleMessages.push({
          role: role,
          content: rolePrompts,
          injected: true,
        });
      }
    }

    if (roleMessages.length) {
      const injectIdx = i + totalInsertedMessages;
      processedMessages.splice(injectIdx, 0, ...roleMessages);
      totalInsertedMessages += roleMessages.length;
    }
  }

  return processedMessages;
}

function getPromptRole(role: number) {
  switch (role) {
    case extension_prompt_roles.SYSTEM:
      return 'system';
    case extension_prompt_roles.USER:
      return 'user';
    case extension_prompt_roles.ASSISTANT:
      return 'assistant';
    default:
      return 'system';
  }
}

//生成响应
async function generateResponse(generate_data: any, useStream = false): Promise<string> {
  let result = '';
  try {
    deactivateSendButtons();

    if (useStream) {
      let originalStreamSetting = oai_settings.stream_openai;
      if (!originalStreamSetting) {
        oai_settings.stream_openai = true;
        saveSettingsDebounced();
      }
      const streamingProcessor = new StreamingProcessor();
      streamingProcessor.generator = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
      result = (await streamingProcessor.generate()) as string;
      // console.log("getMessage", getMessage);
      if (originalStreamSetting !== oai_settings.stream_openai) {
        oai_settings.stream_openai = originalStreamSetting;
        saveSettingsDebounced();
      }
    } else {
      eventSource.emit('js_generation_started');
      const response = await sendOpenAIRequest(type, generate_data.prompt, abortController.signal);
      result = await handleResponse(response);
    }
  } catch (error) {
    throw error;
  } finally {
    unblockGeneration();
    await clearInjectionPrompts(['INJECTION']);
  }
  return result;
}

// 处理响应
async function handleResponse(response: any) {
  if (!response) {
    throw Error(`未得到响应`);
  }
  if (response.error) {
    if (response?.response) {
      // @ts-ignore
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

function unblockGeneration() {
  activateSendButtons();
  showSwipeButtons();
  setGenerationProgress(0);
  flushEphemeralStoppingStrings();
}

// 清理注入
async function clearInjectionPrompts(prefixes: string[]) {
  const prompts = getContext().extensionPrompts;
  Object.keys(prompts)
    .filter(key => prefixes.some(prefix => key.startsWith(prefix)))
    .forEach(key => delete prompts[key]);

  await saveChatConditional();
}
function extractMessageFromData(data: any) {
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

async function convertFileToBase64(image: File | string): Promise<string> {
  if (image instanceof File) {
    return await getBase64Async(image);
  }
  return image;
}

function addTemporaryUserMessage(userContent: string) {
  setExtensionPrompt('TEMP_USER_MESSAGE', userContent, extension_prompt_types.IN_PROMPT, 0, true, 1);
}

function removeTemporaryUserMessage() {
  setExtensionPrompt('TEMP_USER_MESSAGE', '', extension_prompt_types.IN_PROMPT, 0, true, 1);
}

function isPromptFiltered(promptId: string, config: { overrides?: detail.OverrideConfig }): boolean {
  if (!config.overrides) {
    return false;
  }

  if (promptId === 'with_depth_entries') {
    return config.overrides.with_depth_entries === false;
  }

  // 特殊处理 chat_history
  if (promptId === 'chat_history') {
    const prompts = config.overrides.chat_history;
    return prompts !== undefined && prompts.length === 0;
  }

  // 对于普通提示词，只有当它在 overrides 中存在且为空字符串时才被过滤
  const override = config.overrides[promptId as keyof Omit<detail.OverrideConfig, 'chat_history'>];
  return override !== undefined && override === '';
}

export function registerIframeGenerateHandler() {
  registerIframeHandler('[Generate][generate]', async (event: MessageEvent<IframeGenerate>): Promise<string> => {
    const iframe_name = getIframeName(event);
    const config = event.data.config;

    console.info(`${getLogPrefix(event)}(${iframe_name}) 发送生成请求: ${config}`);

    const converted_config = fromGenerateConfig(config);
    return await iframeGenerate(converted_config);
  });

  registerIframeHandler('[Generate][generateRaw]', async (event: MessageEvent<IframeGenerateRaw>): Promise<string> => {
    const iframe_name = getIframeName(event);
    const config = event.data.config;

    console.info(`${getLogPrefix(event)}(${iframe_name}) 发送生成请求: ${config}`);

    const converted_config = fromGenerateRawConfig(config);
    return await iframeGenerate(converted_config);
  });
}

$(document).on('click', '#mes_stop', function () {
  const wasStopped = stopGeneration();
  if (wasStopped) {
    if (abortController) {
      abortController.abort('Clicked stop button');
    }
    unblockGeneration();
  }
});
