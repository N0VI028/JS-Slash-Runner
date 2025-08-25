import { isUrl } from '@/util/is_url';

import log from 'loglevel';

/**
 * 默认脚本配置类型
 */
type ScriptConfig = {
  name: string;
  content: string;
  info: string;
};

/**
 * 默认脚本配置
 * 包含每个默认脚本的基本信息
 */
export const DEFAULT_SCRIPT_CONFIGS: Record<string, ScriptConfig> = {
  标签化: {
    name: '标签化: 随世界书、预设或链接配置自动开关正则、提示词条目',
    content: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/标签化/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/标签化/README.md',
  },
  预设防误触: {
    name: '预设防误触',
    content: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/预设防误触/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/预设防误触/README.md',
  },
  世界书强制自定义排序: {
    name: '世界书强制自定义排序',
    content: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/世界书强制自定义排序/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/世界书强制自定义排序/README.md',
  },
  世界书强制用推荐的全局设置: {
    name: '世界书强制用推荐的全局设置',
    content:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/世界书强制用推荐的全局设置/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/世界书强制用推荐的全局设置/README.md',
  },
  预设条目更多按钮: {
    name: '预设条目更多按钮: 一键新增预设条目',
    content: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/预设条目更多按钮/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/预设条目更多按钮/README.md',
  },
  自动开启角色卡局部正则: {
    name: '自动开启角色卡局部正则',
    content: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/自动开启角色卡局部正则/index.js',
    info: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/自动开启角色卡局部正则/README.md',
  },
};

function loadScriptContent(content: string): string {
  return isUrl(content) ? `import '${content}'` : content;
}

async function loadScriptInfo(info: string): Promise<string> {
  return isUrl(info) ? (await fetch(info)).text() : info;
}

/**
 * 创建单个默认脚本
 * @param script_id 脚本ID
 * @returns 脚本对象
 */
export async function createDefaultScript(script_id: string): Promise<any> {
  const config = DEFAULT_SCRIPT_CONFIGS[script_id];
  if (!config) {
    log.error(`[ScriptManager] 未找到脚本配置: ${script_id}`);
    return null;
  }

  try {
    return {
      id: script_id,
      name: config.name,
      content: loadScriptContent(config.content),
      info: await loadScriptInfo(config.info),
      enabled: false,
      buttons: [],
      data: {},
    };
  } catch (error) {
    log.error(`[ScriptManager] 创建默认脚本失败: ${script_id}:`, error);
    return null;
  }
}

/**
 * 创建指定类型的默认脚本
 * @param type 脚本类型
 * @returns 脚本对象
 */
export async function createScript(type: keyof typeof DEFAULT_SCRIPT_CONFIGS): Promise<any> {
  return (await createDefaultScript(type)) || {};
}

/**
 * 创建所有默认脚本
 * @returns 默认脚本数组
 */
export async function createDefaultScripts(): Promise<any[]> {
  toastr.info('正在加载默认脚本...');
  const result = await Promise.all(
    Object.keys(DEFAULT_SCRIPT_CONFIGS).map(script_id => createDefaultScript(script_id)),
  );
  if (result.some(item => item === null)) {
    toastr.error('创建默认脚本失败');
  } else {
    toastr.success('创建默认脚本成功');
  }
  return result;
}
