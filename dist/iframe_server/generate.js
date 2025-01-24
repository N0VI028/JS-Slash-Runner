import { getRegexedString, regex_placement, } from "../../../../../extensions/regex/engine.js";
import { getWorldInfoPrompt, wi_anchor_position, world_info_include_names } from "../../../../../world-info.js";
import { setFloatingPrompt, shouldWIAddPrompt, NOTE_MODULE_NAME, metadata_keys } from "../../../../../authors-note.js";
import { prepareOpenAIMessages, setOpenAIMessageExamples, setOpenAIMessages, sendOpenAIRequest, oai_settings, ChatCompletion, Message, MessageCollection, promptManager } from "../../../../../openai.js";
import { chat, extension_prompts, getCharacterCardFields, setExtensionPrompt, getExtensionPromptRoleByName, extension_prompt_roles, extension_prompt_types, baseChatReplace, name1, name2, activateSendButtons, showSwipeButtons, setGenerationProgress, eventSource, event_types, getBiasStrings, getNextMessageId, substituteParams, chat_metadata, this_chid, characters, deactivateSendButtons, MAX_INJECTION_DEPTH } from "../../../../../../script.js";
import { extension_settings } from "../../../../../extensions.js";
import { Prompt, PromptCollection } from "../../../../../PromptManager.js";
import { power_user, persona_description_positions, flushEphemeralStoppingStrings, } from "../../../../../power-user.js";
import { getLogPrefix, registerIframeHandler } from "./index.js";
let this_max_context = oai_settings.openai_max_tokens;
let abortController = new AbortController();
let is_send_press = false;
const signal = abortController.signal;
const type = "quiet";
const dryRun = false;
const character_names_behavior = {
    NONE: -1,
    DEFAULT: 0,
    COMPLETION: 1,
    CONTENT: 2,
};
const roleTypes = {
    system: extension_prompt_roles.SYSTEM,
    user: extension_prompt_roles.USER,
    assistant: extension_prompt_roles.ASSISTANT,
};
const default_order = [
    "worldInfoBefore",
    "personaDescription",
    "charDescription",
    "charPersonality",
    "scenario",
    "worldInfoAfter",
    "dialogueExamples",
    "chatHistory",
    "userInput",
];
async function iframeGenerate({ userInput = "", usePreset = true, promptConfig = {}, }) {
    const processedUserInput = processUserInput(substituteParams(userInput), oai_settings) || "";
    // 1. 初始化
    await initializeGeneration();
    // 2. 准备过滤后的基础数据
    const baseData = await prepareAndOverrideData(promptConfig, processedUserInput);
    // 3. 根据 usePreset 分流处理
    const generate_data = usePreset
        ? await handlePresetPath(baseData, processedUserInput, promptConfig)
        : await handleCustomPath(baseData, promptConfig, processedUserInput);
    // console.log("generate_data", generate_data);
    // 4. 生成响应
    return await generateResponse(generate_data);
}
async function initializeGeneration() {
    // 1. 触发生成开始事件
    await eventSource.emit(event_types.GENERATION_STARTED, type, { signal }, dryRun);
    // 2. 初始化中断控制器
    if (!(abortController && signal)) {
        abortController = new AbortController();
    }
    return {
        abortController,
        signal: abortController.signal,
    };
}
async function prepareAndOverrideData(promptConfig, processedUserInput) {
    const config = (promptConfig || {});
    const promptFilter = config.filter?.map((f) => f.toLowerCase()) || [];
    const shouldExcludePrompt = (identifier) => {
        if (!promptFilter.length)
            return false;
        return promptFilter.includes(identifier.toLowerCase());
    };
    // 1. 处理角色卡高级定义角色备注 - 仅在chatHistory未被过滤时执行
    if (!shouldExcludePrompt('chatHistory')) {
        handleCharDepthPrompt();
    }
    // 2. 设置作者注释 - 仅在chatHistory和authorsNote都未被过滤时执行
    if (!shouldExcludePrompt('chatHistory') && !shouldExcludePrompt("authorsNote")) {
        setFloatingPrompt();
    }
    // 3. 处理user角色描述 - 仅在chatHistory和personaDescription都未被过滤时执行，并传递authorsNote的过滤状态
    if (!shouldExcludePrompt('chatHistory') && !shouldExcludePrompt("personaDescription")) {
        setPersonaDescriptionExtensionPrompt(shouldExcludePrompt("authorsNote"));
    }
    // 4. 获取角色卡基础字段
    const { description: rawDescription, personality: rawPersonality, persona: rawPersona, scenario: rawScenario, mesExamples: rawMesExamples, system, jailbreak, } = getCharacterCardFields();
    // 先判断是否被过滤，如果被过滤则返回空字符串，否则再判断是否被覆盖
    const description = shouldExcludePrompt("charDescription")
        ? ""
        : config.overrides?.find((o) => o.id === "charDescription")?.content ?? rawDescription;
    const personality = shouldExcludePrompt("charPersonality")
        ? ""
        : config.overrides?.find((o) => o.id === "charPersonality")?.content ?? rawPersonality;
    const persona = shouldExcludePrompt("personaDescription")
        ? ""
        : config.overrides?.find((o) => o.id === "personaDescription")?.content ?? rawPersona;
    const scenario = shouldExcludePrompt("scenario")
        ? ""
        : config.overrides?.find((o) => o.id === "scenario")?.content ?? rawScenario;
    const mesExamples = shouldExcludePrompt("dialogueExamples")
        ? ""
        : config.overrides?.find((o) => o.id === "dialogueExamples")?.content ?? rawMesExamples;
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
    let chatHistoryOverridden = false;
    let oaiMessages = [];
    if (!shouldExcludePrompt("chatHistory")) {
        // 先处理聊天记录覆盖
        const chatHistoryOverride = config.overrides?.find(({ id }) => id === "chatHistory");
        if (chatHistoryOverride) {
            const content = chatHistoryOverride.content;
            // 验证聊天记录格式
            if (!Array.isArray(content)) {
                console.error("聊天记录必须是数组格式");
            }
            else {
                const isValidFormat = content.every((msg) => msg &&
                    typeof msg === "object" &&
                    ["user", "assistant", "system"].includes(msg.role) &&
                    typeof msg.content === "string");
                if (!isValidFormat) {
                    console.error("聊天记录格式错误：每条消息必须包含 role 和 content 字段");
                }
                else {
                    oaiMessages = [...content]
                        .reverse()
                        .slice(0, config.maxChatHistory);
                    chatHistoryOverridden = true;
                }
            }
        }
        // 如果没有覆盖，则使用原始聊天记录
        if (!chatHistoryOverridden) {
            oaiMessages = setOpenAIMessages(await processChatHistory(chat));
            if (config.maxChatHistory !== undefined) {
                oaiMessages = oaiMessages.slice(0, config.maxChatHistory);
            }
        }
    }
    // 添加临时消息用于激活世界书
    addTemporaryUserMessage(processedUserInput);
    // 8. 处理世界信息
    const worldInfo = await processWorldInfo(oaiMessages, shouldExcludePrompt, promptConfig);
    // 移除临时消息
    removeTemporaryUserMessage();
    // 9. 处理世界书消息示例
    mesExamplesArray = !shouldExcludePrompt("dialogueExamples")
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
    const depthPromptText = baseChatReplace(characters[this_chid]?.data?.extensions?.depth_prompt?.prompt?.trim(), name1, name2) || "";
    const depthPromptDepth = characters[this_chid]?.data?.extensions?.depth_prompt?.depth ??
        "4";
    const depthPromptRole = getExtensionPromptRoleByName(characters[this_chid]?.data?.extensions?.depth_prompt?.role ??
        "system");
    setExtensionPrompt("DEPTH_PROMPT", depthPromptText, extension_prompt_types.IN_CHAT, depthPromptDepth, extension_settings.note.allowWIScan, depthPromptRole);
}
//用户角色描述提示词设置为提示词管理器之外的选项的情况
function setPersonaDescriptionExtensionPrompt(isAuthorsNoteFiltered) {
    const description = power_user.persona_description;
    const INJECT_TAG = "PERSONA_DESCRIPTION";
    setExtensionPrompt(INJECT_TAG, "", extension_prompt_types.IN_PROMPT, 0);
    if (!description ||
        power_user.persona_description_position ===
            persona_description_positions.NONE) {
        return;
    }
    //当user信息在作者注释前后 - 仅在作者注释未被过滤时执行
    const promptPositions = [
        persona_description_positions.BOTTOM_AN,
        persona_description_positions.TOP_AN,
    ];
    if (!isAuthorsNoteFiltered &&
        promptPositions.includes(power_user.persona_description_position) &&
        shouldWIAddPrompt) {
        const originalAN = extension_prompts[NOTE_MODULE_NAME].value;
        const ANWithDesc = power_user.persona_description_position ===
            persona_description_positions.TOP_AN
            ? `${description}\n${originalAN}`
            : `${originalAN}\n${description}`;
        setExtensionPrompt(NOTE_MODULE_NAME, ANWithDesc, chat_metadata[metadata_keys.position], chat_metadata[metadata_keys.depth], extension_settings.note.allowWIScan, chat_metadata[metadata_keys.role]);
    }
    // user信息深度注入不依赖于作者注释的状态
    if (power_user.persona_description_position ===
        persona_description_positions.AT_DEPTH) {
        setExtensionPrompt(INJECT_TAG, description, extension_prompt_types.IN_CHAT, power_user.persona_description_depth, true, power_user.persona_description_role);
    }
}
async function handleInjectedPrompts(promptConfig) {
    if (!promptConfig || !Array.isArray(promptConfig.inject))
        return;
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
            content: inject.content || "",
            depth: Number(inject.depth) || 0,
            scan: Boolean(inject.scan) || true,
            position: positionMap[inject.position] ?? extension_prompt_types.IN_CHAT,
        };
        // 设置用户自定义注入提示词
        setExtensionPrompt(`INJECTION-${inject.depth}-${inject.role}`, validatedInject.content, validatedInject.position, validatedInject.depth, validatedInject.scan, validatedInject.role);
    }
}
// 处理聊天记录
async function processChatHistory(chat) {
    let coreChat = chat.filter((x) => !x.is_system);
    return await Promise.all(coreChat.map(async (chatItem, index) => {
        let message = chatItem.mes;
        let regexType = chatItem.is_user
            ? regex_placement.USER_INPUT
            : regex_placement.AI_OUTPUT;
        let regexedMessage = getRegexedString(message, regexType, {
            isPrompt: true,
            depth: coreChat.length - index - 1,
        });
        return {
            ...chatItem,
            mes: regexedMessage,
            index,
        };
    }));
}
// 处理世界书
async function processWorldInfo(oaiMessages, shouldExcludePrompt, promptConfig) {
    const chatForWI = oaiMessages
        .filter((x) => x.role !== "system") // 过滤系统消息
        .map((x) => {
        const name = x.role === "user" ? name1 : name2;
        return world_info_include_names ? `${name}: ${x.content}` : x.content;
    })
        .reverse();
    const { worldInfoString, worldInfoBefore: rawWorldInfoBefore, worldInfoAfter: rawWorldInfoAfter, worldInfoExamples, worldInfoDepth, } = await getWorldInfoPrompt(chatForWI, this_max_context, dryRun);
    // 根据过滤器决定是否包含世界信息，如果不过滤则检查是否有覆盖值
    const worldInfoBefore = !shouldExcludePrompt("worldInfoBefore")
        ? promptConfig?.overrides?.find((o) => o.id === "worldInfoBefore")?.content ?? rawWorldInfoBefore
        : "";
    const worldInfoAfter = !shouldExcludePrompt("worldInfoAfter")
        ? promptConfig?.overrides?.find((o) => o.id === "worldInfoAfter")?.content ?? rawWorldInfoAfter
        : "";
    // 仅在未被过滤时处理世界信息深度
    if (!shouldExcludePrompt("worldInfoDepth")) {
        processWorldInfoDepth(worldInfoDepth);
    }
    return {
        worldInfoString,
        worldInfoBefore,
        worldInfoAfter,
        worldInfoExamples,
        worldInfoDepth,
    };
}
// 处理世界信息深度部分
function processWorldInfoDepth(worldInfoDepth) {
    // 清除现有的深度世界信息提示词防止重复注入
    for (const key of Object.keys(extension_prompts)) {
        if (key.startsWith("customDepthWI")) {
            delete extension_prompts[key];
        }
    }
    if (Array.isArray(worldInfoDepth)) {
        worldInfoDepth.forEach((entry) => {
            const joinedEntries = entry.entries.join("\n");
            setExtensionPrompt(`customDepthWI-${entry.depth}-${entry.role}`, joinedEntries, extension_prompt_types.IN_CHAT, entry.depth, false, entry.role);
        });
    }
}
// 处理世界书中示例前后
async function processMessageExamples(mesExamplesArray, worldInfoExamples) {
    // 处理世界信息中的示例
    for (const example of worldInfoExamples) {
        if (!example.content.length)
            continue;
        const formattedExample = baseChatReplace(example.content, name1, name2);
        const cleanedExample = parseMesExamples(formattedExample);
        if (example.position === wi_anchor_position.before) {
            mesExamplesArray.unshift(...cleanedExample);
        }
        else {
            mesExamplesArray.push(...cleanedExample);
        }
    }
    return mesExamplesArray;
}
//处理对话示例格式
function parseMesExamples(examplesStr) {
    if (examplesStr.length === 0 || examplesStr === "<START>") {
        return [];
    }
    if (!examplesStr.startsWith("<START>")) {
        examplesStr = "<START>\n" + examplesStr.trim();
    }
    const blockHeading = "<START>\n";
    const splitExamples = examplesStr
        .split(/<START>/gi)
        .slice(1)
        .map((block) => `${blockHeading}${block.trim()}\n`);
    return splitExamples;
}
//用户输入先正则处理
function processUserInput(userInput, oai_settings) {
    if (userInput === "") {
        userInput = oai_settings.send_if_empty.trim();
    }
    return getRegexedString(userInput, regex_placement.USER_INPUT);
}
//使用预设
async function handlePresetPath(baseData, processedUserInput, promptConfig) {
    // 单独处理场景覆盖
    let originalScenario = null;
    try {
        const scenarioOverride = promptConfig?.overrides?.find((override) => override.id === "scenario");
        if (scenarioOverride?.content && characters && characters[this_chid]) {
            // 保存原始场景
            originalScenario = characters[this_chid].scenario || null;
            characters[this_chid].scenario = scenarioOverride.content;
        }
        // 添加user消息(一次性)
        baseData.chatContext.oaiMessages.unshift({
            role: "user",
            content: processedUserInput,
        });
        const messageData = {
            name2,
            charDescription: baseData.characterInfo.description,
            charPersonality: baseData.characterInfo.personality,
            Scenario: baseData.characterInfo.scenario,
            worldInfoBefore: baseData.worldInfo.worldInfoBefore,
            worldInfoAfter: baseData.worldInfo.worldInfoAfter,
            extensionPrompts: extension_prompts,
            bias: baseData.chatContext.promptBias,
            type: "quiet",
            quietPrompt: "",
            quietImage: null,
            cyclePrompt: "",
            extensionPromptOverride: baseData.characterInfo.system,
            jailbreakPromptOverride: baseData.characterInfo.jailbreak,
            personaDescription: baseData.characterInfo.persona,
            messages: baseData.chatContext.oaiMessages,
            messageExamples: baseData.chatContext.oaiMessageExamples,
        };
        const [prompt] = await prepareOpenAIMessages(messageData, dryRun);
        return { prompt };
    }
    finally {
        // 获取到 prompt 后立即恢复原始场景
        if (originalScenario !== null && characters && characters[this_chid]) {
            characters[this_chid].scenario = originalScenario;
        }
    }
}
async function convertSystemPromptsToCollection(baseData, promptConfig) {
    const promptCollection = new PromptCollection();
    const examplesCollection = new MessageCollection("dialogueExamples");
    // 处理自定义提示词
    const customPrompts = (promptConfig.order || default_order)
        .map((item, index) => {
        if (typeof item === 'object' && item.role && item.content) {
            const identifier = `custom_prompt_${index}`;
            return {
                identifier,
                role: item.role,
                content: item.content,
            };
        }
        return null;
    })
        .filter((item) => item !== null);
    for (const prompt of customPrompts) {
        promptCollection.add(new Prompt({
            identifier: prompt.identifier,
            role: prompt.role,
            content: prompt.content,
            system_prompt: prompt.role === 'system',
        }));
    }
    // 处理角色信息
    const characterPrompts = [
        {
            id: "charDescription",
            content: baseData.characterInfo.description,
            role: "system",
        },
        {
            id: "charPersonality",
            content: baseData.characterInfo.personality,
            role: "system",
        },
        {
            id: "scenario",
            content: baseData.characterInfo.scenario,
            role: "system",
        }
    ];
    // 添加角色相关提示词
    characterPrompts.forEach((prompt) => {
        if (prompt.content) {
            promptCollection.add(new Prompt({
                identifier: prompt.id,
                role: prompt.role,
                content: prompt.content,
                system_prompt: true,
            }));
        }
    });
    //当user信息在提示词管理器中时
    if (power_user.persona_description &&
        power_user.persona_description_position ===
            persona_description_positions.IN_PROMPT) {
        promptCollection.add(new Prompt({
            identifier: "personaDescription",
            role: "system",
            content: baseData.characterInfo.persona,
            system_prompt: true,
        }));
    }
    // 处理世界信息
    if (baseData.worldInfo.worldInfoBefore) {
        promptCollection.add(new Prompt({
            identifier: "worldInfoBefore",
            role: "system",
            content: baseData.worldInfo.worldInfoBefore,
            system_prompt: true,
        }));
    }
    if (baseData.worldInfo.worldInfoAfter) {
        promptCollection.add(new Prompt({
            identifier: "worldInfoAfter",
            role: "system",
            content: baseData.worldInfo.worldInfoAfter,
            system_prompt: true,
        }));
    }
    if (baseData.chatContext.oaiMessageExamples.length > 0) {
        // 遍历所有对话示例
        for (const dialogue of [...baseData.chatContext.oaiMessageExamples]) {
            const dialogueIndex = baseData.chatContext.oaiMessageExamples.indexOf(dialogue);
            const chatMessages = [];
            for (let promptIndex = 0; promptIndex < dialogue.length; promptIndex++) {
                const prompt = dialogue[promptIndex];
                const role = "system";
                const content = prompt.content || "";
                const identifier = `dialogueExamples ${dialogueIndex}-${promptIndex}`;
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
        dialogueExamples: examplesCollection,
    };
}
//不使用预设
async function handleCustomPath(baseData, promptConfig, processedUserInput) {
    const chatCompletion = new ChatCompletion();
    chatCompletion.setTokenBudget(oai_settings.openai_max_context, oai_settings.openai_max_tokens);
    chatCompletion.reserveBudget(3);
    const orderArray = promptConfig.order || default_order;
    const promptFilter = promptConfig?.filter?.map((f) => f.toLowerCase()) || [];
    const positionMap = orderArray.reduce((acc, item, index) => {
        if (typeof item === 'string') {
            acc[item.toLowerCase()] = index;
        }
        else if (typeof item === 'object') {
            acc[`custom_prompt_${index}`] = index;
        }
        return acc;
    }, {});
    //转换为集合
    const { systemPrompts, dialogueExamples } = await convertSystemPromptsToCollection(baseData, promptConfig);
    const addToChatCompletionInOrder = async (source, index) => {
        if (typeof source === 'object') {
            // 处理自定义提示词
            const collection = new MessageCollection(`custom_prompt_${index}`);
            const message = await Message.createAsync(source.role, source.content, `custom_prompt_${index}`);
            collection.add(message);
            chatCompletion.add(collection, index);
        }
        else if (systemPrompts.has(source)) {
            // 处理普通提示词
            const prompt = systemPrompts.get(source);
            const collection = new MessageCollection(source);
            const message = await Message.fromPromptAsync(prompt);
            collection.add(message);
            chatCompletion.add(collection, positionMap[source]);
        }
    };
    // 遍历 order 数组,处理所有类型的提示词
    for (const [index, item] of orderArray.entries()) {
        if (typeof item === 'string') {
            // 处理字符串类型的提示词
            if (!promptFilter.includes(item.toLowerCase())) {
                await addToChatCompletionInOrder(item, index);
            }
        }
        else if (typeof item === 'object' && item.role && item.content) {
            // 处理对象类型的自定义提示词
            await addToChatCompletionInOrder(item, index);
        }
    }
    const dialogueExamplesIndex = orderArray.findIndex(item => typeof item === 'string' && item.toLowerCase() === 'dialogueexamples');
    if (dialogueExamplesIndex !== -1 && !promptFilter.includes('dialogueexamples')) {
        chatCompletion.add(dialogueExamples, dialogueExamplesIndex);
    }
    //给user输入预留token
    const userInputMessage = await Message.createAsync("user", processedUserInput, "userInput");
    chatCompletion.reserveBudget(userInputMessage);
    await processChatHistoryAndInject(baseData, promptConfig, chatCompletion, processedUserInput);
    chatCompletion.freeBudget(userInputMessage);
    //根据当前预设决定是否合并连续系统role消息
    if (oai_settings.squash_system_messages) {
        await chatCompletion.squashSystemMessages();
    }
    const prompt = chatCompletion.getChat();
    return { prompt };
}
async function processChatHistoryAndInject(baseData, promptConfig, chatCompletion, processedUserInput) {
    const orderArray = promptConfig.order || default_order;
    const promptFilter = promptConfig?.filter?.map(f => f.toLowerCase()) || [];
    // 判断聊天记录和用户输入的状态
    const isChatHistoryFiltered = promptFilter.includes('chathistory');
    const hasUserInputInOrder = orderArray.some(item => typeof item === 'string' && item.toLowerCase() === 'userinput');
    const hasChatHistoryInOrder = orderArray.some(item => typeof item === 'string' && item.toLowerCase() === 'chathistory');
    const chatHistoryIndex = orderArray.findIndex(item => typeof item === 'string' && item.toLowerCase() === 'chathistory');
    const userInputIndex = orderArray.findIndex(item => typeof item === 'string' && item.toLowerCase() === 'userinput');
    // 创建用户输入消息
    const userMessage = await Message.createAsync("user", processedUserInput, "userInput");
    // 如果聊天记录被过滤或不在order中，只处理用户输入
    if (isChatHistoryFiltered || !hasChatHistoryInOrder) {
        if (hasUserInputInOrder) {
            chatCompletion.add(new MessageCollection("userInput", userMessage), userInputIndex);
        }
        else {
            chatCompletion.add(new MessageCollection("userInput", userMessage), orderArray.length);
        }
        return;
    }
    // 处理聊天记录在order中的情况
    const chatCollection = new MessageCollection("chatHistory");
    // 为新聊天预留token
    const newChat = oai_settings.new_chat_prompt;
    const newChatMessage = await Message.createAsync("system", substituteParams(newChat), "newMainChat");
    chatCompletion.reserveBudget(newChatMessage);
    // 首先添加新聊天提示词到集合的最前面
    chatCollection.add(newChatMessage);
    // 处理空消息替换
    const lastChatPrompt = baseData.chatContext.oaiMessages[baseData.chatContext.oaiMessages.length - 1];
    const emptyMessage = await Message.createAsync("user", oai_settings.send_if_empty, "emptyUserMessageReplacement");
    if (lastChatPrompt &&
        lastChatPrompt.role === "assistant" &&
        oai_settings.send_if_empty &&
        chatCompletion.canAfford(emptyMessage)) {
        chatCollection.add(emptyMessage);
    }
    // 先将用户输入添加到基础数据中
    if (!hasUserInputInOrder) {
        baseData.chatContext.oaiMessages.unshift({
            role: "user",
            content: processedUserInput,
            identifier: "userInput"
        });
    }
    // 处理注入
    const messages = (await populationInjectionPrompts(baseData, promptConfig.inject)).reverse();
    // 添加聊天记录
    const chatPool = [...messages];
    for (const chatPrompt of chatPool) {
        const prompt = new Prompt(chatPrompt);
        prompt.identifier = `chatHistory-${messages.length - chatPool.indexOf(chatPrompt)}`;
        prompt.content = substituteParams(prompt.content);
        const chatMessage = await Message.fromPromptAsync(prompt);
        if (promptManager.serviceSettings.names_behavior ===
            character_names_behavior.COMPLETION &&
            prompt.name) {
            const messageName = promptManager.isValidName(prompt.name)
                ? prompt.name
                : promptManager.sanitizeName(prompt.name);
            await chatMessage.setName(messageName);
        }
        if (chatCompletion.canAfford(chatMessage)) {
            chatCollection.add(chatMessage);
        }
        else {
            break;
        }
    }
    // 释放新聊天提示词的预留token
    chatCompletion.freeBudget(newChatMessage);
    if (hasUserInputInOrder) {
        // 按各自在order中的位置添加聊天记录和用户输入
        chatCompletion.add(chatCollection, chatHistoryIndex);
        chatCompletion.add(new MessageCollection("userInput", userMessage), userInputIndex);
    }
    else {
        // 聊天记录中已包含用户输入，直接添加
        chatCompletion.add(chatCollection, chatHistoryIndex);
    }
}
async function populationInjectionPrompts(baseData, customInjects = []) {
    let totalInsertedMessages = 0;
    const injectionPrompts = [];
    const authorsNote = extension_prompts[NOTE_MODULE_NAME];
    if (authorsNote && authorsNote.value) {
        injectionPrompts.push({
            role: getPromptRole(authorsNote.role),
            content: authorsNote.value,
            identifier: "authorsNote",
            injection_depth: authorsNote.depth,
            injected: true
        });
    }
    if (power_user.persona_description &&
        power_user.persona_description_position ===
            persona_description_positions.AT_DEPTH) {
        injectionPrompts.push({
            role: "system",
            content: power_user.persona_description,
            identifier: "personaDescription",
            injection_depth: power_user.persona_description_depth,
            injected: true
        });
    }
    // 处理自定义注入
    if (Array.isArray(customInjects)) {
        for (const inject of customInjects) {
            injectionPrompts.push({
                identifier: `INJECTION-${inject.role}-${inject.depth}`,
                role: getPromptRole(inject.role),
                content: inject.content,
                injection_depth: inject.depth || 0,
                injected: true
            });
        }
    }
    for (let i = 0; i <= MAX_INJECTION_DEPTH; i++) {
        const depthPrompts = injectionPrompts.filter((prompt) => prompt.injection_depth === i && prompt.content);
        const roles = ["system", "user", "assistant"];
        const roleMessages = [];
        const separator = "\n";
        for (const role of roles) {
            // 直接处理当前深度和角色的所有提示词
            const rolePrompts = depthPrompts
                .filter((prompt) => prompt.role === role)
                .map((x) => x.content.trim())
                .join(separator);
            // 如果有内容则创建消息
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
            baseData.chatContext.oaiMessages.splice(injectIdx, 0, ...roleMessages);
            totalInsertedMessages += roleMessages.length;
        }
    }
    return baseData.chatContext.oaiMessages;
}
function getPromptRole(role) {
    switch (role) {
        case extension_prompt_roles.SYSTEM:
            return "system";
        case extension_prompt_roles.USER:
            return "user";
        case extension_prompt_roles.ASSISTANT:
            return "assistant";
        default:
            return "system";
    }
}
//生成响应
async function generateResponse(generate_data) {
    // 1. 准备生成状态
    const generationState = {
        is_send_press: true,
        messageId: getNextMessageId(type),
    };
    try {
        deactivateSendButtons();
        // @ts-ignore
        $("#mes_stop").css({ display: "flex" });
        // 2. 发送请求并获取响应
        const response = await sendOpenAIRequest(type, generate_data.prompt, abortController.signal);
        // 3. 处理响应
        const result = await handleResponse(response, generationState);
        return result;
    }
    catch (error) {
        console.error(error);
        throw error;
    }
    finally {
        if (!is_send_press) {
            unblockGeneration();
        }
    }
}
// 处理响应
async function handleResponse(response, generationState) {
    if (!response)
        return;
    if (response.error) {
        if (response?.response) {
            // @ts-ignore
            toastr.error(response.response, t `API Error`, { preventDuplicates: true });
        }
        throw new Error(response?.response);
    }
    const message = extractMessageFromData(response);
    //console.log("返回的消息内容:", message);
    return {
        message,
        generationState,
    };
}
function unblockGeneration() {
    is_send_press = false;
    activateSendButtons();
    showSwipeButtons();
    setGenerationProgress(0);
    flushEphemeralStoppingStrings();
    //清理深度注入
    for (const key of Object.keys(extension_prompts)) {
        if (key.startsWith("customDepthWI")) {
            delete extension_prompts[key];
        }
    }
    for (const key of Object.keys(extension_prompts)) {
        if (key.startsWith("INJECTION")) {
            delete extension_prompts[key];
        }
    }
}
function extractMessageFromData(data) {
    if (typeof data === "string") {
        return data;
    }
    return (data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.text ??
        data?.message?.content?.[0]?.text ??
        data?.message?.tool_plan ??
        "");
}
function addTemporaryUserMessage(userContent) {
    setExtensionPrompt('TEMP_USER_MESSAGE', userContent, extension_prompt_types.IN_PROMPT, 0, true, 1);
}
function removeTemporaryUserMessage() {
    setExtensionPrompt('TEMP_USER_MESSAGE', '', extension_prompt_types.IN_PROMPT, 0, true, 1);
}
export function registerIframeGenerateHandler() {
    registerIframeHandler('[Generate][Generate]', async (event) => {
        const userInput = event.data.userInput;
        const usePreset = event.data.usePreset;
        const promptConfig = event.data.promptConfig;
        console.info(`${getLogPrefix(event)}发送生成请求, 配置: ${JSON.stringify(event.data)}`);
        const result = await iframeGenerate({
            userInput,
            usePreset,
            promptConfig
        }) ?? { message: '' };
        return result.message;
    });
}
//# sourceMappingURL=generate.js.map