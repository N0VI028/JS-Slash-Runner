/**
 * 默认脚本配置类型
 */
type ScriptConfig = {
  name: string;
};

/**
 * 默认脚本配置
 * 包含每个默认脚本的基本信息
 */
export const DEFAULT_SCRIPT_CONFIGS: Record<string, ScriptConfig> = {
  auto_fix_options: {
    name: '自动关闭前端卡不兼容选项',
  },
  auto_open_scope_regex: {
    name: '自动开启角色卡局部正则',
  },
  auto_toggle_by_preset: {
    name: '随预设或API自动切换正则、世界书、提示词条目',
  },
  auto_import_qr: {
    name: '自动导入角色卡快速回复',
  },
  resource_preload: {
    name: '资源预加载',
  },
  auto_install_plugins: {
    name: '自动安装角色卡插件',
  },
};

/**
 * 加载脚本内容
 * @param scriptId 脚本ID
 * @returns 脚本内容
 */
export async function loadScriptContent(scriptId: string): Promise<string> {
  try {
    // 优先尝试加载TypeScript文件
    try {
      const tsModule = await import(
        `./${scriptId}/${scriptId}.ts?raw`
      );
      return tsModule.default;
    } catch (tsError) {
      // 如果TypeScript文件不存在，尝试加载JavaScript文件
      const jsModule = await import(
        `./${scriptId}/${scriptId}.js?raw`
      );
      return jsModule.default;
    }
  } catch (error) {
    console.error(`[Script] 加载默认脚本内容失败: ${scriptId}:`, error);
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
      `/scripts/extensions/third-party/JS-Slash-Runner/src/component/script_repository/default_scripts/${scriptId}/${scriptId}.md`,
    );
    if (!response.ok) {
      throw new Error(`[Script] 加载默认脚本信息失败: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`[Script] 加载默认脚本信息失败: ${scriptId}:`, error);
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
    console.error(`[Script] 未找到脚本配置: ${scriptId}`);
    return null;
  }

  try {
    return {
      id: scriptId,
      name: config.name,
      content: await loadScriptContent(scriptId),
      info: await loadScriptInfo(scriptId),
      enabled: false,
    };
  } catch (error) {
    console.error(`[Script] 创建默认脚本失败: ${scriptId}:`, error);
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
  const scripts: any[] = [];

  for (const scriptId of Object.keys(DEFAULT_SCRIPT_CONFIGS)) {
    const script = await createDefaultScript(scriptId);
    if (script) {
      scripts.push(script);
    }
  }

  return scripts;
}
