import { adjust_iframe_height_url, adjust_viewport_url, predefine_url } from '@/iframe/script_url';
import third_party from '@/iframe/third_party_message.html?raw';
import { getCharAvatarPath, getUserAvatarPath } from '@/util/tavern';

function replaceVhInContent(content: string): string {
  const has_css_min_vh = /min-height\s*:\s*[^;{}]*\d+(?:\.\d+)?vh/gi.test(content);
  const has_inline_style_vh = /style\s*=\s*(["'])[\s\S]*?min-height\s*:\s*[^;]*?\d+(?:\.\d+)?vh[\s\S]*?\1/gi.test(
    content,
  );
  const has_js_vh =
    /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?vh)(\2)/gi.test(content) ||
    /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?vh)(\3\s*\))/gi.test(content);

  if (!has_css_min_vh && !has_inline_style_vh && !has_js_vh) {
    return content;
  }

  const convertVhToVariable = (value: string) =>
    value.replace(/(\d+(?:\.\d+)?)vh\b/gi, (match, value) => {
      const parsed = parseFloat(value);
      if (!isFinite(parsed)) {
        return match;
      }
      const VARIABLE_EXPRESSION = `var(--TH-viewport-height)`;
      if (parsed === 100) {
        return VARIABLE_EXPRESSION;
      }
      return `calc(${VARIABLE_EXPRESSION} * ${parsed / 100})`;
    });

  // 1) CSS 声明块 (包括 <style> 中或内联样式串) 中: `min-height: ...vh`
  content = content.replace(
    /(min-height\s*:\s*)([^;{}]*?\d+(?:\.\d+)?vh)(?=\s*[;}])/gi,
    (_m, prefix: string, value: string) => {
      return `${prefix}${convertVhToVariable(value)}`;
    },
  );

  // 2) 行内 `style="min-height: ...vh"`
  content = content.replace(
    /(style\s*=\s*(["']))([^"'"]*?)(\2)/gi,
    (match, prefix: string, _quote: string, styleContent: string, suffix: string) => {
      if (!/min-height\s*:\s*[^;]*vh/i.test(styleContent)) return match;
      const replaced = styleContent.replace(
        /(min-height\s*:\s*)([^;]*?\d+(?:\.\d+)?vh)/gi,
        (_m, p1: string, p2: string) => {
          return `${p1}${convertVhToVariable(p2)}`;
        },
      );
      return `${prefix}${replaced}${suffix}`;
    },
  );

  // 3) JavaScript: `element.style.minHeight = "...vh"`
  content = content.replace(
    /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?)(\2)/gi,
    (match, prefix: string, _q: string, val: string, suffix: string) => {
      if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
      const converted = convertVhToVariable(val);
      return `${prefix}${converted}${suffix}`;
    },
  );

  // 4) JavaScript: `element.style.setProperty('min-height', "...vh")`
  content = content.replace(
    /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?)(\3\s*\))/gi,
    (match, prefix: string, _q1: string, _q2: string, val: string, suffix: string) => {
      if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
      const converted = convertVhToVariable(val);
      return `${prefix}${converted}${suffix}`;
    },
  );

  return content;
}

// 由于 vue 内使用 `</script>` 存在 bug, 不得不分开写
export function createSrcContent(content: string, use_blob_url: boolean) {
  content = replaceVhInContent(content);

  return `
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${use_blob_url ? `<base href="${window.location.origin}"/>` : ''}
<style>
*,*::before,*::after{box-sizing:border-box;}
html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;}
.user_avatar,.user-avatar{background-image:url('${getUserAvatarPath()}')}
.char_avatar,.char-avatar{background-image:url('${getCharAvatarPath()}')}
</style>
${third_party}
<script src="${predefine_url}"></script>
<script src="https://testingcf.jsdelivr.net/gh/N0VI028/JS-Slash-Runner/src/iframe/node_modules/log.js"></script>
<script src="${adjust_viewport_url}"></script>
<script src="${adjust_iframe_height_url}"></script>
</head>
<body>
${content}
</body>
</html>
`;
}
