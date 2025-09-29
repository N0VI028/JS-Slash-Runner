import { substituteParams } from '@sillytavern/script';
import { processImageArrayDirectly, processUserInput, setupImageArrayProcessing } from '@/function/generate/utils';

/**
 * 用户输入处理结果接口
 */
export interface ProcessedInputResult {
  processedUserInput: string;
  imageProcessingSetup?: ReturnType<typeof setupImageArrayProcessing>;
  processedImageArray?: { type: string; text?: string; image_url?: { url: string; detail: string } }[];
}

/**
 * 处理用户输入的第一步
 * 包括宏替换、正则处理等预处理操作
 * @param user_input 原始用户输入
 * @returns 处理后的用户输入
 */
export function processInitialUserInput(user_input = ''): string {
  // 1. 处理宏替换
  const substitutedInput = substituteParams(user_input);

  // 2. 处理正则和其他预处理
  const processedUserInput = processUserInput(substitutedInput) || '';

  return processedUserInput;
}

/**
 * 完整的用户输入和图片处理
 * 包括用户输入预处理和图片数组处理逻辑
 * @param user_input 用户输入文本
 * @param use_preset 是否使用预设
 * @param image 图片参数，可以是单个图片(File|string)或图片数组(File|string)[]
 * @returns 处理结果，包含处理后的用户输入和图片处理相关数据
 */
export async function processUserInputWithImages(
  user_input = '',
  use_preset = true,
  image: File | string | (File | string)[] | undefined = undefined,
): Promise<ProcessedInputResult> {
  // 1. 处理用户输入（正则，宏）
  let processedUserInput = processInitialUserInput(user_input);

  // 处理可能的图片数组的情况
  let imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined;
  let processedImageArray: { type: string; text?: string; image_url?: { url: string; detail: string } }[] | undefined =
    undefined;

  if (Array.isArray(image) && image.length > 0) {
    if (use_preset) {
      // 使用预设时，采用事件监听方式处理图片数组
      imageProcessingSetup = setupImageArrayProcessing(processedUserInput, image);
      processedUserInput = imageProcessingSetup.userInputWithMarker;
    } else {
      // 使用原始模式时，直接处理图片数组
      processedImageArray = await processImageArrayDirectly(processedUserInput, image);
      // 保持原始用户输入不变，图片数组将在后续步骤中直接使用
    }
  }

  return {
    processedUserInput,
    imageProcessingSetup,
    processedImageArray,
  };
}
