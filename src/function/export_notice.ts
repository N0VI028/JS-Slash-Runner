import Popup from '@/panel/component/Popup.vue';
import { flattenScriptTree, ScriptTree } from '@/type/scripts';
import { h } from 'vue';
import { useModal } from 'vue-final-modal';

type ExportSummaryItem = {
  script_name: string;
  has_data: boolean;
  has_button: boolean;
  exported_data: boolean;
  exported_button: boolean;
};

const export_summary_modal_map = new Map<string, () => void>();
let has_bound_export_summary_link = false;

/**
 * 收集本次导出中脚本原始内容与实际导出结果的对照摘要
 */
export function collectExportSummaryItems(
  original_scripts: ScriptTree[] | undefined,
  exported_scripts: ScriptTree[] | undefined,
): ExportSummaryItem[] {
  const exported_script_map = new Map(
    (exported_scripts?.flatMap(flattenScriptTree) ?? []).map(script => [script.id, script] as const),
  );

  return (
    original_scripts?.flatMap(flattenScriptTree).flatMap(script => {
      const has_data = !_.isEmpty(script.data);
      const has_button = script.button.buttons.length > 0;
      if (!has_data && !has_button) {
        return [];
      }

      const exported_script = exported_script_map.get(script.id);
      return [
        {
          script_name: script.name,
          has_data,
          has_button,
          exported_data: has_data && !_.isEmpty(exported_script?.data),
          exported_button: has_button && (exported_script?.button.buttons.length ?? 0) > 0,
        },
      ];
    }) ?? []
  );
}

/**
 * 打开只读导出说明弹窗，展示哪些绑定脚本携带变量或按钮一起导出
 */
function openExportSummaryModal(target_name: string, items: ExportSummaryItem[]): void {
  useModal({
    component: Popup,
    attrs: {
      buttons: [{ name: t`关闭` }],
      width: 'normal',
    },
    slots: {
      default: () =>
        h('div', { class: 'flex w-full max-w-[92vw] flex-col gap-1 p-1.5 text-left' }, [
          h('div', t`本次${target_name}导出中，以下绑定脚本会连同这些内容一起导出：`),
          h('div', { class: 'max-h-[45vh] overflow-y-auto overflow-x-hidden pr-1' }, [
            ...items.map(item =>
              h('div', { class: 'mb-1 border border-(--SmartThemeBorderColor) p-1' }, [
                h('div', { class: 'mb-0.5 break-all font-bold' }, item.script_name),
                h('div', { class: 'flex flex-row flex-wrap gap-4' }, [
                  ...(item.has_data
                    ? [
                        h('span', { class: 'flex items-center gap-0.5 opacity-90' }, [
                          h('span', {
                            class: item.exported_data
                              ? 'fa-solid fa-check text-green-500'
                              : 'fa-solid fa-xmark text-red-500',
                          }),
                          h('span', {class: 'leading-none'}, t`变量`),
                        ]),
                      ]
                    : []),
                  ...(item.has_button
                    ? [
                        h('span', { class: 'flex items-center gap-0.5 opacity-90' }, [
                          h('span', {
                            class: item.exported_button
                              ? 'fa-solid fa-check text-green-500'
                              : 'fa-solid fa-xmark text-red-500',
                          }),
                          h('span', {class: 'leading-none'}, t`按钮`),
                        ]),
                      ]
                    : []),
                ]),
              ]),
            ),
          ]),
          h(
            'div',
            { class: 'th-text-sm opacity-80' },
            t`如需调整这些内容的导出行为，可在对应脚本编辑器的“导出选项”中修改。`,
          ),
        ]),
    },
  }).open();
}

/**
 * 确保只绑定一次 toast 内“查看详情”链接的点击事件
 */
function ensureExportSummaryToastLinkListener(): void {
  if (has_bound_export_summary_link) {
    return;
  }

  has_bound_export_summary_link = true;
  $(document).on('click.th-export-summary', '.th-export-summary-link', function (event) {
    event.preventDefault();
    const id = String($(this).data('exportSummaryId') ?? '');
    const opener = export_summary_modal_map.get(id);
    if (!opener) {
      return;
    }

    export_summary_modal_map.delete(id);
    opener();
  });
}

/**
 * 通过带超链接的 toast 提示用户查看本次导出详情
 */
export function showExportSummaryToast(target_name: string, items: ExportSummaryItem[]): void {
  if (items.length === 0) {
    return;
  }

  ensureExportSummaryToastLinkListener();

  const export_summary_id = _.uniqueId('th-export-summary-');
  export_summary_modal_map.set(export_summary_id, () => openExportSummaryModal(target_name, items));
  setTimeout(() => {
    export_summary_modal_map.delete(export_summary_id);
  }, 60_000);

  toastr.warning(
    `${t`本次${target_name}导出包含 ${items.length} 个带变量或按钮的绑定脚本。`} <br /><a href="#" class="th-export-summary-link" style="text-decoration: underline;" data-export-summary-id="${export_summary_id}">${t`点此查看详情`}</a>`,
    t`酒馆助手`,
    {
      escapeHtml: false,
      extendedTimeOut: 3000,
      tapToDismiss: true,
      timeOut: 6000,
    },
  );
}
