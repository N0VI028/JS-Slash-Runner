import { onChatCompletionPromptReady, refreshPromptView, setPromptViewUpdater } from '@/component/prompt_view/service';
import { extensionFolderPath } from '@/util/extension_variables';
import { FloatingDialog } from '@/util/floating_dialog';
import { loadFileToHead } from '@/util/load_file_to_document';

import { event_types, eventSource } from '@sillytavern/script';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import log from 'loglevel';

export const templatePath = `${extensionFolderPath}/src/component/prompt_view/public`;

interface PromptData {
  role: string;
  content: string;
  token: number;
}

interface FindWithContextResult {
  context: {
    start_line: number;
    content: string[];
  };
  matches: Array<{ line_number: number; start_column: number; end_column: number }>;
}

/**
 * 打开提示词查看器浮窗
 */
export async function openPromptViewDialog(): Promise<void> {
  await loadFileToHead(`/scripts/extensions/${templatePath}/style.css`, 'css', 'prompt-view-style');

  const dialog = FloatingDialog.create({
    id: 'prompt-view-dialog',
    title: '提示词发送情况',
    width: '50vw',
    height: '70vh',
    mobileWidth: '80vw',
    mobileHeight: '70vh',
    minWidth: '15vw',
    minHeight: '30vh',
    mobileMinWidth: '70vw',
    mobileMinHeight: '30vh',
    resizable: true,
    draggable: true,
    collapsible: true,
    onClose: () => {
      eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
      setPromptViewUpdater(null);
      $(`style#prompt-view-style`).remove();
    },
  });

  if (!dialog) {
    return;
  }

  const content = dialog.render();

  const contentTemplate = await renderExtensionTemplateAsync(`${templatePath}`, 'prompt_view_content');
  const $contentHtml = $(contentTemplate);

  content.append($contentHtml);

  function bindFreshHandler(scope: JQuery<HTMLElement>) {
    scope.find('#prompt-view-status-fresh').on('click', function () {
      const $icon = $(this);

      $icon.addClass('rotating');

      setTimeout(() => {
        $icon.removeClass('rotating');
      }, 2000);

      refreshPromptView();
    });
  }

  bindFreshHandler($contentHtml);

  /**
   * 应用角色筛选逻辑
   * @param scope 作用域元素
   * @param enabledRoles 启用的角色集合
   * @returns 筛选结果统计
   */
  function applyRoleFilters(scope: JQuery<HTMLElement>, enabledRoles: Set<string>) {
    let totalCount = 0;
    const $items = scope.find('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);
      totalCount++;

      const roleElement = $item.find('.prompt-item-role');
      if (roleElement.length === 0) {
        $item.attr('data-role-visible', 'false');
        return;
      }

      const itemRole = roleElement.text().trim();
      const roleMatches = enabledRoles.has(itemRole);

      $item.attr('data-role-visible', roleMatches ? 'true' : 'false');
    });

    return { totalCount };
  }

  /**
   * 应用搜索逻辑
   * @param scope 作用域元素
   * @param searchValue 搜索值
   * @param isRegex 是否使用正则表达式
   * @param useCompactMode 是否使用精简模式（仅显示匹配部分前后3行）
   */
  function applySearchWithCompactMode(
    scope: JQuery<HTMLElement>,
    searchValue: string,
    isRegex: boolean = false,
    useCompactMode: boolean = false,
  ) {
    if (!searchValue) {
      scope.find('.prompt-view-item').each(function () {
        const $item = $(this);
        $item.attr('data-search-visible', 'true');
        const contentElement = $item.find('.prompt-view-item-content');

        smartRestoreView(contentElement);
      });
      return;
    }

    const $items = scope.find('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);
      const contentElement = $item.find('.prompt-view-item-content');

      let itemContent: string;
      if (contentElement.hasClass('context-view-mode')) {
        itemContent = contentElement.attr('data-original-content') || contentElement.text().trim();
      } else {
        itemContent = contentElement.text().trim();
        if (!contentElement.attr('data-original-content')) {
          contentElement.attr('data-original-content', itemContent);
        }
      }

      let matches = false;

      try {
        if (isRegex) {
          const regex = new RegExp(searchValue, 'gi');
          matches = regex.test(itemContent);
        } else {
          matches = itemContent.toLowerCase().includes(searchValue.toLowerCase());
        }

        if (matches) {
          if (useCompactMode) {
            const contextResults = findWithContext(itemContent, searchValue);
            if (contextResults.length > 0) {
              applyContextView(contentElement, contextResults, searchValue, 3);
            } else {
              smartRestoreView(contentElement, itemContent);
              highlightSearchResults(contentElement, searchValue, isRegex);
            }
          } else {
            smartRestoreView(contentElement, itemContent);
            highlightSearchResults(contentElement, searchValue, isRegex);
          }
        } else {
          smartRestoreView(contentElement, itemContent);
        }
      } catch (error) {
        log.warn('正则表达式无效，回退到普通搜索:', error);
        matches = itemContent.toLowerCase().includes(searchValue.toLowerCase());

        if (matches) {
          if (useCompactMode) {
            const contextResults = findWithContext(itemContent, searchValue);
            if (contextResults.length > 0) {
              applyContextView(contentElement, contextResults, searchValue, 3);
            } else {
              smartRestoreView(contentElement, itemContent);
              highlightSearchResults(contentElement, searchValue, false);
            }
          } else {
            smartRestoreView(contentElement, itemContent);
            highlightSearchResults(contentElement, searchValue, false);
          }
        } else {
          smartRestoreView(contentElement, itemContent);
        }
      }

      $item.attr('data-search-visible', matches ? 'true' : 'false');
    });
  }

  /**
   * 清除所有高亮
   * @param contentElement 内容元素
   */
  function clearHighlights(contentElement: JQuery<HTMLElement>) {
    let content = contentElement.html();
    content = content.replace(/<span class="search-highlight"[^>]*>(.*?)<\/span>/gi, '$1');
    contentElement.html(content);
  }

  /**
   * 高亮搜索结果
   * @param contentElement 内容元素
   * @param keyword 关键词
   * @param isRegex 是否为正则表达式搜索
   */
  function highlightSearchResults(contentElement: JQuery<HTMLElement>, keyword: string, isRegex: boolean = false) {
    clearHighlights(contentElement);

    if (!keyword) return;

    let content = contentElement.html();

    try {
      let regex: RegExp;

      if (isRegex) {
        regex = new RegExp(`(${keyword})`, 'gi');
      } else {
        regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
      }

      content = content.replace(regex, '<span class="search-highlight">$1</span>');
      contentElement.html(content);
    } catch (error) {
      log.warn('高亮关键词时发生错误:', error);
    }
  }

  /**
   * 生成上下文视图
   * @param text 原始文本
   * @param contextResults 上下文搜索结果
   * @param keyword 关键词
   * @param contextLines 前后显示的行数
   * @returns 格式化后的上下文视图HTML
   */
  function generateContextView(
    text: string,
    contextResults: FindWithContextResult[],
    keyword: string,
    contextLines: number = 3,
  ): string {
    if (!keyword || contextResults.length === 0) return text;

    const lines = text.split(/\r?\n/);
    const totalLines = lines.length;

    // 收集所有匹配的行号
    const matchedLines = new Set<number>();
    const highlightMap = new Map<number, Array<{ start: number; end: number }>>();

    contextResults.forEach(result => {
      result.matches.forEach(match => {
        matchedLines.add(match.line_number);

        if (!highlightMap.has(match.line_number)) {
          highlightMap.set(match.line_number, []);
        }
        highlightMap.get(match.line_number)!.push({
          start: match.start_column || 0,
          end: match.end_column || 0,
        });
      });
    });

    // 计算独立的匹配区域，每个区域都有自己的上下文
    const matchRegions: Array<{ start: number; end: number; matchedLines: number[] }> = [];
    const sortedMatchedLines = Array.from(matchedLines).sort((a, b) => a - b);

    type MatchRegion = { start: number; end: number; matchedLines: number[] };
    let currentRegion: MatchRegion | null = null;

    sortedMatchedLines.forEach(lineNum => {
      const regionStart = Math.max(0, lineNum - contextLines);
      const regionEnd = Math.min(totalLines - 1, lineNum + contextLines);

      if (currentRegion && regionStart <= currentRegion.end + 1) {
        currentRegion.end = regionEnd;
        currentRegion.matchedLines.push(lineNum);
      } else {
        if (currentRegion) {
          matchRegions.push(currentRegion);
        }
        currentRegion = {
          start: regionStart,
          end: regionEnd,
          matchedLines: [lineNum],
        };
      }
    });

    if (currentRegion !== null) {
      const region = currentRegion as MatchRegion;
      matchRegions.push(region);
    }

    const visibleLines = new Set<number>();
    matchRegions.forEach(region => {
      for (let i = region.start; i <= region.end; i++) {
        visibleLines.add(i);
      }
    });

    const sortedVisibleLines = Array.from(visibleLines).sort((a, b) => a - b);

    const contextViewLines: string[] = [];
    let lastLine = -1;

    // 检查是否需要在开头添加展开按钮（如果第一个可见行不是文档的第一行）
    const firstVisibleLine = sortedVisibleLines[0];
    if (firstVisibleLine > 0) {
      const initialLinesCount = firstVisibleLine;
      const expandId = `expand-0-${firstVisibleLine - 1}`;
      const startExpandButton = `<div class="context-expand-button" data-start-line="0" data-end-line="${
        firstVisibleLine - 1
      }" data-expand-id="${expandId}">
        <span class="expand-text">展开前面 ${initialLinesCount} 行内容</span>
        <i class="fa-solid fa-chevron-down expand-icon"></i>
      </div>`;
      contextViewLines.push(startExpandButton);
    }

    sortedVisibleLines.forEach(lineNum => {
      // 如果行号不连续，添加展开按钮
      if (lastLine !== -1 && lineNum > lastLine + 1) {
        const hiddenLinesCount = lineNum - lastLine - 1;
        const expandId = `expand-${lastLine + 1}-${lineNum - 1}`;

        const expandButton = `<div class="context-expand-button" data-start-line="${lastLine + 1}" data-end-line="${
          lineNum - 1
        }" data-expand-id="${expandId}">
          <span class="expand-text">展开 ${hiddenLinesCount} 行隐藏内容</span>
          <i class="fa-solid fa-chevron-down expand-icon"></i>
        </div>`;
        contextViewLines.push(expandButton);
      }

      let line = lines[lineNum];

      // 跳过空行
      if (line.trim() === '') {
        lastLine = lineNum;
        return;
      }

      const isMatchedLine = matchedLines.has(lineNum);

      if (isMatchedLine && highlightMap.has(lineNum)) {
        const positions = highlightMap.get(lineNum)!;
        positions.sort((a, b) => b.start - a.start);

        positions.forEach(pos => {
          const before = line.substring(0, pos.start);
          const match = line.substring(pos.start, pos.end);
          const after = line.substring(pos.end);
          line = before + '<span class="search-highlight">' + match + '</span>' + after;
        });
      }

      if (isMatchedLine) {
        contextViewLines.push(`<div class="context-line-matched">${line}</div>`);
      } else {
        contextViewLines.push(line);
      }

      lastLine = lineNum;
    });

    // 检查是否需要在末尾添加展开按钮（如果最后的可见行不是文档的最后一行）
    const lastVisibleLine = sortedVisibleLines[sortedVisibleLines.length - 1];
    if (lastVisibleLine < totalLines - 1) {
      const remainingLinesCount = totalLines - 1 - lastVisibleLine;
      const expandId = `expand-${lastVisibleLine + 1}-${totalLines - 1}`;
      const endExpandButton = `<div class="context-expand-button" data-start-line="${
        lastVisibleLine + 1
      }" data-end-line="${totalLines - 1}" data-expand-id="${expandId}">
        <span class="expand-text">展开剩余 ${remainingLinesCount} 行内容</span>
        <i class="fa-solid fa-chevron-down expand-icon"></i>
      </div>`;
      contextViewLines.push(endExpandButton);
    }

    return contextViewLines.join('\n');
  }

  /**
   * 应用上下文视图显示
   * @param contentElement 内容元素
   * @param contextResults 上下文搜索结果
   * @param keyword 关键词
   * @param contextLines 前后显示的行数
   */
  function applyContextView(
    contentElement: JQuery<HTMLElement>,
    contextResults: FindWithContextResult[],
    keyword: string,
    contextLines: number = 3,
  ) {
    if (!keyword || contextResults.length === 0) return;

    // 清理之前的事件监听器
    contentElement.off('click.contextExpand click.contextCollapse');

    let originalText = contentElement.attr('data-original-content');
    if (!originalText) {
      if (contentElement.hasClass('context-view-mode')) {
        originalText = contentElement.attr('data-original-content') || contentElement.text();
      } else {
        originalText = contentElement.text();
        contentElement.attr('data-original-content', originalText);
      }
    }

    if (!contentElement.hasClass('context-view-mode')) {
      clearHighlights(contentElement);
    }

    const contextViewHtml = generateContextView(originalText, contextResults, keyword, contextLines);

    contentElement.addClass('context-view-mode');
    contentElement.html(contextViewHtml);

    contentElement.off('click.contextExpand').on('click.contextExpand', '.context-expand-button', function (e) {
      e.stopPropagation();
      const $button = $(this);
      const startLine = parseInt($button.attr('data-start-line') || '0');
      const endLine = parseInt($button.attr('data-end-line') || '0');

      if (startLine <= endLine) {
        const lines = originalText.split(/\r?\n/);
        const expandedLines: string[] = [];

        for (let i = startLine; i <= endLine; i++) {
          if (i >= 0 && i < lines.length) {
            const line = lines[i];
            if (line.trim() === '') {
              continue;
            }
            expandedLines.push(line);
          }
        }

        const expandId = $button.attr('data-expand-id') || `expand-${startLine}-${endLine}`;
        const collapseButton = `<div class="context-collapse-button" data-start-line="${startLine}" data-end-line="${endLine}" data-expand-id="${expandId}">
          <span class="collapse-text">收起内容</span>
          <i class="fa-solid fa-chevron-up collapse-icon"></i>
        </div>`;

        const $expandedContainer = $('<div class="context-expanded-container">');

        expandedLines.forEach(lineText => {
          $expandedContainer.append(document.createTextNode(lineText + '\n'));
        });

        $expandedContainer.append($(collapseButton));

        $button.replaceWith($expandedContainer);
      }
    });

    contentElement.off('click.contextCollapse').on('click.contextCollapse', '.context-collapse-button', function (e) {
      e.stopPropagation();
      const $collapseBtn = $(this);
      const startLine = parseInt($collapseBtn.attr('data-start-line') || '0');
      const endLine = parseInt($collapseBtn.attr('data-end-line') || '0');

      const $expandedContainer = $collapseBtn.closest('.context-expanded-container');

      const expandId = $collapseBtn.attr('data-expand-id') || `expand-${startLine}-${endLine}`;
      const hiddenLinesCount = endLine - startLine + 1;
      const newExpandButton = `<div class="context-expand-button" data-start-line="${startLine}" data-end-line="${endLine}" data-expand-id="${expandId}">
        <span class="expand-text">展开 ${hiddenLinesCount} 行隐藏内容</span>
        <i class="fa-solid fa-chevron-down expand-icon"></i>
      </div>`;

      $expandedContainer.replaceWith($(newExpandButton));
    });
  }

  /**
   * 恢复完整视图显示
   * @param contentElement 内容元素
   * @param originalContent 原始内容（可选，如果不提供会从data-original-content属性获取）
   */
  function restoreFullView(contentElement: JQuery<HTMLElement>, originalContent?: string) {
    contentElement.off('click.contextExpand click.contextCollapse');

    contentElement.removeClass('context-view-mode');

    const content = originalContent || contentElement.attr('data-original-content') || contentElement.text();

    contentElement.text(content);
  }

  /**
   * 智能恢复视图：如果是上下文视图则恢复，否则清除高亮
   * @param contentElement 内容元素
   * @param fallbackContent 备用内容（当无法从属性获取原始内容时使用）
   */
  function smartRestoreView(contentElement: JQuery<HTMLElement>, fallbackContent?: string) {
    if (contentElement.hasClass('context-view-mode')) {
      const originalContent = contentElement.attr('data-original-content') || fallbackContent;
      if (originalContent) {
        restoreFullView(contentElement, originalContent);
      }
    } else {
      clearHighlights(contentElement);
    }
  }

  /**
   * 更新显示统计
   * @param scope 作用域元素
   */
  function updateDisplayStats(scope: JQuery<HTMLElement>) {
    let visibleCount = 0;
    let totalCount = 0;
    let visibleTokens = 0;

    const $items = scope.find('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);
      totalCount++;

      const roleVisible = $item.attr('data-role-visible') === 'true';
      const searchVisible = $item.attr('data-search-visible') === 'true';
      const isVisible = roleVisible && searchVisible;

      if (isVisible) {
        $item.show();
        visibleCount++;

        const tokenElement = $item.find('.prompt-item-token');
        const tokenValue = parseInt(tokenElement.text().trim()) || 0;
        visibleTokens += tokenValue;
      } else {
        $item.hide();
      }
    });

    scope.find('.prompt-count').text(`显示 ${visibleCount} / ${totalCount} 条消息`);
    scope.find('.prompt-total-tokens').text(`总Token数: ${visibleTokens}`);
  }

  /**
   * 应用筛选和搜索逻辑
   * @param scope 作用域元素
   */
  function applyFiltersAndSearch(scope: JQuery<HTMLElement>) {
    const searchValue = (scope.find('#prompt-search').val() as string)?.trim() || '';

    const enabledRoles = new Set<string>();
    scope.find('.prompt-filter-checkbox:checked').each(function () {
      const role = $(this).attr('data-role');
      if (role) {
        enabledRoles.add(role);
      }
    });

    const isRegex = searchValue.startsWith('/') && searchValue.endsWith('/') && searchValue.length > 2;
    const actualSearchValue = isRegex ? searchValue.slice(1, -1) : searchValue;

    const useCompactMode = scope.find('#prompt-search-compact-mode').is(':checked');

    applyRoleFilters(scope, enabledRoles);

    applySearchWithCompactMode(scope, actualSearchValue, isRegex, useCompactMode);

    updateDisplayStats(scope);
  }

  function bindFilterHandler(scope: JQuery<HTMLElement>) {
    scope.find('#prompt-filter-icon').on('click', function () {
      const $filterOptions = scope.find('#prompt-filter-options');
      $filterOptions.slideToggle(300);
    });

    scope.find('.prompt-filter-checkbox').on('change', function () {
      applyFiltersAndSearch(scope);
    });

    scope.find('#prompt-search-compact-mode').on('change', function () {
      applyFiltersAndSearch(scope);
    });
  }

  function bindSearchHandler(scope: JQuery<HTMLElement>) {
    let searchTimeout: NodeJS.Timeout | null = null;

    scope.find('#prompt-search').on('input', function () {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      searchTimeout = setTimeout(() => {
        applyFiltersAndSearch(scope);
        searchTimeout = null;
      }, 300);
    });
  }

  bindFilterHandler($contentHtml);
  bindSearchHandler($contentHtml);

  function bindToggleHandlers(scope: JQuery<HTMLElement>) {
    scope.find('.prompt-view-item-header').on('click', function () {
      const $this = $(this);
      const $parent = $this.closest('.prompt-view-item');
      const $cnt = $parent.find('.prompt-view-item-content');
      const $divider = $parent.find('.divider');
      const $icon = $this.find('.prompt-view-item-header-icon');

      $cnt.slideToggle(300);
      $divider.slideToggle(300);
      $icon.toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
    });
  }

  setPromptViewUpdater(async (prompts: PromptData[], totalTokens: number) => {
    const $list = $contentHtml.find('.prompt-list');
    const $empty = $contentHtml.find('.prompt-empty');
    $contentHtml.find('.prompt-total-tokens').text(`总Token数: ${totalTokens}`);
    $contentHtml.find('.prompt-count').text(`共 ${prompts.length} 条消息`);

    if (prompts.length === 0) {
      $list.empty();
      $empty.show();
      return;
    }

    $empty.hide();
    const itemTemplate = await renderExtensionTemplateAsync(`${templatePath}`, 'prompt_view_item');

    $list.empty();

    prompts.forEach(item => {
      const $itemElement = $(itemTemplate);

      $itemElement.find('.prompt-item-role').text(item.role);
      $itemElement.find('.prompt-item-token').text(item.token.toString());

      const $contentDiv = $itemElement.find('.prompt-view-item-content');
      $contentDiv.text(item.content);

      $itemElement.attr('data-role-visible', 'true');
      $itemElement.attr('data-search-visible', 'true');

      $list.append($itemElement);
    });
    bindToggleHandlers($list);

    applyFiltersAndSearch($contentHtml);
  });

  // 触发并拦截一次生成以填充 UI
  eventSource.makeLast(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
  refreshPromptView();
}

/**
 * 转义正则表达式中的特殊字符
 * @param string 需要转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * 查找文本中包含的关键词, 并返回关键词所在的行号、列号和内容
 * @param text 需要查找的文本
 * @param keyword 需要查找的关键词
 * @param lines_per_chunk 每行包含的行数
 * @returns 包含关键词的行号、列号和内容
 */
function findWithContext(text: string, keyword: string, lines_per_chunk: number = 5): FindWithContextResult[] {
  const regex = new RegExp(escapeRegExp(keyword), 'gi');
  return _(text)
    .split(/\r?\n/)
    .chunk(lines_per_chunk)
    .map((chunk, chunk_index) => {
      return {
        context: {
          start_line: chunk_index * lines_per_chunk,
          content: chunk,
        },
        matches: chunk.flatMap((line, line_index) => {
          const line_number = chunk_index * lines_per_chunk + line_index;
          return [...line.matchAll(regex)].map(match => ({
            line_number,
            start_column: match.index,
            end_column: match.index + match[0].length,
          }));
        }),
      };
    })
    .filter(chunk => chunk.matches.length > 0)
    .value();
}

/**
 * 在顶部插入系统消息压缩/后处理的警告
 */
export function insertMessageMergeWarning(scope: JQuery<HTMLElement>, type: 'squash' | 'post-processing') {
  const $warning = $('<div class="prompt-view-process-warning">');
  if (type === 'squash') {
    $warning.text('⚠️ 本次提示词发送经过了预设中的“系统消息压缩”合并处理');
  } else if (type === 'post-processing') {
    $warning.text('⚠️ 本次提示词发送经过了API中的“提示词后处理”合并处理');
  }
  scope.prepend($warning);
}
