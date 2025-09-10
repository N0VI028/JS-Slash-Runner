import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';
import { nextTick, onMounted, onUnmounted, watchEffect, type Ref } from 'vue';
import { repositoryService } from '../services/repository.service';
import { useCharacterScriptStore, useGlobalScriptStore } from '../stores/factory';

/**
 * Vue 3 + jQuery UI Sortable 拖拽
 * 使用V1相同的sortable方式，避免与ST核心冲突
 */
export function useJQueryDrag() {
  const globalStore = useGlobalScriptStore();
  const characterStore = useCharacterScriptStore();

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([globalStore.init(), characterStore.init()]);
  };

  // 脚本列表sortable - 使用watchEffect监听元素变化
  const useListSortable = (el: Ref<HTMLElement | undefined>) => {
    let initialized = false;

    // 使用watchEffect监听元素的变化
    const stopWatcher = watchEffect(() => {
      // 如果已经初始化过，不重复初始化
      if (initialized) return;

      // 如果元素不存在，等待下次变化
      if (!el.value) return;

      // 检查jQuery是否可用
      if (typeof $ === 'undefined') {
        console.error('[拖拽] jQuery不可用');
        return;
      }

      const $element = $(el.value);

      try {
        $element.sortable({
          delay: (window as any).getSortableDelay ? (window as any).getSortableDelay() : 150,
          items: '.script-item, .script-folder',
          handle: '.drag-handle',
          cursor: 'move',
          tolerance: 'pointer',
          placeholder: 'sortable-placeholder',
          // 不与文件夹内容连接，跨容器移动到根目录交给 droppable 处理，避免 jQuery UI 直接插入 DOM

          stop: async () => {
            try {
              await refreshData();
            } catch (error) {
              console.error('[拖拽] 数据刷新失败:', error);
            }
          },
        });

        initialized = true;
        // 初始化成功后停止监听
        stopWatcher();
      } catch (error) {
        console.error('[拖拽] sortable初始化失败:', error);
      }
    });

    onUnmounted(() => {
      // 清理监听器
      stopWatcher();

      // 销毁sortable
      if (el.value && $(el.value).data('ui-sortable')) {
        $(el.value).sortable('destroy');
      }
    });
  };

  // 根列表拖拽接收（droppable）
  const useRootDrop = (el: Ref<HTMLElement | undefined>, repoType: ScriptType) => {
    const stopWatcher = watchEffect(() => {
      if (!el.value) return;
      if (typeof $ === 'undefined') return;

      const $element = $(el.value);

      // 清理旧的 dragdrop 命名空间事件，避免重复绑定
      $element.off('.dragdrop-root');
      $element.on(
        'dragover.dragdrop-root dragenter.dragdrop-root dragleave.dragdrop-root drop.dragdrop-root',
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        },
      );

      // 仅用于接收从文件夹拖出的脚本
      $element.droppable({
        accept: '.script-item[data-script-repository="true"]',
        tolerance: 'pointer',
        greedy: true,
        over: (_event, ui) => {
          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;
          // 仅当来源在文件夹中时才高亮根列表
          const fromFolder = ui.draggable.closest('.script-folder').length > 0;
          if (!fromFolder) return;
          $element.addClass('root-drag-target');
        },
        out: (_event, ui) => {
          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;
          $element.removeClass('root-drag-target');
        },
        drop: async (event, ui) => {
          if (event.originalEvent) {
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
          }
          event.preventDefault();
          event.stopImmediatePropagation();

          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return false;

          // 仅处理从文件夹拖出的情况，避免根列表内排序时重复处理
          const fromFolder = ui.draggable.closest('.script-folder').length > 0;
          if (!fromFolder) {
            $element.removeClass('root-drag-target');
            return false;
          }

          const scriptId = ui.draggable.attr('id');
          if (!scriptId) {
            $element.removeClass('root-drag-target');
            return false;
          }

          try {
            // 仅对支持的类型执行移动操作
            if (repoType === 'global' || repoType === 'character') {
              await repositoryService.moveScriptWithinType(repoType, scriptId, null);
              await refreshData();
              toastr.success('脚本已移动到根目录');
            } else {
              toastr.error('不支持的脚本类型操作');
            }
          } catch (error) {
            console.error('[拖拽] 移动到根目录失败:', error);
            toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
          } finally {
            $element.removeClass('root-drag-target');
          }

          return false;
        },
      });

      stopWatcher();
    });

    onUnmounted(() => {
      stopWatcher();
      if (el.value) {
        const $element = $(el.value);
        $element.off('.dragdrop-root');
        if ($element.data('ui-droppable')) {
          $element.droppable('destroy');
        }
      }
    });
  };

  // 文件夹拖拽区域设置
  const useFolderDrop = (el: Ref<HTMLElement | undefined>, folderId: string, repoType: ScriptType) => {
    const stopWatcher = watchEffect(() => {
      if (!el.value) return;

      if (typeof $ === 'undefined') return;

      const $element = $(el.value);

      // 移除之前的dragdrop事件监听器，防止冲突
      $element.off('.dragdrop');

      // 手动绑定原生拖拽事件防止器，防止与ST核心dragdrop.js冲突
      $element.on('dragover.dragdrop dragenter.dragdrop dragleave.dragdrop drop.dragdrop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });

      // 设置文件夹头部为droppable区域
      $element.droppable({
        accept: '.script-item[data-script-repository="true"]',
        tolerance: 'pointer',
        greedy: true,

        over: (_event, ui) => {
          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

          // 检查是否从同一文件夹拖拽
          const isFromSameFolder = ui.draggable.closest('.script-folder').attr('id') === folderId;
          if (isFromSameFolder) return;

          $element.addClass('folder-drag-target');
        },

        out: (_event, ui) => {
          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

          $element.removeClass('folder-drag-target');
        },

        drop: async (event, ui) => {
          if (event.originalEvent) {
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
          }
          event.preventDefault();
          event.stopImmediatePropagation();

          if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

          const scriptId = ui.draggable.attr('id');
          const isFromSameFolder = ui.draggable.closest('.script-folder').attr('id') === folderId;

          if (isFromSameFolder || !scriptId) {
            $element.removeClass('folder-drag-target');
            return false;
          }

          try {
            // 仅对支持的类型执行移动操作
            if (repoType === 'global' || repoType === 'character') {
              await repositoryService.moveScriptWithinType(repoType, scriptId, folderId);
              await refreshData();
              toastr.success('脚本已移动到文件夹');
            } else {
              toastr.error('不支持的脚本类型操作');
            }
          } catch (error) {
            console.error('[拖拽] 移动脚本到文件夹失败:', error);
            toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
          } finally {
            $element.removeClass('folder-drag-target');
          }

          return false;
        },
      });

      stopWatcher();
    });

    onUnmounted(() => {
      stopWatcher();
      if (el.value) {
        const $element = $(el.value);
        // 清理dragdrop事件监听器
        $element.off('.dragdrop');
        // 销毁droppable
        if ($element.data('ui-droppable')) {
          $element.droppable('destroy');
        }
      }
    });
  };

  // 文件夹内容sortable
  const useFolderSortable = (el: Ref<HTMLElement | undefined>, _repoType: ScriptType) => {
    const stopWatcher = watchEffect(() => {
      if (!el.value) return;

      const $folderContent = $(el.value).find('.folder-content');
      if ($folderContent.length === 0) return;

      $folderContent.sortable({
        delay: (window as any).getSortableDelay ? (window as any).getSortableDelay() : 150,
        items: '.script-item',
        handle: '.drag-handle',
        cursor: 'move',
        tolerance: 'pointer',
        placeholder: 'sortable-placeholder',
        connectWith: '.folder-content', // 仅连接其他文件夹，移动到根目录由根droppable处理

        stop: async () => {
          try {
            await refreshData();
          } catch (error) {
            console.error('[拖拽] 文件夹内排序失败:', error);
          }
        },
      });

      stopWatcher();
    });

    onUnmounted(() => {
      stopWatcher();
      if (el.value) {
        const $folderContent = $(el.value).find('.folder-content');
        if ($folderContent.data('ui-sortable')) {
          $folderContent.sortable('destroy');
        }
      }
    });
  };

  // 设置脚本元素属性
  const useScriptElement = (el: Ref<HTMLElement | undefined>, scriptId: string) => {
    onMounted(() =>
      nextTick(() => {
        if (!el.value) return;

        $(el.value).attr({ id: scriptId, 'data-script-repository': 'true' }).addClass('script-item');
      }),
    );
  };

  // 设置文件夹元素属性
  const useFolderElement = (el: Ref<HTMLElement | undefined>, folderId: string) => {
    onMounted(() =>
      nextTick(() => {
        if (!el.value) return;

        $(el.value).attr('id', folderId).addClass('script-folder');
      }),
    );
  };

  return {
    useListSortable,
    useRootDrop,
    useFolderDrop,
    useFolderSortable,
    useScriptElement,
    useFolderElement,
  };
}
