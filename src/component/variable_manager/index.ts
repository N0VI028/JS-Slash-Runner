import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

import { VariableController } from '@/component/variable_manager/controller';
import { VariableModel } from '@/component/variable_manager/model';
import { VariableSyncService } from '@/component/variable_manager/sync';
import { VariableView } from '@/component/variable_manager/view';
import { extensionFolderPath } from '@/util/extension_variables';

import log from 'loglevel';

const templatePath = `${extensionFolderPath}/src/component/variable_manager/public`;

let variableView: VariableView | null = null;
let variableController: VariableController | null = null;
let variableModel: VariableModel | null = null;
let syncService: VariableSyncService | null = null;

/**
 * 初始化变量管理器
 */
export async function openVariableManager() {
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  variableModel = new VariableModel();
  variableView = new VariableView($variableManagerContainer);

  syncService = new VariableSyncService(variableView, variableModel);

  variableController = new VariableController(variableModel, variableView, syncService, variableView.cardFactory);

  variableView.setController(variableController);

  await variableController.init($variableManagerContainer);
  if (variableView) {
    variableView.render();
  } else {
    log.error('[VariableManager] 变量管理器未初始化');
  }
}

/**
 * 添加变量管理快速按钮
 */
function addVariableManagerQuickButton() {
  const buttonHtml = $(`
  <div id="tavern-helper-variable-container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-square-root-variable extensionsMenuExtensionButton" /></div>
      <span id="tavern-helper-variable-text">变量管理器</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#tavern-helper-variable-container').on('click', async function () {
    await openVariableManager();
  });
}

export function initVariableManager() {
  addVariableManagerQuickButton();
  const $button = $('#open-variable-manager');
  if ($button.length) {
    $button.on('click', async () => {
      await openVariableManager();
    });
  }
}
