import { detail, RolePrompt } from '@/function/generate/types';
import {
  addTemporaryUserMessage,
  clearInjectionPrompts,
  isPromptFiltered,
  parseMesExamples,
  removeTemporaryUserMessage,
} from '@/function/generate/utils';
import { injectPrompts } from '@/function/inject';
import {
  baseChatReplace,
  characters,
  chat,
  chat_metadata,
  extension_prompt_types,
  extension_prompts,
  getBiasStrings,
  getCharacterCardFields,
  getExtensionPromptRoleByName,
  getMaxContextSize,
  name1,
  name2,
  setExtensionPrompt,
  this_chid,
} from '@sillytavern/script';
import { metadata_keys, NOTE_MODULE_NAME, shouldWIAddPrompt } from '@sillytavern/scripts/authors-note';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { setOpenAIMessageExamples, setOpenAIMessages } from '@sillytavern/scripts/openai';
import { persona_description_positions, power_user } from '@sillytavern/scripts/power-user';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { getWorldInfoPrompt, wi_anchor_position, world_info_include_names } from '@sillytavern/scripts/world-info';

/**
 * 准备并覆盖数据的核心函数
 * @param config 配置参数
 * @param processedUserInput 处理后的用户输入
 * @returns 包含角色信息、聊天上下文和世界信息的数据对象
 */
export async function prepareAndOverrideData(
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  processedUserInput: string,
) {
  const getOverrideContent = (identifier: string): string | RolePrompt[] | undefined => {
    if (!config.overrides) return undefined;
    const value = config.overrides[identifier as keyof detail.OverrideConfig];
    if (typeof value === 'boolean') return undefined;
    return value;
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

  const character = characters.at(this_chid as unknown as number);

  // 4. 获取角色卡基础字段
  const charDepthPrompt = baseChatReplace(character?.data?.extensions?.depth_prompt?.prompt?.trim(), name1, name2);
  const creatorNotes = baseChatReplace(character?.data?.creator_notes?.trim(), name1, name2);
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
    : (getOverrideContent('char_description') ?? rawDescription);

  const personality = isPromptFiltered('char_personality', config)
    ? ''
    : (getOverrideContent('char_personality') ?? rawPersonality);

  const persona = isPromptFiltered('persona_description', config)
    ? ''
    : (getOverrideContent('persona_description') ?? rawPersona);

  const scenario = isPromptFiltered('scenario', config) ? '' : (getOverrideContent('scenario') ?? rawScenario);

  const mesExamples = isPromptFiltered('dialogue_examples', config)
    ? ''
    : ((getOverrideContent('dialogue_examples') as string) ?? rawMesExamples);

  let mesExamplesArray = parseMesExamples(mesExamples);
  let oaiMessageExamples = [];
  oaiMessageExamples = setOpenAIMessageExamples(mesExamplesArray);

  // 5. 获取偏置字符串
  const { promptBias } = getBiasStrings(processedUserInput, 'normal');

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
  const worldInfo = await processWorldInfo(oaiMessages as RolePrompt[], config, {
    description: rawDescription,
    personality: rawPersonality,
    persona: rawPersona,
    scenario: rawScenario,
    charDepthPrompt,
    creatorNotes,
  });

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

/**
 * 处理角色卡中的深度提示词
 */
function handleCharDepthPrompt() {
  const character = characters.at(this_chid as unknown as number);
  const depthPromptText =
    baseChatReplace(character?.data?.extensions?.depth_prompt?.prompt?.trim(), name1, name2) || '';
  const depthPromptDepth = character?.data?.extensions?.depth_prompt?.depth ?? 4;
  const depthPromptRole = getExtensionPromptRoleByName(character?.data?.extensions?.depth_prompt?.role ?? 'system');
  setExtensionPrompt(
    'DEPTH_PROMPT',
    depthPromptText,
    extension_prompt_types.IN_CHAT,
    depthPromptDepth,
    // @ts-expect-error 类型正确
    extension_settings.note.allowWIScan,
    depthPromptRole,
  );
}

/**
 * 处理作者注释
 */
function setAuthorNotePrompt(config: detail.GenerateParams) {
  const authorNoteOverride = config?.overrides?.author_note;
  const prompt = authorNoteOverride ?? ($('#extension_floating_prompt').val() as string);

  setExtensionPrompt(
    NOTE_MODULE_NAME,
    prompt,
    // @ts-expect-error 类型正确
    chat_metadata[metadata_keys.position],
    // @ts-expect-error 类型正确
    chat_metadata[metadata_keys.depth],
    // @ts-expect-error 类型正确
    extension_settings.note.allowWIScan,
    // @ts-expect-error 类型正确
    chat_metadata[metadata_keys.role],
  );
}

/**
 * 用户角色描述提示词设置为提示词管理器之外的选项的情况
 */
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
    const originalAN = _.get(extension_prompts, NOTE_MODULE_NAME) as any;
    const ANWithDesc =
      power_user.persona_description_position === persona_description_positions.TOP_AN
        ? `${description}\n${originalAN}`
        : `${originalAN}\n${description}`;

    setExtensionPrompt(
      NOTE_MODULE_NAME,
      ANWithDesc,
      // @ts-expect-error 类型正确
      chat_metadata[metadata_keys.position],
      // @ts-expect-error 类型正确
      chat_metadata[metadata_keys.depth],
      // @ts-expect-error 类型正确
      extension_settings.note.allowWIScan,
      // @ts-expect-error 类型正确
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

/**
 * 处理注入的提示词
 */
async function handleInjectedPrompts(promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>) {
  if (!promptConfig || !Array.isArray(promptConfig.inject)) return;
  injectPrompts(
    promptConfig.inject.map(prompt => ({ id: uuidv4(), ...prompt })),
    { once: true },
  );
}

/**
 * 处理聊天记录
 */
async function processChatHistory(chatHistory: any[]) {
  const coreChat = chatHistory.filter(x => !x.is_system);

  return await Promise.all(
    coreChat.map(async (chatItem, index) => {
      const message = chatItem.mes;
      const regexType = chatItem.is_user ? regex_placement.USER_INPUT : regex_placement.AI_OUTPUT;

      const regexedMessage = getRegexedString(message, regexType, {
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

/**
 * 处理世界书
 */
async function processWorldInfo(
  oaiMessages: RolePrompt[],
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  characterInfo: {
    description: string;
    personality: string;
    persona: string;
    scenario: string;
    charDepthPrompt: string;
    creatorNotes: string;
  },
) {
  const chatForWI = oaiMessages
    .filter(x => x.role !== 'system')
    .map(x => {
      const name = x.role === 'user' ? name1 : name2;
      return world_info_include_names ? `${name}: ${x.content}` : x.content;
    })
    .reverse();

  const this_max_context = getMaxContextSize();
  const globalScanData = {
    personaDescription: config.overrides?.persona_description ?? characterInfo.persona,
    characterDescription: config.overrides?.char_description ?? characterInfo.description,
    characterPersonality: config.overrides?.char_personality ?? characterInfo.personality,
    characterDepthPrompt: characterInfo.charDepthPrompt,
    scenario: config.overrides?.scenario ?? characterInfo.scenario,
    creatorNotes: characterInfo.creatorNotes,
  };
  const { worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth } =
    // @ts-expect-error 不考虑新的 trigger 字段
    await getWorldInfoPrompt(chatForWI, this_max_context, false, globalScanData);

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

/**
 * 处理世界信息深度部分
 */
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

/**
 * 处理世界书中示例前后
 */
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
