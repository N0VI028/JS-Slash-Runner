/**
 * 默认脚本ID常量
 */
export const DEFAULT_SCRIPT_IDS = {
  AUTO_FIX_OPTIONS: 'default_auto_fix_options',
  AUTO_OPEN_SCOPE_REGEX: 'default_auto_open_scope_regex',
  AUTO_TOGGLE_BY_PRESET: 'default_auto_toggle_by_preset',
  AUTO_IMPORT_QR: 'default_auto_import_qr',
};

/**
 * 默认脚本配置
 * 包含每个默认脚本的基本信息
 */
export const DEFAULT_SCRIPT_CONFIGS = {
  [DEFAULT_SCRIPT_IDS.AUTO_FIX_OPTIONS]: {
    name: '自动关闭前端卡不兼容选项',
    scriptId: 'auto_fix_options',
  },
  [DEFAULT_SCRIPT_IDS.AUTO_OPEN_SCOPE_REGEX]: {
    name: '自动开启角色卡局部正则',
    scriptId: 'auto_open_scope_regex',
  },
  [DEFAULT_SCRIPT_IDS.AUTO_TOGGLE_BY_PRESET]: {
    name: '随预设或API自动切换正则、世界书、提示词条目',
    scriptId: 'auto_toggle_by_preset',
  },
  [DEFAULT_SCRIPT_IDS.AUTO_IMPORT_QR]: {
    name: '自动导入角色卡快速回复',
    scriptId: 'auto_import_qr',
  },
};

/**
 * 加载脚本内容
 * @param scriptId 脚本ID
 * @returns 脚本内容
 */
export async function loadScriptContent(scriptId: string): Promise<string> {
  try {
    const response = await fetch(
      `/scripts/extensions/third-party/JS-Slash-Runner/src/component/script_repository/default_scripts/${scriptId}.js`,
    );
    if (!response.ok) {
      throw new Error(`加载默认脚本内容失败: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`加载默认脚本内容失败: ${scriptId}:`, error);
    return '';
  }
}

/**
 * 加载脚本信息
 * @param scriptId 脚本ID
 * @returns 脚本信息HTML
 */
export async function loadScriptInfo(scriptId: string): Promise<string> {
  try {
    const response = await fetch(
      `/scripts/extensions/third-party/JS-Slash-Runner/src/component/script_repository/default_scripts/${scriptId}.md`,
    );
    if (!response.ok) {
      throw new Error(`加载默认脚本信息失败: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`加载默认脚本信息失败: ${scriptId}:`, error);
    return '';
  }
}

/**
 * 创建单个默认脚本
 * @param scriptId 脚本ID
 * @returns 脚本对象
 */
export async function createDefaultScript(scriptId: string): Promise<any> {
  const config = DEFAULT_SCRIPT_CONFIGS[scriptId];
  if (!config) {
    console.error(`未找到脚本配置: ${scriptId}`);
    return null;
  }

  try {
    return {
      id: scriptId,
      name: config.name,
      content: await loadScriptContent(config.scriptId),
      info: await loadScriptInfo(config.scriptId),
      enabled: false,
    };
  } catch (error) {
    console.error(`创建默认脚本失败: ${scriptId}:`, error);
    return null;
  }
}

/**
 * 创建指定类型的默认脚本
 * @param type 脚本类型
 * @returns 脚本对象
 */
export async function createScript(type: keyof typeof DEFAULT_SCRIPT_IDS): Promise<any> {
  return (await createDefaultScript(DEFAULT_SCRIPT_IDS[type])) || {};
}

/**
 * 创建所有默认脚本
 * @returns 默认脚本数组
 */
export async function createDefaultScripts(): Promise<any[]> {
  const scripts: any[] = [];

  for (const scriptId of Object.values(DEFAULT_SCRIPT_IDS)) {
    const script = await createDefaultScript(scriptId);
    if (script) {
      scripts.push(script);
    }
  }

  return scripts;
}
