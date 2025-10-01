import { predefine_url } from '@/iframe/script_url';
import third_party from '@/iframe/third_party_message.html?raw';

// 由于 vue 内使用 `</script>` 存在 bug, 不得不分开写
export function createSrcContent(content: string, use_blob_url: boolean) {
  return `<html>
<head>
${third_party}
${use_blob_url ? `<base href="${window.location.origin}"/>` : ''}
<script src="${predefine_url}"></script>
</head>
<body>
${content}
</body>
</html>
`;
}
