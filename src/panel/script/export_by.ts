import ExportBy from '@/panel/script/ExportBy.vue';
import { flattenScriptTree, ScriptTree } from '@/type/scripts';
import { useModal } from 'vue-final-modal';

export type ScriptExportSummaryItem = {
  script_name: string;
  has_data: boolean;
  has_button: boolean;
  exported_data: boolean;
  exported_button: boolean;
};

export function collectExportSummaryItems(
  original_scripts: ScriptTree[],
  exported_scripts: ScriptTree[],
): ScriptExportSummaryItem[] {
  const exported_script_map = new Map(exported_scripts.flatMap(flattenScriptTree).map(script => [script.id, script]));

  return original_scripts.flatMap(flattenScriptTree).flatMap(script => {
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
  });
}

export function showExportSummaryToast(target_name: string, items: ScriptExportSummaryItem[]): void {
  if (items.length === 0) {
    return;
  }

  toastr.info(
    `${t`本次${target_name}导出包含 ${items.length} 个带变量或按钮的酒馆助手脚本`}<br><u>${t`点此查看详情`}</u>`,
    t`酒馆助手`,
    {
      showDuration: 1000,
      escapeHtml: false,
      onclick: () => {
        useModal({
          component: ExportBy,
          attrs: {
            targetName: target_name,
            items,
          },
        }).open();
      },
    },
  );
}
