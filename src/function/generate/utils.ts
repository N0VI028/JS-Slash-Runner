import { saveChatConditionalDebounced } from '@/util/tavern';
import {
  activateSendButtons,
  eventSource,
  extension_prompt_roles,
  extension_prompt_types,
  setExtensionPrompt,
  setGenerationProgress,
  showSwipeButtons,
} from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { oai_settings } from '@sillytavern/scripts/openai';
import { flushEphemeralStoppingStrings } from '@sillytavern/scripts/power-user';
import { getBase64Async, isDataURL } from '@sillytavern/scripts/utils';

/**
 * 将文件转换为base64
 * @param img 文件或图片url
 * @returns base64字符串
 */
export async function convertFileToBase64(img: File | string): Promise<string | undefined> {
  const isDataUrl = typeof img === 'string' && isDataURL(img);
  let processedImg;

  if (!isDataUrl) {
    try {
      if (typeof img === 'string') {
        const response = await fetch(img, { method: 'GET', cache: 'force-cache' });
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        processedImg = await getBase64Async(blob);
      } else {
        processedImg = await getBase64Async(img);
      }
    } catch (err) {
      return undefined;
    }
  } else {
    processedImg = img
  }
  return processedImg;
}

/**
 * 从响应数据中提取消息内容
 * @param data 响应数据
 * @returns 提取的消息字符串
 */
export function extractMessageFromData(data: any): string {
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

/**
 * 处理对话示例格式
 * @param examplesStr 对话示例字符串
 * @returns 处理后的对话示例数组
 */
export function parseMesExamples(examplesStr: string): string[] {
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

/**
 * 用户输入先正则处理
 * @param user_input 用户输入
 * @returns 处理后的用户输入
 */
export function processUserInput(user_input: string): string {
  if (user_input === '') {
    user_input = oai_settings.send_if_empty.trim();
  }
  return getRegexedString(user_input, regex_placement.USER_INPUT, {
    isPrompt: true,
    depth: 0,
  });
}

/**
 * 获取提示词角色类型
 * @param role 角色数字
 * @returns 角色字符串
 */
export function getPromptRole(role: number): 'system' | 'user' | 'assistant' {
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

/**
 * 检查提示词是否被过滤
 * @param promptId 提示词ID
 * @param config 配置对象
 * @returns 是否被过滤
 */
export function isPromptFiltered(promptId: string, config: { overrides?: any }): boolean {
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
  const override = config.overrides[promptId as keyof any];
  return override !== undefined && override === '';
}

/**
 * 添加临时用户消息
 * @param userContent 用户内容
 */
export function addTemporaryUserMessage(userContent: string): void {
  setExtensionPrompt('TEMP_USER_MESSAGE', userContent, extension_prompt_types.IN_PROMPT, 0, true, 1);
}

/**
 * 移除临时用户消息
 */
export function removeTemporaryUserMessage(): void {
  setExtensionPrompt('TEMP_USER_MESSAGE', '', extension_prompt_types.IN_PROMPT, 0, true, 1);
}

/**
 * 解除生成阻塞状态
 */
export function unblockGeneration(): void {
  activateSendButtons();
  showSwipeButtons();
  setGenerationProgress(0);
  flushEphemeralStoppingStrings();
}

/**
 * 清理注入提示词
 * @param prefixes 前缀数组
 */
export async function clearInjectionPrompts(prefixes: string[]): Promise<void> {
  const prompts: Record<string, any> = getContext().extensionPrompts;
  Object.keys(prompts)
    .filter(key => prefixes.some(prefix => key.startsWith(prefix)))
    .forEach(key => delete prompts[key]);
  saveChatConditionalDebounced();
}

/**
 * 直接处理图片数组，转换为prompt格式
 * @param processedUserInput 处理后的用户输入
 * @param image 图片数组参数
 * @returns 包含文本和图片内容的数组格式
 */
export async function processImageArrayDirectly(
  processedUserInput: string,
  image: (File | string)[],
): Promise<{ type: string; text?: string; image_url?: { url: string; detail: string } }[]> {
  const quality = oai_settings.inline_image_quality || 'low';

  const imageContents = await Promise.all(
    image.map(async img => {
      try {
        const processedImg = await convertFileToBase64(img);
        if (!processedImg) {
          console.warn('[TavernHelper][Generate:图片数组处理] 图片处理失败，跳过该图片');
          return null;
        }
        return {
          type: 'image_url',
          image_url: { url: processedImg, detail: quality },
        };
      } catch (imgError) {
        console.warn('[TavernHelper][Generate:图片数组处理] 图片处理失败，跳过该图片');
        return null;
      }
    }),
  );

  const validImageContents = imageContents.filter(content => content !== null);
  const textContent = {
    type: 'text',
    text: processedUserInput,
  };

  return [textContent, ...validImageContents];
}

/**
 * 设置图片数组处理逻辑（用于事件监听方式）
 * @param processedUserInput 处理后的用户输入
 * @param image 图片数组参数
 * @returns 包含带标识符的用户输入和Promise解析器的对象
 */
export function setupImageArrayProcessing(
  processedUserInput: string,
  image: (File | string)[],
): {
  userInputWithMarker: string;
  imageProcessingPromise: Promise<void>;
  resolveImageProcessing: () => void;
  rejectImageProcessing: (reason?: any) => void;
  cleanup: () => void;
} {
  const imageMarker = `__IMG_ARRAY_MARKER_`;
  const userInputWithMarker = processedUserInput + imageMarker;

  let resolveImageProcessing: () => void;
  let rejectImageProcessing: (reason?: any) => void;

  const imageProcessingPromise = new Promise<void>((resolve, reject) => {
    resolveImageProcessing = resolve;
    rejectImageProcessing = reject;
  });

  let timeoutId: NodeJS.Timeout | null = null;
  let isHandlerRegistered = true;

  const imageArrayHandler = async (eventData: { chat: { role: string; content: string | any[] }[] }) => {
    try {
      // 添加超时保护
      timeoutId = setTimeout(() => {
        console.warn('[TavernHelper][Generate:图片数组处理] 图片处理超时');
        rejectImageProcessing(new Error('图片处理超时'));
      }, 30000);

      for (let i = eventData.chat.length - 1; i >= 0; i--) {
        const message = eventData.chat[i];
        const contentStr = typeof message.content === 'string' ? message.content : '';

        if (message.role === 'user' && contentStr.includes(imageMarker)) {
          try {
            const quality = oai_settings.inline_image_quality || 'low';

            const imageContents = await Promise.all(
              image.map(async img => {
                try {
                  const processedImg = await convertFileToBase64(img);
                  if (!processedImg) {
                    console.warn('[TavernHelper][Generate:图片数组处理] 图片处理失败，跳过该图片');
                    return null;
                  }
                  return {
                    type: 'image_url',
                    image_url: { url: processedImg, detail: quality },
                  };
                } catch (imgError) {
                  console.warn('[TavernHelper][Generate:图片数组处理] 单个图片处理失败:', imgError);
                  return null;
                }
              }),
            );

            const validImageContents = imageContents.filter(content => content !== null);
            const cleanContent = contentStr.replace(imageMarker, '');
            const textContent = {
              type: 'text',
              text: cleanContent,
            };

            message.content = [textContent, ...validImageContents] as any;

            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            resolveImageProcessing();
            return;
          } catch (error) {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            console.error('[TavernHelper][Generate:图片数组处理] 处理图片时出错:', error);
            rejectImageProcessing(error);
            return;
          }
        }
      }

      console.warn('[TavernHelper][Generate:图片数组处理] 未找到包含图片标记的用户消息');
      resolveImageProcessing();
    } catch (error) {
      console.error('[TavernHelper][Generate:图片数组处理] imageArrayHandler 异常:', error);
      rejectImageProcessing(error);
    }
  };

  eventSource.once('chat_completion_prompt_ready', imageArrayHandler);

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (isHandlerRegistered) {
      try {
        eventSource.removeListener('chat_completion_prompt_ready', imageArrayHandler);
        isHandlerRegistered = false;
      } catch (error) {
        console.warn('[TavernHelper][Generate:图片数组处理] 清理事件监听器时出错:', error);
      }
    }
  };

  return {
    userInputWithMarker,
    imageProcessingPromise,
    resolveImageProcessing: resolveImageProcessing!,
    rejectImageProcessing: rejectImageProcessing!,
    cleanup,
  };
}
