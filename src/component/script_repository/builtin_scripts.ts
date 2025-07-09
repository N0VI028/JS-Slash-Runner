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
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/标签化/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/标签化/README.md',
  },
  样式加载: {
    name: '样式加载: 像酒馆主题自定义 css 一样编写角色卡 css',
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/样式加载/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/样式加载/README.md',
  },
  预设防误触: {
    name: '预设防误触',
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/预设防误触/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/预设防误触/README.md',
  },
  资源预载: {
    name: '资源预载: 提前缓存角色卡的插图',
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/资源预载/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/资源预载/README.md',
  },
  自动关闭前端卡不兼容选项: {
    name: '自动关闭前端卡不兼容选项',
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/自动关闭前端卡不兼容选项/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/自动关闭前端卡不兼容选项/README.md',
  },
  自动开启角色卡局部正则: {
    name: '自动开启角色卡局部正则',
    content: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/自动开启角色卡局部正则/index.js',
    info: 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/自动开启角色卡局部正则/README.md',
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
