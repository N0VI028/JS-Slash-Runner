import { ScriptManager } from '@/component/script_repository/script_controller';
import { Script } from '@/component/script_repository/types';
import { eventSource } from '@sillytavern/script';

import log from 'loglevel';

let isQrEnabled = false;
let isCombined = false;
export abstract class Button {
  id: string;
  name: string;
  visible: boolean;
  scriptId: string;

  constructor(name: string, scriptId: string, visible: boolean = true) {
    this.id = `${scriptId}_${name}`;
    this.name = name;
    this.scriptId = scriptId;
    this.visible = visible;
  }

  abstract render(): string;

  abstract bindEvents(): void;

  remove(): void {
    $(`#${this.id}`).remove();
  }
}

export class ScriptButton extends Button {
  constructor(name: string, scriptId: string, visible: boolean = true) {
    super(name, scriptId, visible);
  }

  render(): string {
    return `<div class="qr--button menu_button interactable" id="${this.id}">${this.name}</div>`;
  }

  bindEvents(): void {
    $(`#${this.id}`).on('click', () => {
      eventSource.emit(this.id);
      log.info(`[ScriptManager] 点击按钮：${this.id}`);
    });
  }
}

export class ButtonFactory {
  static createButton(type: string, name: string, scriptId: string, visible: boolean = true): Button {
    switch (type) {
      case 'script':
      default:
        return new ScriptButton(name, scriptId, visible);
    }
  }
}

export class ButtonManager {
  private buttons: Button[] = [];

  /**
   * 将按钮从旧容器迁移到新容器
   * @param oldContainerId 旧容器ID
   * @param newContainerId 新容器ID
   */
  migrateButtonsToNewContainer(oldContainerId: string, newContainerId: string): void {
    const $oldButtons = $(`#${oldContainerId} .qr--button`);
    const $newContainer = $(`#${newContainerId}`);

    if ($oldButtons.length && $newContainer.length) {
      $oldButtons.detach().appendTo($newContainer);

      this.buttons.forEach(button => {
        button.bindEvents();
      });
    }
  }

  /**
   * 获取脚本容器ID
   * @param scriptId 脚本ID
   * @returns 脚本容器ID
   */
  private getScriptContainerId(scriptId: string): string {
    return `script_container_${scriptId}`;
  }

  /**
   * 从脚本数据创建按钮
   * @param globalScripts 全局脚本
   * @param characterScripts 角色脚本
   * @param isGlobalEnabled 全局脚本是否启用
   * @param isCharacterEnabled 角色脚本是否启用
   */
  createButtonsFromScripts(
    globalScripts: Script[],
    characterScripts: Script[],
    isGlobalEnabled: boolean,
    isCharacterEnabled: boolean,
  ): void {
    this.clearButtons();

    const hasGlobalVisibleButtons =
      isGlobalEnabled &&
      globalScripts.some(
        script =>
          script.enabled &&
          script.buttons &&
          script.buttons.length > 0 &&
          script.buttons.some(button => button.visible),
      );

    const hasCharacterVisibleButtons =
      isCharacterEnabled &&
      characterScripts.some(
        script =>
          script.enabled &&
          script.buttons &&
          script.buttons.length > 0 &&
          script.buttons.some(button => button.visible),
      );

    if (!hasGlobalVisibleButtons && !hasCharacterVisibleButtons) {
      return;
    }

    if (isGlobalEnabled && hasGlobalVisibleButtons) {
      this.addScriptButtons(globalScripts);
    }

    if (isCharacterEnabled && hasCharacterVisibleButtons) {
      this.addScriptButtons(characterScripts);
    }
  }

  /**
   * 添加脚本按钮
   * @param scripts 脚本列表
   */
  private addScriptButtons(scripts: Script[]): void {
    scripts.forEach(script => {
      if (script.enabled && script.buttons && script.buttons.length > 0) {
        const visibleButtons = script.buttons
          .filter(buttonData => buttonData.visible)
          .map(buttonData => ButtonFactory.createButton('script', buttonData.name, script.id, buttonData.visible));

        if (visibleButtons.length > 0) {
          this.addButtonsGroup(visibleButtons, script.id);
        }
      }
    });
  }

  /**
   * 添加按钮组
   * @param buttons 按钮列表
   * @param scriptId 脚本ID
   */
  private addButtonsGroup(buttons: Button[], scriptId: string): void {
    if (buttons.length === 0) return;

    const containerId = this.getScriptContainerId(scriptId);

    $(`#${containerId}`).remove();

    let containerHtml = `<div id="${containerId}" class="qr--buttons th--button">`;

    buttons.forEach(button => {
      this.buttons = this.buttons.filter(btn => btn.id !== button.id);
      this.buttons.push(button);
      containerHtml += button.render();
    });

    containerHtml += '</div>';

    if (isCombined) {
      $('#send_form #qr--bar .qr--buttons').first().append(containerHtml);
    } else {
      $('#send_form #qr--bar').first().append(containerHtml);
    }

    buttons.forEach(button => button.bindEvents());
  }

  /**
   * 为指定脚本添加所有按钮
   * @param script 脚本
   */
  addButtonsForScript(script: Script): void {
    if (!script.buttons || script.buttons.length === 0) return;

    const visibleButtons = script.buttons
      .filter(buttonData => buttonData.visible)
      .map(buttonData => ButtonFactory.createButton('script', buttonData.name, script.id, buttonData.visible));

    if (visibleButtons.length > 0) {
      this.addButtonsGroup(visibleButtons, script.id);
    }
  }

  /**
   * 移除指定脚本的按钮
   * @param scriptId 脚本ID
   */
  removeButtonsByScriptId(scriptId: string): void {
    const containerId = this.getScriptContainerId(scriptId);
    $(`#${containerId}`).remove();
  }

  /**
   * 清除所有按钮
   */
  clearButtons(): void {
    this.buttons.forEach(btn => btn.remove());
    this.buttons = [];

    $('.th-button').remove();
  }
}

const buttonManager = new ButtonManager();

/**
 * 设置按钮时需要执行的行为
 */
function _setButtonLogic() {
  const scriptManager = ScriptManager.getInstance();

  const globalScripts = scriptManager.getGlobalScripts();
  const characterScripts = scriptManager.getCharacterScripts();
  const isGlobalEnabled = scriptManager.isGlobalScriptEnabled;
  const isCharacterEnabled = scriptManager.isCharacterScriptEnabled;

  buttonManager.createButtonsFromScripts(globalScripts, characterScripts, isGlobalEnabled, isCharacterEnabled);
}

/**
 * qr启用或者禁用时重新添加按钮
 */
export function bindQrEnabledChangeListener() {
  $(`#qr--isEnabled`).on('change', () => {
    isQrEnabled = $('#qr--isEnabled').prop('checked');
    checkQrEnabledStatusAndAddButton();
    log.info('[script_manager] 创建按钮');
  });

  $('#qr--isCombined').on('change', () => {
    isCombined = $('#qr--isCombined').prop('checked');
    checkQrEnabledStatusAndAddButton();
    log.info('[script_manager] 创建按钮');
  });

  $('#qr--global-setListAdd, #qr--chat-setListAdd, .qr--del').on('click', () => {
    checkQrEnabledStatusAndAddButton();
    log.info('[script_manager] 创建按钮');
  });
}

/**
 * 解绑 qr--isEnabled 元素的 change 事件监听器
 */
export function unbindQrEnabledChangeListener() {
  $(`#qr--isEnabled, #qr--isCombined`).off('change');
  $(`#qr--global-setListAdd, #qr--chat-setListAdd, .qr--del`).off('click');
}

/**
 * 根据qr--isEnabled状态处理容器
 */
function checkQrEnabledStatus() {
  isQrEnabled = $('#qr--isEnabled').prop('checked');
  const qrBarLength = $('#send_form #qr--bar').length;
  if (!isQrEnabled) {
    if (qrBarLength === 0) {
      $('#send_form').append('<div class="flex-container flexGap5" id="qr--bar"></div>');
    } else {
      $('#send_form #qr--bar').not(':first').remove();
    }
  }
}

/**
 * 检查qr--isCombined状态
 */
function checkQrCombinedStatus() {
  isCombined = $('#qr--isCombined').prop('checked');
  if (!isQrEnabled) {
    if (isCombined) {
      const $qrBar = $('#send_form #qr--bar');
      const isThButtonExist = $qrBar.find('.th--buttons').length > 0;
      if (!isThButtonExist) {
        $qrBar.append('<div class="qr--buttons th--buttons"></div>');
      }
    }
  }
}

/**
 * 检查qr--isEnabled和qr--isCombined状态并添加按钮
 */
export function checkQrEnabledStatusAndAddButton() {
  checkQrEnabledStatus();
  checkQrCombinedStatus();
  _setButtonLogic();
}

/**
 * 初始化脚本按钮，包括确认qr容器和绑定change事件
 */
export function initScriptButton() {
  checkQrEnabledStatus();
  checkQrCombinedStatus();
  bindQrEnabledChangeListener();
}
