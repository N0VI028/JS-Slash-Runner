import { onChatCompletionPromptReady, refreshPromptView, setPromptViewUpdater } from '@/component/prompt_view/service';
import { extensionFolderPath } from '@/util/extension_variables';
import { FloatingDialog } from '@/util/floating_dialog';
import { loadFileToHead } from '@/util/load_file_to_document';

import { event_types, eventSource } from '@sillytavern/script';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';

export const templatePath = `${extensionFolderPath}/src/component/prompt_view/public`;

interface PromptData {
  role: string;
  content: string;
  token: number;
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
    scope.find('#prompt-view-header-fresh').on('click', function () {
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
   * 应用筛选和搜索逻辑
   * @param scope 作用域元素
   */
  function applyFiltersAndSearch(scope: JQuery<HTMLElement>) {
    const searchValue = (scope.find('#prompt-search').val() as string)?.toLowerCase().trim() || '';

    const enabledRoles = new Set<string>();
    scope.find('.prompt-filter-checkbox:checked').each(function () {
      const role = $(this).attr('data-role');
      if (role) {
        enabledRoles.add(role);
      }
    });

    let visibleCount = 0;
    let totalCount = 0;
    let visibleTokens = 0;

    const $items = scope.find('.prompt-view-item');

    $items.each(function () {
      const $item = $(this);
      totalCount++;

      const roleElement = $item.find('.prompt-item-role');
      if (roleElement.length === 0) {
        $item.hide();
        return;
      }

      const itemRole = roleElement.text().trim();

      const roleMatches = enabledRoles.has(itemRole);

      if (!roleMatches) {
        $item.hide();
        return;
      }

      if (searchValue) {
        const contentElement = $item.find('.prompt-view-item-content');
        const itemContent = contentElement.text().toLowerCase().trim();

        if (!itemContent.includes(searchValue)) {
          $item.hide();
          return;
        }
      }

      $item.show();
      visibleCount++;

      const tokenElement = $item.find('.prompt-item-token');
      const tokenValue = parseInt(tokenElement.text().trim()) || 0;
      visibleTokens += tokenValue;
    });

    scope.find('.prompt-count').text(`显示 ${visibleCount} / ${totalCount} 条消息`);
    scope.find('.prompt-total-tokens').text(`总Token数: ${visibleTokens}`);
  }

  function bindFilterHandler(scope: JQuery<HTMLElement>) {
    scope.find('#prompt-filter-icon').on('click', function () {
      const $filterOptions = scope.find('#prompt-filter-options');
      $filterOptions.slideToggle(300);
    });

    scope.find('.prompt-filter-checkbox').on('change', function () {
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
      const $icon = $this.find('.prompt-view-item-header-icon');
      $cnt.slideToggle(300);
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
      const $divider = $contentDiv.find('.divider');
      $contentDiv.empty().append($divider).append($('<span>').text(item.content));

      $list.append($itemElement);
    });
    bindToggleHandlers($list);

    applyFiltersAndSearch($contentHtml);
  });

  // 触发并拦截一次生成以填充 UI
  eventSource.makeLast(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
  refreshPromptView();
}
