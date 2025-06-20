import { ScriptManager } from '@/component/script_repository/script_controller';
import { eventSource } from '@sillytavern/script';
import { Script } from '@/component/script_repository/types';

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

  // 渲染按钮HTML
  abstract render(): string;

  // 绑定事件
  abstract bindEvents(): void;

  // 移除按钮
  remove(): void {
    $(`#${this.id}`).remove();
  }
}

// 标准脚本按钮
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
      console.log(`[Script] 点击按钮：${this.id}`);
    });
  }
}

// 未来可以扩展不同类型的按钮
export class ButtonFactory {
  static createButton(type: string, name: string, scriptId: string, visible: boolean = true): Button {
    switch (type) {
      case 'script':
      default:
        return new ScriptButton(name, scriptId, visible);
    }
  }
}

// 按钮管理器
export class ButtonManager {
  private buttons: Button[] = [];

  // 将按钮从旧容器迁移到新容器
  migrateButtonsToNewContainer(oldContainerId: string, newContainerId: string): void {
    const $oldButtons = $(`#${oldContainerId} .qr--button`);
    const $newContainer = $(`#${newContainerId}`);

    if ($oldButtons.length && $newContainer.length) {
      $oldButtons.detach().appendTo($newContainer);

      // 重新绑定事件
      this.buttons.forEach(button => {
        button.bindEvents();
      });
    }
  }

  // 获取脚本容器ID
  private getScriptContainerId(scriptId: string): string {
    return `script_container_${scriptId}`;
  }

  // 从脚本数据创建按钮
  createButtonsFromScripts(
    globalScripts: Script[],
    characterScripts: Script[],
    isGlobalEnabled: boolean,
    isCharacterEnabled: boolean,
  ): void {
    this.clearButtons();

    // 检查是否有任何可见按钮
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

    // 处理全局脚本按钮
    if (isGlobalEnabled && hasGlobalVisibleButtons) {
      this.addScriptButtons(globalScripts);
    }

    // 处理角色脚本按钮
    if (isCharacterEnabled && hasCharacterVisibleButtons) {
      this.addScriptButtons(characterScripts);
    }
  }

  // 添加脚本按钮
  private addScriptButtons(scripts: Script[]): void {
    scripts.forEach(script => {
      if (script.enabled && script.buttons && script.buttons.length > 0) {
        // 筛选可见的按钮
        const visibleButtons = script.buttons
          .filter(buttonData => buttonData.visible)
          .map(buttonData => ButtonFactory.createButton('script', buttonData.name, script.id, buttonData.visible));

        if (visibleButtons.length > 0) {
          // 为每个脚本创建一个容器
          this.addButtonsGroup(visibleButtons, script.id);
        }
      }
    });
  }

  // 添加按钮组
  private addButtonsGroup(buttons: Button[], scriptId: string): void {
    if (buttons.length === 0) return;

    const containerId = this.getScriptContainerId(scriptId);

    $(`#${containerId}`).remove();

    // 创建新容器
    let containerHtml = `<div id="${containerId}" class="qr--buttons th--button">`;

    buttons.forEach(button => {
      this.buttons = this.buttons.filter(btn => btn.id !== button.id);
      this.buttons.push(button);
      containerHtml += button.render();
    });

    // 关闭容器标签
    containerHtml += '</div>';

    if (isCombined) {
      $('#send_form #qr--bar .qr--buttons').first().append(containerHtml);
    } else {
      $('#send_form #qr--bar').first().append(containerHtml);
    }

    buttons.forEach(button => button.bindEvents());
  }

  // 为指定脚本添加所有按钮
  addButtonsForScript(script: Script): void {
    if (!script.buttons || script.buttons.length === 0) return;

    // 筛选可见的按钮
    const visibleButtons = script.buttons
      .filter(buttonData => buttonData.visible)
      .map(buttonData => ButtonFactory.createButton('script', buttonData.name, script.id, buttonData.visible));

    if (visibleButtons.length > 0) {
      // 为脚本创建一个容器并添加所有按钮
      this.addButtonsGroup(visibleButtons, script.id);
    }
  }

  // 移除按钮
  removeButtonsByScriptId(scriptId: string): void {
    const containerId = this.getScriptContainerId(scriptId);
    $(`#${containerId}`).remove();
  }

  // 移除所有按钮
  clearButtons(): void {
    this.buttons.forEach(btn => btn.remove());
    this.buttons = [];

    // 移除所有脚本容器
    $('.th-button').remove();
  }
}

// 创建按钮管理器实例
const buttonManager = new ButtonManager();

function _setButtonLogic() {
  const scriptManager = ScriptManager.getInstance();

  // 获取脚本数据
  const globalScripts = scriptManager.getGlobalScripts();
  const characterScripts = scriptManager.getCharacterScripts();
  const isGlobalEnabled = scriptManager.isGlobalScriptEnabled;
  const isCharacterEnabled = scriptManager.isCharacterScriptEnabled;

  // 重新创建按钮
  buttonManager.createButtonsFromScripts(globalScripts, characterScripts, isGlobalEnabled, isCharacterEnabled);
}

/**
 * qr启用或者禁用时重新添加按钮
 */
export function bindQrEnabledChangeListener() {
  $(`#qr--isEnabled`).on('change', () => {
    isQrEnabled = $('#qr--isEnabled').prop('checked');
    checkQrEnabledStatusAndAddButton();
    console.log('[script_manager] 创建按钮');
  });

  $('#qr--isCombined').on('change', () => {
    isCombined = $('#qr--isCombined').prop('checked');
    checkQrEnabledStatusAndAddButton();
    console.log('[script_manager] 创建按钮');
  });

  $('#qr--global-setListAdd, #qr--chat-setListAdd, .qr--del').on('click', () => {
    checkQrEnabledStatusAndAddButton();
    console.log('[script_manager] 创建按钮');
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
      // QR未启用，且之前没有创建容器，则创建
      $('#send_form').append('<div class="flex-container flexGap5" id="qr--bar"></div>');
    } else {
      // 如果容器存在，则移除多余的容器
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
