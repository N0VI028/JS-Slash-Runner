/** 检查当前用户是否为管理员, 只有管理员能更新全局扩展 */
declare function isAdmin(): boolean;

/** 获取酒馆助手扩展 id */
declare function getTavernHelperExtensionId(): string;

/**
 * 获取已安装扩展的类型
 * - `'local'`: 本地扩展, 仅当前用户可用
 * - `'global'`: 全局扩展, 酒馆所有用户可用
 * - `'system'`: 酒馆内置扩展, 如正则等
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 */
declare function getExtensionType(extension_id: string): 'local' | 'global' | 'system' | null;

type ExtensionInstallationInfo = {
  current_branch_name: string;
  current_commit_hash: string;
  is_up_to_date: boolean;
  remote_url: string;
};

/**
 * 获取扩展安装信息
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 */
declare function getExtensionInstallationInfo(extension_id: string): Promise<ExtensionInstallationInfo | null>;

/**
 * 检查是否已安装某一扩展
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 *
 * @example
 * // 检查是否已安装酒馆助手
 * const is_installed = isInstalledExtension(getTavernHelperExtensionId());
 */
declare function isInstalledExtension(extension_id: string): boolean;

/**
 * 安装扩展; 新安装的扩展需要刷新页面 (`triggerSlash('/reload-page')`) 才生效
 *
 * @param url 扩展 URL
 * @param type 要安装成的扩展类型
 *   - `'local'`: 本地扩展, 仅当前用户可用
 *   - `'global'`: 全局扩展, 酒馆所有用户可用
 * @returns 对安装的响应情况
 *
 * @example
 * // 安装酒馆助手
 * const response = await installExtension('https://github.com/n0vi028/JS-Slash-Runner', 'local');
 * if (response.ok) {
 *   toastr.success(`成功安装酒馆助手, 准备刷新页面以生效...`);
 *   _.delay(() => triggerSlash('/reload-page'), 3000);
 * }
 */
declare function installExtension(url: string, type: 'local' | 'global'): Promise<Response>;

/**
 * 卸载扩展; 卸载后需要刷新页面 (`triggerSlash('/reload-page')`) 才生效
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 *
 * @example
 * // 卸载酒馆助手
 * const response = await uninstallExtension('JS-Slash-Runner');
 * if (response.ok) {
 *   toastr.success(`成功卸载酒馆助手, 准备刷新页面以生效...`);
 *   _.delay(() => triggerSlash('/reload-page'), 3000);
 * }
 */
declare function uninstallExtension(extension_id: string): Promise<Response>;

/**
 * 重新安装扩展; 重新安装后需要刷新页面 (`triggerSlash('/reload-page')`) 才生效
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 *
 * @example
 * // 重新安装酒馆助手
 * const response = await reinstallExtension('JS-Slash-Runner');
 * if (response.ok) {
 *   toastr.success(`成功重新安装酒馆助手, 准备刷新页面以生效...`);
 *   _.delay(() => triggerSlash('/reload-page'), 3000);
 * }
 */
declare function reinstallExtension(extension_id: string): Promise<Response>;

/**
 * 更新扩展; 更新后需要刷新页面 (`triggerSlash('/reload-page')`) 才生效
 *
 * @param extension_id 扩展 id, 一般是扩展文件夹名
 *
 * @example
 * // 更新酒馆助手
 * const response = await updateExtension('JS-Slash-Runner');
 * if (response.ok) {
 *   toastr.success(`成功更新酒馆助手, 准备刷新页面以生效...`);
 *   _.delay(() => triggerSlash('/reload-page'), 3000);
 * }
 */
declare function updateExtension(extension_id: string): Promise<Response>;
