import { getRequestHeaders } from '@sillytavern/script';

export async function getTavernFile(path: string): Promise<Response> {
  return fetch(path, { cache: 'no-store' });
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
  const message = await response.text();
  return message || `${fallback}（HTTP ${response.status}）`;
}

export async function uploadTavernFile(filename: string, base64: string): Promise<string> {
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ name: filename, data: base64 }),
  });
  if (!response.ok) {
    throw new Error(await readResponseError(response, '文件上传失败'));
  }
  const payload = (await response.json()) as { path?: string };
  if (!payload.path) {
    throw new Error('文件上传响应缺少路径');
  }
  return payload.path.replace(/^(\/)?users\/files\//, '');
}

export async function deleteTavernFile(filename: string): Promise<boolean> {
  const response = await fetch('/api/files/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ path: `/users/files/${filename}` }),
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(await readResponseError(response, '文件删除失败'));
  }
  return true;
}
