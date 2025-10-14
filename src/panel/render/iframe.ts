import { predefine_url } from '@/iframe/script_url';
import third_party from '@/iframe/third_party_message.html?raw';
import { preprocessIframeHTML } from '@/panel/render/preprocess_iframe';

// 由于 vue 内使用 `</script>` 存在 bug, 不得不分开写
export function createSrcContent(content: string, use_blob_url: boolean) {
  // 先进行头像路径和 min-height: vh 的处理
  const { content: processed, headInjection } = preprocessIframeHTML(content);

  return `<html>
<head>
${third_party}
${use_blob_url ? `<base href="${window.location.origin}"/>` : ''}
<script src="${predefine_url}"></script>
<script>
  (function () {
    function notify() {
      try {
        var fid = (window.frameElement && window.frameElement.id) || undefined;
        parent.postMessage({ type: 'TH_DOM_CONTENT_LOADED', frameId: fid, ts: Date.now() }, '*');
        try { console.log('[TH][iframe-child] DOMContentLoaded', fid); } catch (e) {}
      } catch (e) {
        // 忽略跨域或环境限制导致的异常
      }
    }
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      // 若在脚本注入前已进入解析完成状态，立即补发一次
      notify();
    } else {
      document.addEventListener('DOMContentLoaded', notify, { once: true });
    }
  })();
</script>
${headInjection}
</head>
<body>
${processed}
</body>
</html>
`;
}
