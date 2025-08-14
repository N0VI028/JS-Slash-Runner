import { onChatCompletionPromptReady, refreshPromptView, setPromptViewUpdater } from '@/component/prompt_view/service';
import { extensionFolderPath } from '@/util/extension_variables';
import { FloatingDialog } from '@/util/floating_dialog';
import { loadFileToHead } from '@/util/load_file_to_document';

import { event_types, eventSource, online_status } from '@sillytavern/script';

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

interface SearchResult {
  matches: boolean;
  positions?: RegExpMatchArray[]; // 正则匹配结果
  indices?: Array<{ start: number; end: number; text: string }>; // 普通搜索的位置信息
}

// 全局原始内容映射，避免在DOM上重复存储
let originalContentMap = new Map<number, string>();
let currentPromptData: PromptData[] = [];

/**
 * 获取元素的原始内容
 * @param contentElement 内容元素
 * @returns 原始内容文本
 */
function getOriginalContent(contentElement: JQuery<HTMLElement>): string {
  const index = parseInt(contentElement.attr('data-prompt-index') || '-1');
  if (index >= 0 && originalContentMap.has(index)) {
    return originalContentMap.get(index) || '';
  }
  // 如果找不到映射，使用当前文本
  return contentElement.text();
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
      originalContentMap.clear();
      currentPromptData = [];
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
   * @param enabledRoles 启用的角色集合
   */
  function applyRoleFilters(enabledRoles: Set<string>) {
    const $items = $('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);

      const roleElement = $item.find('.prompt-item-role');
      if (roleElement.length === 0) {
        log.warn('发现缺少role信息的消息项，跳过处理:', $item[0]);
        return;
      }

      const itemRole = roleElement.text().trim();
      const roleMatches = enabledRoles.has(itemRole);

      $item.attr('data-role-visible', roleMatches ? 'true' : 'false');
    });
  }

  /**
   * 一次性完成完整搜索，返回所有匹配信息
   * @param text 要搜索的文本
   * @param searchValue 搜索值
   * @param isRegex 是否使用正则表达式
   * @returns 包含匹配状态和详细位置信息的结果
   */
  function performCompleteSearch(text: string, searchValue: string, isRegex: boolean): SearchResult {
    try {
      if (isRegex) {
        const regex = new RegExp(searchValue, 'gi');
        const positions = [...text.matchAll(regex)];
        return {
          matches: positions.length > 0,
          positions: positions,
        };
      } else {
        const lowerText = text.toLowerCase();
        const lowerSearch = searchValue.toLowerCase();
        const indices: Array<{ start: number; end: number; text: string }> = [];
        let index = lowerText.indexOf(lowerSearch);

        while (index !== -1) {
          indices.push({
            start: index,
            end: index + searchValue.length,
            text: text.substring(index, index + searchValue.length),
          });
          index = lowerText.indexOf(lowerSearch, index + 1);
        }

        return {
          matches: indices.length > 0,
          indices: indices,
        };
      }
    } catch (error) {
      log.warn('搜索处理错误:', error);
      return { matches: false };
    }
  }

  /**
   * 优化后的搜索筛选逻辑
   * @param searchValue 搜索值
   * @param isRegex 是否使用正则表达式
   * @param useCompactMode 是否使用仅显示匹配部分前后3行
   */
  function applySearchWithCompactMode(searchValue: string, isRegex: boolean = false, useCompactMode: boolean = false) {
    const $items = $('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);
      const contentElement = $item.find('.prompt-view-item-content');

      restoreToOriginalState(contentElement);

      if (!searchValue) {
        $item.attr('data-search-visible', 'true');
        return;
      }

      const itemContent = getOriginalContent(contentElement).trim();

      const searchResult = performCompleteSearch(itemContent, searchValue, isRegex);

      if (searchResult.matches) {
        if (useCompactMode) {
          const contextResults = findWithContextFromMatches(itemContent, searchResult);
          if (contextResults.length > 0) {
            applyContextViewOptimized(contentElement, contextResults, searchValue, 3);
          } else {
            highlightSearchResultsFromMatches(contentElement, searchResult);
          }
        } else {
          highlightSearchResultsFromMatches(contentElement, searchResult);
        }
      }

      $item.attr('data-search-visible', searchResult.matches ? 'true' : 'false');
    });
  }

  /**
   * 恢复到原始状态
   * @param contentElement 内容元素
   */
  function restoreToOriginalState(contentElement: JQuery<HTMLElement>) {
    contentElement.removeClass('context-view-mode search-highlighted');

    const originalContent = getOriginalContent(contentElement);
    if (originalContent) {
      contentElement.html($('<div>').text(originalContent).html());
    }

    contentElement.off('click.contextExpand click.contextCollapse');
  }

  /**
   * 基于已有匹配结果进行高亮，避免重复搜索
   * @param contentElement 内容元素
   * @param searchResult 搜索结果
   */
  function highlightSearchResultsFromMatches(contentElement: JQuery<HTMLElement>, searchResult: SearchResult) {
    if (!searchResult.matches) return;

    contentElement.addClass('search-highlighted');

    let content = contentElement.html();
    const originalText = getOriginalContent(contentElement);

    try {
      if (searchResult.positions) {
        const sortedPositions = [...searchResult.positions].sort((a, b) => (b.index || 0) - (a.index || 0));
        sortedPositions.forEach(match => {
          if (match.index !== undefined) {
            const matchText = originalText.substring(match.index, match.index + match[0].length);
            const escapedMatch = $('<div>').text(matchText).html();
            const regex = new RegExp(escapeRegExp(escapedMatch), 'g');
            let matchCount = 0;
            content = content.replace(regex, matched => {
              matchCount++;
              return `<span class="search-highlight">${matched}</span>`;
            });
          }
        });
      } else if (searchResult.indices) {
        const sortedIndices = [...searchResult.indices].sort((a, b) => b.start - a.start);
        sortedIndices.forEach(match => {
          const matchText = originalText.substring(match.start, match.end);
          const escapedMatch = $('<div>').text(matchText).html();
          const index = content.indexOf(escapedMatch);
          if (index !== -1) {
            content =
              content.substring(0, index) +
              `<span class="search-highlight">${escapedMatch}</span>` +
              content.substring(index + escapedMatch.length);
          }
        });
      }

      contentElement.html(content);
    } catch (error) {
      log.warn('高亮关键词时发生错误', error);
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
   * 精简上下文视图的生成
   * @param contentElement 内容元素
   * @param contextResults 上下文搜索结果
   * @param keyword 关键词
   * @param contextLines 前后显示的行数
   */
  function applyContextViewOptimized(
    contentElement: JQuery<HTMLElement>,
    contextResults: FindWithContextResult[],
    keyword: string,
    contextLines: number = 3,
  ) {
    if (!keyword || contextResults.length === 0) return;

    contentElement.addClass('context-view-mode');

    const originalText = getOriginalContent(contentElement);
    const contextViewHtml = generateContextView(originalText, contextResults, keyword, contextLines);

    contentElement.html(contextViewHtml);

    bindContextViewEvents(contentElement, originalText);
  }

  /**
   * 绑定上下文视图的交互事件
   * @param contentElement 内容元素
   * @param originalText 原始文本
   */
  function bindContextViewEvents(contentElement: JQuery<HTMLElement>, originalText: string) {
    contentElement.off('click.contextExpand click.contextCollapse');

    contentElement.on('click.contextExpand', '.context-expand-button', function (e) {
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

    contentElement.on('click.contextCollapse', '.context-collapse-button', function (e) {
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
   */
  function applyFiltersAndSearch() {
    const searchValue = ($('#prompt-search').val() as string)?.trim() || '';

    const enabledRoles = new Set<string>();
    $('.prompt-filter-checkbox:checked').each(function () {
      const role = $(this).attr('data-role');
      if (role) {
        enabledRoles.add(role);
      }
    });

    const isRegex = searchValue.startsWith('/') && searchValue.endsWith('/') && searchValue.length > 2;
    const actualSearchValue = isRegex ? searchValue.slice(1, -1) : searchValue;

    const useCompactMode = $('#prompt-search-compact-mode').is(':checked');

    applyRoleFilters(enabledRoles);

    applySearchWithCompactMode(actualSearchValue, isRegex, useCompactMode);

    updateDisplayStats($contentHtml);
  }

  function bindFilterHandler(scope: JQuery<HTMLElement>) {
    scope.find('#prompt-filter-icon').on('click', function () {
      const $filterOptions = scope.find('#prompt-filter-options');
      $filterOptions.slideToggle(300);
    });

    scope.find('.prompt-filter-checkbox').on('change', function () {
      applyFiltersAndSearch();
    });

    scope.find('#prompt-search-compact-mode').on('change', function () {
      applyFiltersAndSearch();
    });
  }

  // 绑定搜索框输入事件
  function bindSearchHandler(scope: JQuery<HTMLElement>) {
    let searchTimeout: NodeJS.Timeout | null = null;

    scope.find('#prompt-search').on('input', function () {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      searchTimeout = setTimeout(() => {
        applyFiltersAndSearch();
        searchTimeout = null;
      }, 500);
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

  const $empty = $contentHtml.find('.prompt-empty');

  setPromptViewUpdater(async (prompts: PromptData[], totalTokens: number) => {
    const $list = $contentHtml.find('.prompt-list');

    $contentHtml.find('.prompt-total-tokens').text(`总Token数: ${totalTokens}`);
    $contentHtml.find('.prompt-count').text(`共 ${prompts.length} 条消息`);

    if (prompts.length === 0) {
      $list.empty();
      if (online_status === 'no_connection') {
        $empty.text('未连接到API，请检查网络连接').show();
      } else {
        $empty.text('暂无提示词数据').show();
      }
      originalContentMap.clear();
      currentPromptData = [];
      return;
    }

    $empty.hide();
    const itemTemplate = await renderExtensionTemplateAsync(`${templatePath}`, 'prompt_view_item');

    $list.empty();

    currentPromptData = prompts;
    originalContentMap.clear();

    prompts.forEach((item, index) => {
      const $itemElement = $(itemTemplate);

      $itemElement.find('.prompt-item-role').text(item.role);
      $itemElement.find('.prompt-item-token').text(item.token.toString());

      const $contentDiv = $itemElement.find('.prompt-view-item-content');
      $contentDiv.attr('data-prompt-index', index.toString());
      originalContentMap.set(index, item.content);
      $contentDiv.html($('<div>').text(item.content).html());

      $itemElement.attr('data-role-visible', 'true');
      $itemElement.attr('data-search-visible', 'true');

      $list.append($itemElement);
    });
    bindToggleHandlers($list);

    applyFiltersAndSearch();
  });

  // 触发并拦截一次生成以填充 UI
  eventSource.makeLast(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
  refreshPromptView();
}

/**
 * 基于已有搜索结果查找上下文
 * @param text 需要查找的文本
 * @param searchResult 已有的搜索结果
 * @param lines_per_chunk 每行包含的行数
 * @returns 包含关键词的行号、列号和内容
 */
function findWithContextFromMatches(
  text: string,
  searchResult: SearchResult,
  lines_per_chunk: number = 5,
): FindWithContextResult[] {
  if (!searchResult.matches) return [];

  const lines = text.split(/\r?\n/);
  const matchPositions: Array<{ line_number: number; start_column: number; end_column: number }> = [];

  let currentPosition = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineStart = currentPosition;
    const lineEnd = currentPosition + line.length;

    if (searchResult.positions) {
      searchResult.positions.forEach(match => {
        if (match.index !== undefined && match.index >= lineStart && match.index < lineEnd) {
          matchPositions.push({
            line_number: lineIndex,
            start_column: match.index - lineStart,
            end_column: match.index - lineStart + match[0].length,
          });
        }
      });
    } else if (searchResult.indices) {
      searchResult.indices.forEach(match => {
        if (match.start >= lineStart && match.start < lineEnd) {
          matchPositions.push({
            line_number: lineIndex,
            start_column: match.start - lineStart,
            end_column: match.end - lineStart,
          });
        }
      });
    }

    currentPosition = lineEnd + 1; // +1 for the newline character
  }

  const lineGroups = new Map<number, Array<{ line_number: number; start_column: number; end_column: number }>>();
  matchPositions.forEach(match => {
    const chunkIndex = Math.floor(match.line_number / lines_per_chunk);
    if (!lineGroups.has(chunkIndex)) {
      lineGroups.set(chunkIndex, []);
    }
    lineGroups.get(chunkIndex)!.push(match);
  });

  return Array.from(lineGroups.entries()).map(([chunkIndex, matches]) => {
    const startLine = chunkIndex * lines_per_chunk;
    const endLine = Math.min(startLine + lines_per_chunk, lines.length);
    const chunkLines = lines.slice(startLine, endLine);

    return {
      context: {
        start_line: startLine,
        content: chunkLines,
      },
      matches: matches,
    };
  });
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
