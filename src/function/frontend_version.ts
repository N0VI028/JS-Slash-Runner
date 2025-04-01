import { getRequestHeaders } from '@sillytavern/script';
import { t } from '@sillytavern/scripts/i18n';

import { extensionName } from '@/util/extension_variables';


/**
 * 更新前端助手
 */
export async function updateFrontendVersion() {
  const response = await fetch('/api/extensions/update', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ extensionName: extensionName }),
  });
  if (!response.ok) {
    const text = await response.text();
    // @ts-ignore
    toastr.error(text || response.statusText, t`更新前端助手失败`, { timeOut: 5000 });
    console.error(`更新前端助手失败: ${text}`);
    return false;
  }

  const data = await response.json();
  if (data.isUpToDate) {
    console.info(`前端助手已是最新版本, 无需更新`);
  } else {
    // @ts-ignore
    toastr.success(t`成功更新前端助手为 ${data.shortCommitHash}`, t`请刷新页面`);
    console.info(`成功更新前端助手为  ${data.shortCommitHash}, 请刷新页面`);
  }
  return true;
}
