import { extensionFolderPath, extensionName } from '@/util/extension_variables';
import { renderMarkdown } from '@/util/render_markdown';

import { getRequestHeaders } from '@sillytavern/script';
import { extensionTypes } from '@sillytavern/scripts/extensions';
import { t } from '@sillytavern/scripts/i18n';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';

import log from 'loglevel';

const GITLAB_INSTANCE_URL = 'gitlab.com';
const GITLAB_PROJECT_PATH = 'novi028/JS-Slash-Runner';
const GITLAB_BRANCH = 'main';
const VERSION_FILE_PATH_GITLAB = 'manifest.json';
const CHANGELOG_FILE_PATH_GITLAB = 'CHANGELOG.md';
export const VERSION_FILE_PATH = `/scripts/extensions/${extensionFolderPath}/manifest.json`;
let CURRENT_VERSION: string;
let LATEST_VERSION: string;
let CHANGELOG_CONTENT: string;

/**
 * 从 GitLab 仓库获取指定文件的原始内容 (支持项目 ID 或项目路径)
 * @param filePath 文件在仓库中的路径 (会被自动 URL 编码)
 * @returns 返回文件内容的 Promise<string>
 */
async function fetchRawFileContentFromGitLab(filePath: string): Promise<string> {
  const idOrPathForUrl =
    typeof GITLAB_PROJECT_PATH === 'string' && GITLAB_PROJECT_PATH.includes('/')
      ? encodeURIComponent(GITLAB_PROJECT_PATH)
      : GITLAB_PROJECT_PATH;
  const encodedFilePath = encodeURIComponent(filePath);
  const url = `https://${GITLAB_INSTANCE_URL}/api/v4/projects/${idOrPathForUrl}/repository/files/${encodedFilePath}/raw?ref=${GITLAB_BRANCH}`;

  const headers: HeadersInit = {
    'Cache-Control': 'no-cache',
  };

  try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        /* ignore */
      }
      throw new Error(
        `[TavernHelper] 无法获取 GitLab 文件: ${response.status} ${response.statusText}. URL: ${url}. Response: ${errorBody}`,
      );
    }
    const content = await response.text();
    return content.trim();
  } catch (error) {
    log.error('[TavernHelper] 获取 GitLab 文件内容时出错:', error);
    throw error;
  }
}

/**
 * 从 JSON 文件内容中解析 'version' 字段的值
 * @param content 文件内容字符串
 * @returns 解析出的版本号字符串 (例如 "2.5.5")
 * @throws 如果内容不是有效的 JSON，或者 'version' 字段不存在或不是字符串，则抛出错误
 */
export function parseVersionFromFile(content: string): string {
  try {
    const data = JSON.parse(content);

    if (data && typeof data.version === 'string') {
      return data.version;
    } else {
      throw new Error("[TavernHelper] 在 JSON 数据中未找到有效的 'version' 字段 (必须是字符串类型)");
    }
  } catch (error) {
    log.error('[TavernHelper] 解析版本文件内容时出错:', error);

    if (error instanceof SyntaxError) {
      throw new Error(`[TavernHelper] 无法将文件内容解析为 JSON: ${error.message}`);
    }

    throw new Error(
      `[TavernHelper] 无法从文件内容中解析版本号: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 获取当前版本号
 * @param path 版本号文件路径
 * @returns 当前版本号
 */
export async function getCurrentVersion(path: string) {
  CURRENT_VERSION = parseVersionFromFile(await getFileContentByPath(path));
  return CURRENT_VERSION;
}

/**
 * 比较两个语义化版本号 (Semantic Versioning - Major.Minor.Patch)
 * @param versionA 版本号字符串 A (例如 "2.5.5")
 * @param versionB 版本号字符串 B (例如 "1.0.0")
 * @returns
 * - 正数 (> 0): 如果 versionA > versionB (A 更新)
 * - 负数 (< 0): 如果 versionA < versionB (B 更新)
 * - 0:        如果 versionA == versionB (版本相同)
 * 注意: 这个基础比较器不处理预发布标签 (-beta) 或构建元数据 (+build)。
 * 它会将 "2.5.5-beta" 和 "2.5.5" 在此比较中视为相等。
 */
function compareSemVer(versionA: string, versionB: string): number {
  const cleanVersionA = versionA.split('-')[0].split('+')[0];
  const cleanVersionB = versionB.split('-')[0].split('+')[0];

  const partsA = cleanVersionA.split('.').map(Number);
  const partsB = cleanVersionB.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    // 如果某个版本号部分缺失 (例如 "1.2" vs "1.2.3")，则视为 0
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (isNaN(numA) || isNaN(numB)) {
      log.warn(`[TavernHelper] 版本号 "${versionA}" 或 "${versionB}" 包含非数字部分，可能导致比较不准确。`);
      return 0;
    }

    if (numA > numB) {
      return 1;
    }
    if (numA < numB) {
      return -1;
    }
  }

  return 0;
}

export async function getFileContentByPath(filePath: string) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    return content;
  } catch (error) {
    log.error(`读取文件 ${filePath} 失败:`, error);
    throw error;
  }
}

export async function runCheckWithPath() {
  try {
    LATEST_VERSION = parseVersionFromFile(await fetchRawFileContentFromGitLab(VERSION_FILE_PATH_GITLAB));

    const comparisonResult = compareSemVer(LATEST_VERSION, CURRENT_VERSION);

    if (comparisonResult > 0) {
      log.info(`[TavernHelper] 需要更新！最新版本 ${LATEST_VERSION} > 当前版本 ${CURRENT_VERSION}`);
      return true;
    } else if (comparisonResult === 0) {
      log.info(`[TavernHelper] 当前版本 ${CURRENT_VERSION} 已是最新。`);
      return false;
    } else {
      log.warn(`[TavernHelper] 当前版本 ${CURRENT_VERSION} 比远程版本 ${LATEST_VERSION} 还新？`);
      return false;
    }
  } catch (error) {
    log.error('[TavernHelper] 版本检查失败:', error);
    return false;
  }
}

/**
 * 添加版本更新提示元素
 */
export function addVersionUpdateElement() {
  const container = $('#tavern-helper-extension-container .inline-drawer-header b');
  container.append(`
    <span style="color: red; font-size: 12px; font-weight: bold;">
      New!
    </span>
  `);
  $('#version-update-text').closest('.flex-container .alignItemsCenter').append(`
      <div style='background-color: var(--SmartThemeQuoteColor);border-radius: 50px;padding: 0 5px;height: 50%; font-size: calc(var(--mainFontSize) * 0.7);'>
        最新：Ver ${LATEST_VERSION}
      </div>
    `);
}

/**
 * 解析变更日志内容，提取两个版本之间的日志
 * @param changelogContent 变更日志的完整内容
 * @param currentVersion 当前版本号
 * @param latestVersion 最新版本号
 * @returns 两个版本之间的日志内容
 */
export function parseChangelogBetweenVersions(
  changelogContent: string,
  currentVersion: string,
  latestVersion: string,
): string | undefined {
  // 查找所有版本标题，支持多种Markdown标题格式
  // 匹配 ## 版本号 或 # 版本号 或 [版本号] 等格式
  const versionRegex = /(?:^|\n)(?:#{1,3}\s*|\[)([0-9]+\.[0-9]+\.[0-9]+)(?:\]|\s|$)/g;
  const matches = [...changelogContent.matchAll(versionRegex)];

  if (matches.length === 0) {
    toastr.error('无法找到版本日志。');
    return;
  }

  // 比较当前版本和最新版本
  const comparisonResult = compareSemVer(latestVersion, currentVersion);
  let extractedContent = '';

  if (comparisonResult <= 0) {
    // 当前版本大于或等于最新版本，只返回最新版本的日志
    const latestVersionMatch = matches.find(match => match[1] === latestVersion);
    if (!latestVersionMatch) {
      toastr.error('获取更新日志失败');
      return;
    }

    const startIndex = latestVersionMatch.index;
    const nextVersionMatch = matches.find(match => match.index > startIndex);
    const endIndex = nextVersionMatch ? nextVersionMatch.index : changelogContent.length;

    extractedContent = changelogContent.substring(startIndex, endIndex).trim();
  } else {
    const currentVersionMatch = matches.find(match => match[1] === currentVersion);
    if (!currentVersionMatch) {
      toastr.error(`无法找到版本 ${currentVersion} 的日志。`);
      return;
    }

    const latestVersionMatch = matches.find(match => match[1] === latestVersion);
    if (!latestVersionMatch) {
      toastr.error(`无法找到版本 ${latestVersion} 的日志。`);
      return;
    }

    const startIndex = currentVersionMatch.index;
    const endIndex = latestVersionMatch.index;

    extractedContent = changelogContent.substring(startIndex, endIndex).trim();
  }

  return renderMarkdown(extractedContent);
}

/**
 * 弹出changeLog的popup
 */
export async function handleUpdateButton() {
  if (!CHANGELOG_CONTENT) {
    await getChangelog();
  }
  const result = await callGenericPopup(CHANGELOG_CONTENT, POPUP_TYPE.CONFIRM, '', {
    okButton: '更新',
    cancelButton: '取消',
  });
  if (result) {
    toastr.info('更新中……');
    await updateTavernHelper();
  }
}

/**
 * 获取变更日志
 * @returns 两个版本之间的日志内容
 */
export async function getChangelog() {
  toastr.info('获取更新日志中……');
  const changelogContent = await fetchRawFileContentFromGitLab(CHANGELOG_FILE_PATH_GITLAB);
  if (LATEST_VERSION === undefined) {
    LATEST_VERSION = parseVersionFromFile(await fetchRawFileContentFromGitLab(VERSION_FILE_PATH_GITLAB));
  }

  if (CURRENT_VERSION === undefined) {
    CURRENT_VERSION = parseVersionFromFile(await getFileContentByPath(VERSION_FILE_PATH));
  }

  const logs = parseChangelogBetweenVersions(changelogContent, CURRENT_VERSION, LATEST_VERSION);
  if (!logs) {
    toastr.error('无法获取更新日志');
    return;
  } else {
    CHANGELOG_CONTENT = logs;
  }
}

/**
 * 更新酒馆助手
 */
export async function updateTavernHelper() {
  const extensionType = getExtensionType(extensionName);
  const response = await fetch('/api/extensions/update', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ extensionName: extensionName, global: extensionType === 'global' ? true : false }),
  });
  if (!response.ok) {
    const text = await response.text();
    toastr.error(text || response.statusText, t`更新酒馆助手失败`, { timeOut: 5000 });
    log.error(`更新酒馆助手失败: ${text}`);
    return false;
  }

  const data = await response.json();
  if (data.isUpToDate) {
    log.info(`酒馆助手已是最新版本, 无需更新`);
  } else {
    toastr.success(t`成功更新酒馆助手为 ${data.shortCommitHash}, 准备刷新页面以生效...`);
    log.info(`成功更新酒馆助手为  ${data.shortCommitHash}, 准备刷新页面以生效...`);
    setTimeout(() => location.reload(), 3000);
  }
  return true;
}

// 酒馆原代码复制来的
/**
 * Gets the type of an extension based on its external ID.
 * @param {string} externalId External ID of the extension (excluding or including the leading 'third-party/')
 * @returns {string} Type of the extension (global, local, system, or empty string if not found)
 */
function getExtensionType(externalId: string) {
  const id = Object.keys(extensionTypes).find(
    // eslint-disable-next-line no-shadow
    (id: string) => id === externalId || (id.startsWith('third-party') && id.endsWith(externalId)),
  );
  return id ? extensionTypes[id] : 'local';
}

// 旧版更新后用
/**
 *
 */

export async function showNewFeature() {
  let changelogContent = await fetchRawFileContentFromGitLab(CHANGELOG_FILE_PATH_GITLAB);
  changelogContent = changelogContent + '\n\n*前端助手旧版配置已清除，请重新配置扩展设置*';
  const logs = parseChangelogBetweenVersions(changelogContent, '3.0.0', '3.0.0');

  if (logs) {
    const modifiedLogs = logs.replace(/<h2([^>]*)>([^<]*)<\/h2>/g, '<h2$1>酒馆助手 $2</h2>');
    await callGenericPopup(modifiedLogs, POPUP_TYPE.TEXT);
  }
}
