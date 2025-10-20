import { getRequestHeaders } from '@sillytavern/script';
import { extensionTypes } from '@sillytavern/scripts/extensions';
import { isAdmin as isAdminImpl } from '@sillytavern/scripts/user';

export const isAdmin = isAdminImpl;

export function getTavernHelperExtensionId(): string {
  return 'JS-Slash-Runner';
}

export function getExtensionType(extension_id: string): 'local' | 'global' | 'system' | null {
  const result = Object.keys(extensionTypes).find(result => result.endsWith(extension_id));
  return result ? (extensionTypes[result] as 'global' | 'local' | 'system') : null;
}

type ExtensionInstallationInfo = {
  current_branch_name: string;
  current_commit_hash: string;
  is_up_to_date: boolean;
  remote_url: string;
};

export async function getExtensionInstallationInfo(extension_id: string): Promise<ExtensionInstallationInfo | null> {
  const type = getExtensionType(extension_id);
  if (!type) {
    return null;
  }

  const response = await fetch('/api/extensions/version', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      extensionName: extension_id,
      global: type === 'global',
    }),
  });

  return _.mapKeys(await response.json(), (_value, key) => _.snakeCase(key)) as ExtensionInstallationInfo;
}

export function isInstalledExtension(extension_id: string): boolean {
  return getExtensionType(extension_id) !== null;
}

export async function installExtension(url: string, type: 'local' | 'global'): Promise<Response> {
  if (!isAdmin() && type === 'global') {
    return Response.json({ message: '只有管理员才能安装全局扩展' }, { status: 403 });
  }
  const response = await fetch('/api/extensions/install', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ url, global: type === 'global' }),
  });
  return response;
}

export async function uninstallExtension(extension_id: string): Promise<Response> {
  const type = getExtensionType(extension_id);
  if (!type) {
    return Response.json({ message: '扩展不存在' }, { status: 404 });
  }
  if (!isAdmin() && type === 'global') {
    return Response.json({ message: '只有管理员才能卸载全局扩展' }, { status: 403 });
  }
  const response = await fetch('/api/extensions/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ extensionName: extension_id, global: type === 'global' }),
  });
  return response;
}

export async function reinstallExtension(extension_id: string): Promise<Response> {
  const type = getExtensionType(extension_id);
  if (!type) {
    return Response.json({ message: '扩展不存在' }, { status: 404 });
  }
  if (!isAdmin() && type === 'global') {
    return Response.json({ message: '只有管理员才能重新安装全局扩展' }, { status: 403 });
  }
  const status = (await getExtensionInstallationInfo(extension_id))!;
  if (status.is_up_to_date) {
    return Response.json({ message: '扩展已是最新版本' }, { status: 200 });
  }
  const response = await uninstallExtension(extension_id);
  if (!response.ok) {
    return response;
  }
  return installExtension(status.remote_url, type as 'local' | 'global');
}

export async function updateExtension(extension_id: string): Promise<Response> {
  const type = getExtensionType(extension_id);
  if (!type) {
    return Response.json({ message: '扩展不存在' }, { status: 404 });
  }
  if (!isAdmin() && type === 'global') {
    return Response.json({ message: '只有管理员才能更新全局扩展' }, { status: 403 });
  }
  const response = await fetch('/api/extensions/update', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ extensionName: extension_id, global: type === 'global' }),
  });
  return response;
}
