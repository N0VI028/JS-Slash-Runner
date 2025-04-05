import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';

import { updateFrontendVersion } from '../function/frontend_version';
import { extensionFolderPath } from './extension_variables';

/**
 * 从 GitLab 仓库获取指定文件的原始内容 (支持项目 ID 或项目路径)
 * @param filePath 文件在仓库中的路径 (会被自动 URL 编码)
 * @returns 返回文件内容的 Promise<string>
 */
async function fetchRawFileContentFromGitLab(filePath: string): Promise<string> {
  const encodedFilePath = encodeURIComponent(filePath);
  const url = `https://${GITLAB_INSTANCE_URL}/api/v4/projects/${GITLAB_PROJECT_PATH}/repository/files/${encodedFilePath}/raw?ref=${GITLAB_BRANCH}`;

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
    console.error('[TavernHelper] 获取 GitLab 文件内容时出错:', error);
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
    console.error('[TavernHelper] 解析版本文件内容时出错:', error);

    if (error instanceof SyntaxError) {
      throw new Error(`[TavernHelper] 无法将文件内容解析为 JSON: ${error.message}`);
    }

    throw new Error(
      `[TavernHelper] 无法从文件内容中解析版本号: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
      console.warn(`[TavernHelper] 版本号 "${versionA}" 或 "${versionB}" 包含非数字部分，可能导致比较不准确。`);
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
    console.error(`读取文件 ${filePath} 失败:`, error);
    throw error;
  }
}

const GITLAB_INSTANCE_URL = 'gitlab.com';
const GITLAB_PROJECT_PATH = 'novi028/JS-Slash-Runner';
const GITLAB_BRANCH = 'main';
const VERSION_FILE_PATH_GITLAB = 'manifest.json';
const CHANGELOG_FILE_PATH_GITLAB = '/doc/CHANGELOG.md';
export const VERSION_FILE_PATH = `/scripts/extensions/${extensionFolderPath}/manifest.json`;
let CURRENT_VERSION: string;
let LATEST_VERSION: string;

export async function runCheckWithPath() {
  try {
    CURRENT_VERSION = await getFileContentByPath(VERSION_FILE_PATH);

    const content = await fetchRawFileContentFromGitLab(VERSION_FILE_PATH_GITLAB);

    const latestVersion = parseVersionFromFile(content);
    LATEST_VERSION = latestVersion;
    console.info(`获取到的最新版本: ${latestVersion}`);
    const currentVersion = parseVersionFromFile(CURRENT_VERSION);

    const comparisonResult = compareSemVer(latestVersion, currentVersion);

    if (comparisonResult > 0) {
      console.info(`[JS-Slash-Runner] 需要更新！最新版本 ${latestVersion} > 当前版本 ${currentVersion}`);
      return true;
    } else if (comparisonResult === 0) {
      console.info(`[JS-Slash-Runner] 当前版本 ${currentVersion} 已是最新。`);
      return false;
    } else {
      console.warn(`[TavernHelper] 当前版本 ${currentVersion} 比远程版本 ${latestVersion} 还新？`);
      return false;
    }
  } catch (error) {
    console.error('[TavernHelper] 版本检查失败:', error);
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
}

/**
 * 解析变更日志内容，提取两个版本之间的日志
 * @param changelogContent 变更日志的完整内容
 * @param currentVersion 当前版本号
 * @param latestVersion 最新版本号
 * @returns 两个版本之间的日志内容
 */
function parseChangelogBetweenVersions(
  changelogContent: string,
  currentVersion: string,
  latestVersion: string,
): string {
  // 查找所有版本标题
  const versionRegex = /##\s*([0-9]+\.[0-9]+\.[0-9]+)/g;
  const matches = [...changelogContent.matchAll(versionRegex)];

  if (matches.length === 0) {
    return '无法找到版本日志。';
  }

  // 比较当前版本和最新版本
  const comparisonResult = compareSemVer(latestVersion, currentVersion);

  if (comparisonResult <= 0) {
    // 当前版本大于或等于最新版本，只返回最新版本的日志
    const latestVersionMatch = matches.find(match => match[1] === latestVersion);
    if (!latestVersionMatch) {
      return `无法找到版本 ${latestVersion} 的日志。`;
    }

    const startIndex = latestVersionMatch.index;
    const nextVersionMatch = matches.find(match => match.index > startIndex);
    const endIndex = nextVersionMatch ? nextVersionMatch.index : changelogContent.length;

    return changelogContent.substring(startIndex, endIndex).trim();
  } else {
    // 当前版本小于最新版本，返回当前版本之后的所有更新日志
    const currentVersionMatch = matches.find(match => match[1] === currentVersion);
    if (!currentVersionMatch) {
      return `无法找到版本 ${currentVersion} 的日志。`;
    }

    const startIndex = currentVersionMatch.index;
    return changelogContent.substring(startIndex).trim();
  }
}

/**
 * 弹出changeLog的popup
 */
export async function handleUpdateButton() {
  const changelogContent = await fetchRawFileContentFromGitLab(CHANGELOG_FILE_PATH_GITLAB);
  if (LATEST_VERSION === undefined) {
    LATEST_VERSION = parseVersionFromFile(await fetchRawFileContentFromGitLab(VERSION_FILE_PATH_GITLAB));
  }

  if (CURRENT_VERSION === undefined) {
    CURRENT_VERSION = parseVersionFromFile(await getFileContentByPath(VERSION_FILE_PATH));
  }

  const logs = parseChangelogBetweenVersions(changelogContent, CURRENT_VERSION, LATEST_VERSION);
  const result = await callGenericPopup(logs, POPUP_TYPE.CONFIRM, '', { okButton: 'Yes' });
  if (result) {
    await updateFrontendVersion();
  }
}
