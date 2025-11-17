import { parent_jquery_url, predefine_url } from '@/iframe/script_url';
import third_party from '@/iframe/third_party_script.html?raw';

// 由于 vue 内使用 `</script>` 存在 bug, 不得不分开写
export function createSrcContent(content: string, use_blob_url: boolean) {
  return `<html>
<head>
<script src="${parent_jquery_url}"></script>
${third_party}
${use_blob_url ? `<base href="${window.location.origin}"/>` : ''}
<script src="${predefine_url}"></script>
<script src="https://testingcf.jsdelivr.net/gh/N0VI028/JS-Slash-Runner/src/iframe/node_modules/log.js"></script>
</head>
<body>
<script type="module">
${content}
</script>
</body>
</html>
`;
}
