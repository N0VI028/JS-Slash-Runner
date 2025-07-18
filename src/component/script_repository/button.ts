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
  private isUpdating: boolean = false;

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
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;

    try {
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
    } finally {
      setTimeout(() => {
        this.isUpdating = false;
      }, 100);
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

    const $sendForm = $('#send_form');
    const $qrBar = $sendForm.find('#qr--bar');

    if ($qrBar.length === 0) {
      log.warn('[ScriptManager] qr--bar容器不存在，无法添加按钮');
      return;
    }

    if (isCombined) {
      const $combinedContainer = $qrBar.find('.qr--buttons.qr--color').first();
      if ($combinedContainer.length > 0) {
        $combinedContainer.append(containerHtml);
        log.info(`[ScriptManager] 按钮添加到combined容器: ${scriptId}`);
      } else {
        $qrBar.append(containerHtml);
        log.info(`[ScriptManager] 按钮添加到qr--bar（无combined容器）: ${scriptId}`);
      }
    } else {
      $qrBar.append(containerHtml);
      log.info(`[ScriptManager] 按钮添加到qr--bar: ${scriptId}`);
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
   * 清理所有按钮
   */
  clearButtons(): void {
    this.buttons.forEach(button => button.remove());
    this.buttons = [];
  }

  /**
   * 清理资源并重置状态
   */
  cleanup(): void {
    this.clearButtons();
    this.isUpdating = false;
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
 * 根据qr--isEnabled状态处理容器
 */
function checkQrEnabledStatus() {
  const qrEnabledElement = $('#qr--isEnabled');
  isQrEnabled = qrEnabledElement.length > 0 ? qrEnabledElement.prop('checked') : false;

  const sendForm = $('#send_form');
  if (sendForm.length === 0) {
    return;
  }

  const qrBarLength = $('#send_form #qr--bar').length;

  if (qrBarLength === 0) {
    if (!sendForm.find('#qr--bar').length) {
      sendForm.append('<div class="flex-container flexGap5" id="qr--bar"></div>');
      log.info('[ScriptManager] 创建qr--bar容器（qr未启用或不存在）');
    }
  }
}

/**
 * 检查qr--isCombined状态
 */
function checkQrCombinedStatus() {
  const qrCombinedElement = $('#qr--isCombined');
  isCombined = qrCombinedElement.length > 0 ? qrCombinedElement.prop('checked') : false;

  if (!isQrEnabled) {
    const $qrBar = $('#send_form #qr--bar').first();
    if ($qrBar.length > 0 && isCombined) {
      const isThButtonExist = $qrBar.find('.qr--buttons.qr--color').length > 0;
      if (!isThButtonExist) {
        if (!$qrBar.find('.qr--buttons.qr--color').length) {
          $qrBar.append('<div class="qr--buttons qr--color"></div>');
          log.info('[ScriptManager] 创建combined按钮容器');
        }
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
}
