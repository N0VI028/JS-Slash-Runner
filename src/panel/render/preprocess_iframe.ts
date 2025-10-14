import { characters, getThumbnailUrl, this_chid, user_avatar } from '@sillytavern/script';

export const charsPath = '/characters/';
export const getUserAvatarPath = () => `./User Avatars/${user_avatar}`;
export const getCharAvatarPath = () => {
  const thumbnailPath = getThumbnailUrl(
    'avatar',
    characters[this_chid as unknown as number]?.avatar || characters[this_chid as unknown as number]?.name || '',
  );
  const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
  return charsPath + targetAvatarImg;
};

export const VIEWPORT_CSS_VAR = '--th-viewport-height';

export interface PreprocessResult {
  /** 处理后的主体内容（原始 html 片段） */
  content: string;
  /** 需要的 <head> 注入（仅在检测到 min-height: vh 时注入） */
  headInjection: string;
  /** 是否存在需要 vh 适配的场景 */
  needsViewportVar: boolean;
}

/**
 * 将 value 中的 Nvh 转换为基于 CSS 变量的表达式
 */
function convertVhToVar(value: string, initialPx: number): string {
  const varExpr = `var(${VIEWPORT_CSS_VAR}, ${initialPx}px)`;
  return value.replace(/(\d+(?:\.\d+)?)vh\b/gi, (_m, numStr: string) => {
    const num = parseFloat(numStr);
    if (!isFinite(num)) return _m;
    if (num === 100) return varExpr;
    return `calc(${varExpr} * ${num / 100})`;
  });
}

/**
 * 预处理 iframe 内的 html 片段，仅聚焦 min-height: vh 的场景。
 * 说明：
 * - 避免暴力全量替换所有 vh，减少误改；仅在明确 min-height 相关位置替换
 * - 覆盖 CSS 声明、行内 style、以及常见 JS 动态设置字符串
 */
export function preprocessIframeHTML(raw: string): PreprocessResult {
  const parentViewport = window.innerHeight || document.documentElement.clientHeight || 0;

  // 快速探测：是否出现与 min-height 相关的 vh 使用
  const hasCssMinVh = /min-height\s*:\s*[^;{}]*\d+(?:\.\d+)?vh/gi.test(raw);
  const hasInlineStyleVh = /style\s*=\s*(["'])[\s\S]*?min-height\s*:\s*[^;]*?\d+(?:\.\d+)?vh[\s\S]*?\1/gi.test(raw);
  const hasJsVh =
    /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?vh)(\2)/gi.test(raw) ||
    /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?vh)(\3\s*\))/gi.test(raw);

  const needs = hasCssMinVh || hasInlineStyleVh || hasJsVh;
  if (!needs) {
    return { content: raw, headInjection: '', needsViewportVar: false };
  }

  let processed = raw;

  // 1) CSS 声明块（包括 <style> 中或内联样式串）中：min-height: ... vh
  processed = processed.replace(
    /(min-height\s*:\s*)([^;{}]*?\d+(?:\.\d+)?vh)(?=\s*[;}])/gi,
    (_m, prefix: string, value: string) => {
      return `${prefix}${convertVhToVar(value, parentViewport)}`;
    },
  );

  // 2) 行内 style="...min-height: ...vh..."
  processed = processed.replace(
    /(style\s*=\s*(["']))([^"'"]*?)(\2)/gi,
    (match, prefix: string, _quote: string, styleContent: string, suffix: string) => {
      if (!/min-height\s*:\s*[^;]*vh/i.test(styleContent)) return match;
      const replaced = styleContent.replace(
        /(min-height\s*:\s*)([^;]*?\d+(?:\.\d+)?vh)/gi,
        (_m, p1: string, p2: string) => {
          return `${p1}${convertVhToVar(p2, parentViewport)}`;
        },
      );
      return `${prefix}${replaced}${suffix}`;
    },
  );

  // 3) JS 字符串： element.style.minHeight = "...vh"
  processed = processed.replace(
    /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?)(\2)/gi,
    (match, prefix: string, _q: string, val: string, suffix: string) => {
      if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
      const converted = convertVhToVar(val, parentViewport);
      return `${prefix}${converted}${suffix}`;
    },
  );

  // 4) JS 字符串： element.style.setProperty('min-height', "...vh")
  processed = processed.replace(
    /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?)(\3\s*\))/gi,
    (match, prefix: string, _q1: string, _q2: string, val: string, suffix: string) => {
      if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
      const converted = convertVhToVar(val, parentViewport);
      return `${prefix}${converted}${suffix}`;
    },
  );

  // 生成 <head> 注入：设置初始变量 + 监听父窗口消息更新
  const headInjection = [
    `<style>
    :root{${VIEWPORT_CSS_VAR}:${parentViewport}px;}
    html,body{margin:0;padding:0;overflow:hidden!important;max-width:100%!important;box-sizing:border-box}
    .user_avatar,.user-avatar{background-image:url('${getUserAvatarPath()}')}
    .char_avatar,.char-avatar{background-image:url('${getCharAvatarPath()}')}
    </style>`,
    `<script>
    (function(){
    try{ 
      window.addEventListener('message',function(e){
        var d=e && e.data;
        if(d && d.request==='updateViewportHeight' && typeof d.newHeight==='number'){
          document.documentElement.style.setProperty('${VIEWPORT_CSS_VAR}', d.newHeight+'px');
        }
      }, { passive: true });
    }catch(_){}
    })();
    </script>`,
  ].join('');

  return { content: processed, headInjection, needsViewportVar: true };
}
