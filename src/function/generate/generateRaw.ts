import {
  BaseData,
  RolePrompt,
  builtin_prompt_default_order,
  character_names_behavior,
  default_order,
  detail,
} from '@/function/generate/types';
import { convertFileToBase64, getPromptRole, isPromptFiltered } from '@/function/generate/utils';
import { InjectionPrompt, injectPrompts } from '@/function/inject';
import {
  MAX_INJECTION_DEPTH,
  eventSource,
  event_types,
  extension_prompts,
  getExtensionPromptByName,
  substituteParams,
} from '@sillytavern/script';
import { NOTE_MODULE_NAME } from '@sillytavern/scripts/authors-note';
import {
  ChatCompletion,
  Message,
  MessageCollection,
  isImageInliningSupported,
  oai_settings,
  setupChatCompletionPromptManager,
} from '@sillytavern/scripts/openai';
import { persona_description_positions, power_user } from '@sillytavern/scripts/power-user';
import { Prompt, PromptCollection } from '@sillytavern/scripts/PromptManager';
import { uuidv4 } from '@sillytavern/scripts/utils';

/**
 * @fileoverview 原始生成路径处理模块 - 不使用预设的生成逻辑
 * 包含所有不使用预设(use_preset=false)时的提示词处理和聊天完成逻辑
 */

/**
 * 将系统提示词转换为集合格式
 * 处理内置提示词、自定义注入和对话示例，转换为PromptCollection和MessageCollection格式
 * @param baseData 包含角色信息和世界书信息的基础数据
 * @param promptConfig 提示词配置参数，包含order等设置
 * @returns Promise<{systemPrompts: PromptCollection, dialogue_examples: MessageCollection}> 返回系统提示词和对话示例的集合
 */
async function convertSystemPromptsToCollection(
  baseData: any,
  promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  const promptCollection = new PromptCollection();
  const examplesCollection = new MessageCollection('dialogue_examples');

  const orderArray = promptConfig.order || builtin_prompt_default_order;

  const builtinPromptContents = {
    world_info_before: baseData.worldInfo.worldInfoBefore,
    persona_description:
      power_user.persona_description &&
      power_user.persona_description_position === persona_description_positions.IN_PROMPT
        ? baseData.characterInfo.persona
        : null,
    char_description: baseData.characterInfo.description,
    char_personality: baseData.characterInfo.personality,
    scenario: baseData.characterInfo.scenario,
    world_info_after: baseData.worldInfo.worldInfoAfter,
  };

  for (const [index, item] of orderArray.entries()) {
    if (typeof item === 'string') {
      // 处理内置提示词
      const content = builtinPromptContents[item as keyof typeof builtinPromptContents];
      if (content) {
        promptCollection.add(
          new Prompt({
            identifier: item,
            role: 'system',
            content: content,
            system_prompt: true,
          }),
        );
      }
    } else if (typeof item === 'object' && item.role && item.content) {
      // 处理自定义注入
      const identifier = `custom_prompt_${index}`;
      promptCollection.add(
        new Prompt({
          identifier: identifier,
          role: item.role,
          content: item.content,
          system_prompt: item.role === 'system',
        }),
      );
    }
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

/**
 * 处理聊天记录并注入提示词
 * 根据order配置处理聊天历史和用户输入，并注入各种深度提示词
 * @param baseData 包含聊天上下文的基础数据
 * @param promptConfig 提示词配置参数
 * @param chatCompletion ChatCompletion对象，用于管理token预算和消息集合
 * @param processedUserInput 经过处理的用户输入文本
 * @param processedImageArray 可选的处理后图片数组，用于多图片支持
 * @returns Promise<void> 无返回值，直接修改chatCompletion对象
 */
async function processChatHistoryAndInject(
  baseData: any,
  promptConfig: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
  chatCompletion: ChatCompletion,
  processedUserInput: string,
  processedImageArray?: { type: string; text?: string; image_url?: { url: string; detail: string } }[] | null,
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
  let userMessage: Message;

  if (processedImageArray && hasUserInput) {
    // 如果有处理后的图片数组，直接使用数组格式创建消息
    userMessage = await Message.createAsync('user', processedImageArray as any, 'user_input');
  } else {
    // 否则使用原有逻辑
    userMessage = await Message.createAsync('user', processedUserInput, 'user_input');

    if (promptConfig.image && hasUserInput) {
      if (!Array.isArray(promptConfig.image)) {
        const img = await convertFileToBase64(promptConfig.image);
        if (img) {
          await userMessage.addImage(img);
        }
      }
    }
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
    let userPrompt: any;

    if (processedImageArray) {
      // 如果有处理后的图片数组，使用数组格式
      userPrompt = {
        role: 'user',
        content: processedImageArray,
        identifier: 'user_input',
      };
    } else {
      // 否则使用原有逻辑
      userPrompt = {
        role: 'user',
        content: processedUserInput,
        identifier: 'user_input',
        image:
          promptConfig.image && !Array.isArray(promptConfig.image)
            ? await convertFileToBase64(promptConfig.image)
            : undefined,
      };
    }

    baseData.chatContext.oaiMessages.unshift(userPrompt);
  }

  // 处理注入和添加消息
  const messages = (
    await populationInjectionPrompts(baseData, baseData.chatContext.oaiMessages, promptConfig.inject, promptConfig)
  ).reverse();
  const imageInlining = isImageInliningSupported();
  // 添加聊天记录
  const chatPool = [...messages];
  for (const chatPrompt of chatPool) {
    const prompt = new Prompt(chatPrompt as any);
    prompt.identifier = `chat_history-${messages.length - chatPool.indexOf(chatPrompt)}`;
    prompt.content = substituteParams(prompt.content);

    const chatMessage = await Message.fromPromptAsync(prompt);
    const promptManager = setupChatCompletionPromptManager(oai_settings);

    if (promptManager) {
      // @ts-expect-error 类型正确
      if (promptManager.serviceSettings.names_behavior === character_names_behavior.COMPLETION && prompt.name) {
        const messageName = promptManager.isValidName(prompt.name)
          ? prompt.name
          : promptManager.sanitizeName(prompt.name);
        await chatMessage.setName(messageName);
      }
    }
    if (imageInlining && chatPrompt.image) {
      await chatMessage.addImage(chatPrompt.image as string);
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

/**
 * 处理注入提示词
 * 按深度注入各种提示词，包括作者注释、用户描述、世界书深度条目和自定义注入
 * @param baseData 包含世界书信息的基础数据
 * @param messages 原始消息数组
 * @param customInjects 自定义注入提示词数组
 * @param config 配置参数，用于过滤检查
 * @returns Promise<RolePrompt[]> 处理后的消息数组，包含所有注入的提示词
 */
async function populationInjectionPrompts(
  baseData: BaseData,
  messages: RolePrompt[],
  customInjects: Omit<InjectionPrompt, 'id'>[] = [],
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  const processedMessages = [...messages];
  let totalInsertedMessages = 0;
  const injectionPrompts = [];

  const authorsNote = _.get(extension_prompts, NOTE_MODULE_NAME, {}) as any;
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

  if (!isPromptFiltered('char_depth_prompt', config)) {
    const wiDepthPrompt = baseData.worldInfo.worldInfoDepth;
    if (wiDepthPrompt) {
      for (const entry of wiDepthPrompt) {
        const content = await getExtensionPromptByName(`customDepthWI-${entry.depth}-${entry.role}`);
        injectionPrompts.push({
          role: getPromptRole(entry.role),
          content: content,
          injection_depth: entry.depth,
          injected: true,
        });
      }
    }
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
          role: role as 'user' | 'system' | 'assistant',
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

/**
 * 处理原始生成路径（不使用预设）
 * 构建ChatCompletion对象，按照指定order处理各种提示词，管理token预算
 * @param baseData 包含角色信息、聊天上下文和世界书信息的基础数据
 * @param config 配置参数，包含图片、覆盖设置、注入等选项
 * @param processedUserInput 经过处理的用户输入文本
 * @returns Promise<{prompt: any}> 包含最终prompt的生成数据对象
 */
export async function handleCustomPath(
  baseData: any,
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'> & {
    processedImageArray?: { type: string; text?: string; image_url?: { url: string; detail: string } }[] | null;
  },
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

  await processChatHistoryAndInject(baseData, config, chatCompletion, processedUserInput, config.processedImageArray);
  chatCompletion.freeBudget(userInputMessage);

  //根据当前预设决定是否合并连续系统role消息
  if (oai_settings.squash_system_messages) {
    await chatCompletion.squashSystemMessages();
  }
  const prompt = chatCompletion.getChat();
  eventSource.emit(event_types.CHAT_COMPLETION_PROMPT_READY, { chat: prompt, dryRun: false });
  return { prompt };
}
