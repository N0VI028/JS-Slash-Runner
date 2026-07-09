import { getImageTokenCost, getVideoTokenCost } from '@/util/tavern';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import _ from 'lodash';

// =====================
// 类型定义
// =====================
export interface PromptData {
  id: number;
  role: string;
  content: string;
  images?: { url: string }[];
  token: number;
  tool_calls?: any[];
  tool_call_id?: string;
}

// =====================
// 对外接口：创建 PromptData
// =====================
export async function createPromptData(
  index: number,
  role: string,
  content: any,
  tool_calls?: any[],
  tool_call_id?: string,
): Promise<PromptData> {
  const { processedContent, images, token } = await processPromptContent(role, content, tool_calls);

  return {
    id: index,
    role,
    content: processedContent,
    images,
    token,
    tool_calls,
    tool_call_id,
  };
}

// =====================
// 内部函数：处理 content
// =====================
async function processPromptContent(
  role: string,
  content: any,
  tool_calls?: any[],
): Promise<{ processedContent: string; images: { url: string }[]; token: number }> {
  if (!content) {
    return await processEmptyContent(role, tool_calls);
  } else if (typeof content === 'string') {
    return await processStringContent(content);
  } else {
    return await processArrayContent(content);
  }
}

async function processEmptyContent(
  role: string,
  tool_calls?: any[],
): Promise<{ processedContent: string; images: { url: string }[]; token: number }> {
  const token = role === 'assistant' && tool_calls ? await getTokenCountAsync(JSON.stringify(tool_calls)) : 0;
  return { processedContent: '[无内容]', images: [], token };
}

async function processStringContent(
  content: string,
): Promise<{ processedContent: string; images: { url: string }[]; token: number }> {
  const token = await getTokenCountAsync(content);
  return { processedContent: content, images: [], token };
}

async function processArrayContent(
  content: any[],
): Promise<{ processedContent: string; images: { url: string }[]; token: number }> {
  const parsed = parseJsonContent(content);
  const token = _.sum(
    await Promise.all(
      content.map(async item => {
        switch (item.type) {
          case 'text':
            return await getTokenCountAsync(item.text);
          case 'image_url':
            return await getImageTokenCost(item.image_url.url, item.image_url.detail);
          case 'video_url':
            // TODO： 用户附加的视频文件似乎根本不计入？content中没有，AI回复的视频未知
            return await getVideoTokenCost(item.video_url.url);
          default:
            return 0;
        }
      }),
    ),
  );
  return { processedContent: parsed.text, images: parsed.images, token };
}

// =====================
// 内部函数：解析 JSON 格式 content
// =====================
function parseJsonContent(content: any[]): { text: string; images: { url: string }[] } {
  try {
    const textParts: string[] = [];
    const images: { url: string }[] = [];

    for (const item of content) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      switch (item.type) {
        case 'text': {
          const text = item.text ?? '';
          textParts.push(String(text));
          break;
        }
        case 'image_url': {
          const url: string = _.get(item, 'image_url.url', '');
          if (!url) break;
          images.push({ url });
          break;
        }
        case 'video_url': {
          const url: string = _.get(item, 'video_url.url', '');
          if (url) {
            textParts.push(`[Video] ${url}`);
          }
          break;
        }
        default: {
          textParts.push(JSON.stringify(item));
        }
      }
    }
    // TODO: 有没有必要严格按照显示的顺序图文穿插显示？目前把图片全部放在最后了
    return { text: textParts.join('\n\n'), images };
  } catch (e) {
    return { text: JSON.stringify(content, null, 2), images: [] };
  }
}
