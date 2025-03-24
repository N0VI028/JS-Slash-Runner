import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/_impl';

import { getRequestHeaders } from '@sillytavern/script';
import { t } from '@sillytavern/scripts/i18n';

interface IframeUpdateFrontendVersion extends IframeMessage {
  request: '[FrontendVersion][updateFrontendVersion]';
  text: string;
}

export function registerIframeFrontendVersionHandler() {
  registerIframeHandler(
    '[FrontendVersion][updateFrontendVersion]',
    async (event: MessageEvent<IframeUpdateFrontendVersion>): Promise<boolean> => {
      const extension_name = 'JS-Slash-Runner';

      const response = await fetch('/api/extensions/update', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ extensionName: extension_name }),
      });

      if (!response.ok) {
        const text = await response.text();
        toastr.error(text || response.statusText, t`更新前端助手失败`, { timeOut: 5000 });
        console.error(`${getLogPrefix(event)}更新前端助手失败: ${text}`);
        return false;
      }

      const data = await response.json();
      if (data.isUpToDate) {
        console.info(`${getLogPrefix(event)}前端助手已是最新版本, 无需更新`);
      } else {
        toastr.success(t`成功更新前端助手为 ${data.shortCommitHash}`, t`请刷新页面`);
        console.info(`${getLogPrefix(event)}成功更新前端助手为  ${data.shortCommitHash}, 请刷新页面`);
      }
      return true;
    },
  );
}
