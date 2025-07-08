// 保存原始高亮方法
const originalHighlightElement = hljs.highlightElement;

/**
 * 添加前端卡渲染优化设置
 */
export function addRenderingOptimizeSettings() {
  hljs.highlightElement = function () {
    return;
  };
}

/**
 * 移除前端卡渲染优化设置
 */
export function removeRenderingOptimizeSettings() {
  hljs.highlightElement = originalHighlightElement;
}
