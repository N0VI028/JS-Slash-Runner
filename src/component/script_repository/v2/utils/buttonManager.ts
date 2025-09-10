import { eventSource } from '@sillytavern/script';
import { getStringHash } from '@sillytavern/scripts/utils';
import log from 'loglevel';
import type { Script } from '../schemas/script.schema';

/**
 * V2 按钮管理（独立于 V1，实现逻辑一致，不引用 V1 代码）
 */

function getButtonId(scriptId: string, name: string): string {
  return `${scriptId}_${getStringHash(name)}`;
}

let isQrEnabled = false;
let isCombined = false;

abstract class ButtonBase {
  id: string;
  name: string;
  visible: boolean;
  scriptId: string;

  constructor(name: string, scriptId: string, visible: boolean = true) {
    this.id = getButtonId(scriptId, name);
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

class ScriptButton extends ButtonBase {
  render(): string {
    return `<div class="qr--button menu_button interactable" id="${this.id}">${this.name}</div>`;
  }

  bindEvents(): void {
    const selector = `#${this.id}`;
    $(selector).off('click.v2button');
    $(selector).on('click.v2button', () => {
      eventSource.emit(this.id);
      log.info(`[V2Button] 点击按钮: ${this.id}`);
    });
    $(selector).off('pointerdown.v2button');
    $(selector).on('pointerdown.v2button', function (event) {
      // @ts-ignore
      event.originalEvent?.preventDefault?.();
    });
  }
}

function createScriptButton(name: string, scriptId: string, visible: boolean = true): ButtonBase {
  return new ScriptButton(name, scriptId, visible);
}

export class ButtonManagerV2 {
  private buttonsByScript: Map<string, ButtonBase[]> = new Map();
  private isUpdating = false;

  /**
   * 初始化（检测/创建容器，读取开关状态）
   */
  public init(): void {
    this.checkQrEnabledStatus();
    this.checkQrCombinedStatus();
    this.ensureQrBar();
  }

  private getScriptContainerId(scriptId: string): string {
    return `script_container_${scriptId}`;
  }

  private ensureQrBar(): void {
    const sendForm = $('#send_form');
    if (sendForm.length === 0) return;
    const qrBar = sendForm.find('#qr--bar');
    if (qrBar.length === 0) {
      sendForm.append('<div class="flex-container flexGap5" id="qr--bar"></div>');
      log.info('[V2Button] 创建qr--bar容器');
    }
  }

  private checkQrEnabledStatus(): void {
    const qrEnabledElement = $('#qr--isEnabled');
    isQrEnabled = qrEnabledElement.length > 0 ? Boolean(qrEnabledElement.prop('checked')) : false;
    // 当未启用时也需要保证 qr--bar 存在
    this.ensureQrBar();
  }

  private checkQrCombinedStatus(): void {
    const qrCombinedElement = $('#qr--isCombined');
    isCombined = qrCombinedElement.length > 0 ? Boolean(qrCombinedElement.prop('checked')) : false;

    if (!isQrEnabled) {
      // 在未启用QR时，如果 combined 打开，确保有一个 .qr--buttons 容器
      const $qrBar = $('#send_form #qr--bar').first();
      if ($qrBar.length > 0 && isCombined) {
        if ($qrBar.find('.qr--buttons').length === 0) {
          $qrBar.append('<div class="qr--buttons"></div>');
          log.info('[V2Button] 创建combined按钮容器');
        }
      }
    }
  }

  /**
   * 为指定脚本添加所有可见按钮
   */
  public addButtonsForScript(script: Script): void {
    if (!script?.buttons || script.buttons.length === 0) return;
    if (this.isUpdating) return;

    const visibleButtons = script.buttons
      .filter(btn => btn && btn.visible)
      .map(btn => createScriptButton(btn.name, script.id, btn.visible));

    if (visibleButtons.length === 0) return;

    this.isUpdating = true;
    try {
      this.init();
      this.addButtonsGroup(visibleButtons, script.id);
    } finally {
      setTimeout(() => (this.isUpdating = false), 50);
    }
  }

  /**
   * 删除指定脚本的按钮容器
   */
  public removeButtonsByScriptId(scriptId: string): void {
    const containerId = this.getScriptContainerId(scriptId);
    $(`#${containerId}`).remove();
    this.buttonsByScript.delete(scriptId);
  }

  /**
   * 清除所有按钮
   */
  public clearButtons(): void {
    for (const scriptId of this.buttonsByScript.keys()) {
      const containerId = this.getScriptContainerId(scriptId);
      $(`#${containerId}`).remove();
    }
    this.buttonsByScript.clear();
  }

  /**
   * 脚本编辑保存后，重建按钮（不重启脚本）
   */
  public rebuildButtonsForScript(script: Script): void {
    this.removeButtonsByScriptId(script.id);
    this.addButtonsForScript(script);
  }

  private addButtonsGroup(buttons: ButtonBase[], scriptId: string): void {
    if (buttons.length === 0) return;

    const containerId = this.getScriptContainerId(scriptId);
    $(`#${containerId}`).remove();

    let containerHtml = `<div id="${containerId}" class="qr--buttons th--button">`;
    for (const button of buttons) {
      containerHtml += button.render();
    }
    containerHtml += '</div>';

    const $sendForm = $('#send_form');
    const $qrBar = $sendForm.find('#qr--bar');
    if ($qrBar.length === 0) {
      log.warn('[V2Button] qr--bar容器不存在，无法添加按钮');
      return;
    }

    if (isCombined) {
      const $combinedContainer = $qrBar.find('.qr--buttons').first();
      if ($combinedContainer.length > 0) {
        $combinedContainer.append(containerHtml);
        log.info(`[V2Button] 按钮添加到combined容器: ${scriptId}`);
      } else {
        $qrBar.append(containerHtml);
        log.info(`[V2Button] 按钮添加到qr--bar（无combined容器）: ${scriptId}`);
      }
    } else {
      $qrBar.append(containerHtml);
      log.info(`[V2Button] 按钮添加到qr--bar: ${scriptId}`);
    }

    // 记录并绑定事件
    this.buttonsByScript.set(
      scriptId,
      buttons.map(btn => {
        btn.bindEvents();
        return btn;
      }),
    );
  }
}

export const buttonManagerV2 = new ButtonManagerV2();
