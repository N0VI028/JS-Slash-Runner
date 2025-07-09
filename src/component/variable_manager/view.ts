import { VariableCardFactory } from '@/component/variable_manager/card';
import { IDomUpdater } from '@/component/variable_manager/sync';
import { VariableDataType, VariableItem, VariableType } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';
import { getLastMessageId } from '@/function/util';

import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import { getSortableDelay, uuidv4 } from '@sillytavern/scripts/utils';

import log from 'loglevel';

export interface IController {
  cleanup(): void;
}

export class VariableView implements IDomUpdater {
  /**
   * 最小浮窗宽度（像素）
   */
  private static readonly MIN_DIALOG_WIDTH = 300;

  /**
   * 最小浮窗高度（像素）
   */
  private static readonly MIN_DIALOG_HEIGHT = 250;

  /**
   * UI容器
   */
  public container: JQuery<HTMLElement>;

  /**
   * 变量卡片
   */
  public cardFactory: VariableCardFactory;

  /**
   * 浮窗元素
   */
  private dialog: JQuery<HTMLElement> | null = null;

  /**
   * 控制器引用
   */
  private controller: IController | null = null;

  /**
   * @param container 变量管理器容器
   */
  constructor(container: JQuery<HTMLElement>) {
    this.container = container;
    this.cardFactory = new VariableCardFactory(this.showVariableTypeDialog.bind(this));
  }

  /**
   * 设置控制器引用
   * @param controller 变量控制器
   */
  public setController(controller: IController): void {
    this.controller = controller;
  }

  /**
   * 初始化UI
   */
  public initUI(): void {
    this.container.find('#global-tab').addClass('active');
    this.container.find('#global-content').addClass('active');

    // 初始化时隐藏楼层筛选控件（仅在消息标签页时才显示）
    this.container.find('#floor-filter-container').hide();

    this.initSortable();
    this.initFloorFilter();
  }

  /**
   * 初始化可排序功能
   */
  private initSortable(): void {
    this.container.find('.list-items-container').sortable({
      delay: getSortableDelay(),
      handle: '.drag-handle',
      stop: function (_event, ui) {
        const listContainer = $(ui.item).closest('.list-items-container');

        const items: string[] = [];
        listContainer.find('.variable-content-input').each(function () {
          items.push($(this).val() as string);
        });

        const processedItems = _.uniqBy(items, item => item.trim().toLowerCase());

        if (!_.isEqual(items, processedItems)) {
          listContainer.empty();
          processedItems.forEach(item => {
            const itemHtml = `
              <div class="list-item">
                <span class="drag-handle">☰</span>
                <textarea class="variable-content-input">${item}</textarea>
                <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
              </div>
            `;
            listContainer.append(itemHtml);
          });
        }

        listContainer.trigger('sortupdate');
      },
    });
  }

  /**
   * 初始化楼层筛选功能
   */
  private initFloorFilter(): void {
    this.container.find('#floor-filter-btn').on('click', () => {
      const minInput = this.container.find('#floor-min').val() as string;
      const maxInput = this.container.find('#floor-max').val() as string;

      // 允许空值，但如果有值就必须是有效数字
      const minVal = minInput.trim() ? parseInt(minInput, 10) : null;
      const maxVal = maxInput.trim() ? parseInt(maxInput, 10) : null;

      // 验证数字有效性
      if ((minInput.trim() && isNaN(minVal!)) || (maxInput.trim() && isNaN(maxVal!))) {
        this.showFloorFilterError('请输入有效的楼层数值');
        return;
      }

      // 验证楼层不能小于0
      if (minVal !== null && minVal < 0) {
        this.showFloorFilterError('最小楼层不能小于0');
        return;
      }

      if (maxVal !== null && maxVal < 0) {
        this.showFloorFilterError('最大楼层不能小于0');
        return;
      }

      // 验证范围逻辑：只有当两个值都存在时才比较大小
      if (minVal !== null && maxVal !== null && maxVal < minVal) {
        this.showFloorFilterError('最大楼层不能小于最小楼层');
        return;
      }

      // 至少需要设置一个值
      if (minVal === null && maxVal === null) {
        this.showFloorFilterError('请至少设置最小楼层或最大楼层');
        return;
      }

      this.hideFloorFilterError();
    });

    this.container.find('#floor-min, #floor-max').on('input', () => {
      const minInput = this.container.find('#floor-min').val() as string;
      const maxInput = this.container.find('#floor-max').val() as string;

      const minVal = minInput.trim() ? parseInt(minInput, 10) : null;
      const maxVal = maxInput.trim() ? parseInt(maxInput, 10) : null;

      // 实时验证楼层不能小于0
      if (minVal !== null && minVal < 0) {
        this.showFloorFilterError('最小楼层不能小于0');
        return;
      }

      if (maxVal !== null && maxVal < 0) {
        this.showFloorFilterError('最大楼层不能小于0');
        return;
      }

      // 实时验证范围逻辑
      if (minVal !== null && maxVal !== null && !isNaN(minVal) && !isNaN(maxVal) && maxVal < minVal) {
        this.showFloorFilterError('最大楼层不能小于最小楼层');
      } else {
        this.hideFloorFilterError();
      }
    });
  }

  /**
   * 显示楼层筛选错误信息
   * @param message 错误信息
   */
  public showFloorFilterError(message: string): void {
    const $errorEl = this.container.find('#floor-filter-error');
    $errorEl.text(message).show();
  }

  /**
   * 隐藏楼层筛选错误信息
   */
  public hideFloorFilterError(): void {
    this.container.find('#floor-filter-error').hide();
  }

  /**
   * 更新楼层筛选输入框的值
   * @param min 最小楼层值
   * @param max 最大楼层值
   */
  public updateFloorRangeInputs(min: number | null, max: number | null): void {
    this.container.find('#floor-min').val(min !== null ? min.toString() : '');
    this.container.find('#floor-max').val(max !== null ? max.toString() : '');
    this.hideFloorFilterError();
  }

  /**
   * 获取当前活动的变量类型
   * @returns 当前活动的变量类型
   */
  private getActiveVariableType(): VariableType {
    return (this.container.find('.tab-item.active').attr('id')?.replace('-tab', '') as VariableType) || 'chat';
  }

  /**
   * 设置活动标签页
   * @param type 要激活的变量类型
   */
  public setActiveTab(type: VariableType): void {
    this.container.find('.tab-item').removeClass('active');
    this.container.find('.tab-content').removeClass('active');

    this.container.find(`#${type}-tab`).addClass('active');
    this.container.find(`#${type}-content`).addClass('active');

    const $floorFilterContainer = this.container.find('#floor-filter-container');
    if (type === 'message') {
      $floorFilterContainer.show();
      const [minFloor, maxFloor] = this.getFloorRange();

      // 如果楼层范围为空，设置默认范围
      if (minFloor === null && maxFloor === null) {
        const lastMessageId = getLastMessageId();
        const newMinFloor = Math.max(0, lastMessageId - 4);
        const newMaxFloor = lastMessageId;
        (this.controller as any).model.updateFloorRange(newMinFloor, newMaxFloor);
        this.updateFloorRangeInputs(newMinFloor, newMaxFloor);
      }
    } else {
      $floorFilterContainer.hide();
    }
  }

  private getFloorRange(): [number | null, number | null] {
    const minVal = this.container.find('#floor-min').val() as string;
    const maxVal = this.container.find('#floor-max').val() as string;

    let minFloor = minVal && minVal.trim() ? parseInt(minVal, 10) : null;
    let maxFloor = maxVal && maxVal.trim() ? parseInt(maxVal, 10) : null;

    // 确保楼层不小于0
    if (minFloor !== null) {
      minFloor = Math.max(0, minFloor);
    }
    if (maxFloor !== null) {
      maxFloor = Math.max(0, maxFloor);
    }

    return [
      minFloor !== null && !isNaN(minFloor) ? minFloor : null,
      maxFloor !== null && !isNaN(maxFloor) ? maxFloor : null,
    ];
  }

  /**
   * 刷新变量卡片
   * @param type 变量类型
   * @param variables 过滤后的变量列表
   */
  public refreshVariableCards(type: VariableType, variables: VariableItem[]): void {
    // 更新标签文本
    this.container.find('.variable-type-label').text(`${type}变量`);

    // 获取当前活动的内容容器
    const activeContent = this.container.find(`#${type}-content`);
    const $variableList = activeContent.find('.variable-list');

    const scrollTop = $variableList.scrollTop() || 0;

    $variableList.empty();

    if (variables.length === 0) {
      $variableList.html('<div class="empty-state"><p>暂无变量</p></div>');
      return;
    }

    // 根据变量类型选择不同的渲染方式
    if (type === 'message') {
      this.renderMessageVariablesByFloor($variableList, variables);
      $variableList.scrollTop(scrollTop);
    } else {
      for (const variable of variables) {
        const card = this.cardFactory.createCard(variable);
        $variableList.append(card);
      }
      $variableList.scrollTop(scrollTop);
    }
  }

  /**
   * 应用筛选
   * @param filterState 筛选状态
   * @param searchKeyword 搜索关键字
   */
  public applyClientSideFilters(filterState: Record<VariableDataType, boolean>, searchKeyword: string): void {
    const activeType = this.getActiveVariableType();
    const $variableCards = this.container.find(`#${activeType}-content .variable-card`);
    let visibleCount = 0;

    $variableCards.each((_, card) => {
      const $card = $(card);
      const cardType = $card.attr('data-type') as VariableDataType;
      const cardName = ($card.find('.variable-title').val() as string) || '';

      const typeVisible = filterState[cardType];
      const keywordVisible = !searchKeyword || cardName.toLowerCase().includes(searchKeyword.toLowerCase());

      if (typeVisible && keywordVisible) {
        $card.show();
        visibleCount++;
      } else {
        $card.hide();
      }
    });

    // 更新空状态显示
    this.updateFilterEmptyState(activeType, visibleCount);
  }

  /**
   * 更新筛选后的空状态显示
   * @param type 变量类型
   * @param visibleCount 可见卡片数量
   */
  private updateFilterEmptyState(type: VariableType, visibleCount: number): void {
    const $variableList = this.container.find(`#${type}-content .variable-list`);
    const $existingEmptyState = $variableList.find('.filter-empty-state');

    if (visibleCount === 0) {
      // 检查是否有变量卡片（即使被隐藏）
      const totalCards = $variableList.find('.variable-card').length;
      if (totalCards > 0) {
        if ($existingEmptyState.length === 0) {
          $variableList.append('<div class="filter-empty-state"><p>没有符合筛选条件的变量</p></div>');
        }
      }
    } else {
      $existingEmptyState.remove();
    }
  }

  /**
   * 按楼层渲染message类型的变量
   * @param container 容器元素
   * @param variables 变量列表
   */
  private renderMessageVariablesByFloor(container: JQuery<HTMLElement>, variables: VariableItem[]): void {
    // 按楼层分组变量
    const floorGroups: Map<number, VariableItem[]> = new Map();

    for (const variable of variables) {
      if (variable.message_id !== undefined) {
        if (!floorGroups.has(variable.message_id)) {
          floorGroups.set(variable.message_id, []);
        }
        floorGroups.get(variable.message_id)!.push(variable);
      }
    }

    const sortedFloors = Array.from(floorGroups.keys()).sort((a, b) => b - a); // 降序排列，最新楼层在上

    for (let i = 0; i < sortedFloors.length; i++) {
      const floor = sortedFloors[i];
      const floorVariables = floorGroups.get(floor)!;
      const isExpanded = i === 0; // 只展开最新一层楼

      const $panel = this.createFloorPanel(floor, isExpanded);
      const $panelBody = $panel.find('.floor-panel-body');

      for (const variable of floorVariables) {
        const card = this.cardFactory.createCard(variable);
        card.attr('data-floor-id', floor.toString());
        $panelBody.append(card);
      }

      container.append($panel);
    }
  }

  /**
   * 创建楼层折叠面板
   * @param floor 楼层号
   * @param isExpanded 是否默认展开
   * @returns 折叠面板jQuery对象
   */
  private createFloorPanel(floor: number, isExpanded: boolean): JQuery<HTMLElement> {
    const titleContent = `# ${floor} 楼`;

    const $panel = $(`
      <div class="floor-panel" data-floor="${floor}">
        <div class="floor-panel-header flex spaceBetween alignItemsCenter">
          <div class="floor-panel-title">${titleContent}</div>
          <div class="floor-panel-icon ${isExpanded ? 'expanded' : ''}">
            <i class="fa-solid fa-chevron-down"></i>
          </div>
        </div>
        <div class="floor-panel-body ${isExpanded ? 'expanded' : ''}"></div>
      </div>
    `);

    $panel.find('.floor-panel-header').on('click', function () {
      const $this = $(this);
      const $icon = $this.find('.floor-panel-icon');
      const $body = $this.closest('.floor-panel').find('.floor-panel-body');

      $icon.toggleClass('expanded');
      $body.toggleClass('expanded');
    });

    return $panel;
  }

  /**
   * 创建新变量卡片
   * @param type 变量类型
   * @param dataType 变量数据类型
   * @param floorId 楼层ID(仅用于message类型)
   */
  public addNewVariableCard(type: VariableType, dataType: VariableDataType, floorId?: number): void {
    const $content = this.container.find(`#${type}-content`).find('.variable-list');
    $content.find('.empty-state').remove();

    const defaultVariable: VariableItem = {
      name: 'new_variable',
      value: VariableManagerUtil.getDefaultValueForType(dataType),
      dataType: dataType,
      id: uuidv4(),
    };

    const newCard = this.cardFactory.createCard(defaultVariable);
    newCard.attr('data-type', dataType);

    if (type === 'message' && floorId !== undefined) {
      this.addCardToFloorPanel($content, newCard, floorId);
    } else {
      $content.prepend(newCard);
      this.addAnimation(newCard, 'variable-added', () => {});
    }
  }

  /**
   * 将卡片添加到指定楼层面板
   * @param content 内容容器
   * @param card 卡片元素
   * @param floorId 楼层ID
   */
  private addCardToFloorPanel(content: JQuery<HTMLElement>, card: JQuery<HTMLElement>, floorId: number): void {
    let $floorPanel = content.find(`.floor-panel[data-floor="${floorId}"]`);

    if ($floorPanel.length === 0) {
      const $panel = this.createFloorPanel(floorId, true);
      this.insertFloorPanelInOrder(content, $panel, floorId);
      $floorPanel = $panel;
    }

    const $panelBody = $floorPanel.find('.floor-panel-body');

    if (!$panelBody.hasClass('expanded')) {
      $floorPanel.find('.floor-panel-icon').addClass('expanded');
      $panelBody.addClass('expanded');
    }

    card.attr('data-floor-id', floorId.toString());
    $panelBody.prepend(card);
    this.addAnimation(card, 'variable-added', () => {});
  }

  /**
   * 按楼层号顺序插入楼层面板
   * @param content 内容容器
   * @param panel 要插入的面板
   * @param floorId 楼层ID
   */
  private insertFloorPanelInOrder(content: JQuery<HTMLElement>, panel: JQuery<HTMLElement>, floorId: number): void {
    let inserted = false;
    content.find('.floor-panel').each(function () {
      const existingFloor = parseInt($(this).attr('data-floor') || '0');
      if (floorId > existingFloor) {
        $(this).before(panel);
        inserted = true;
        return false;
      }
      return undefined;
    });

    if (!inserted) {
      content.prepend(panel);
    }
  }

  /**
   * 获取变量卡片信息
   * @param card 卡片元素
   * @returns 卡片中的变量信息
   */
  public getVariableFromCard(card: JQuery<HTMLElement>): VariableItem | null {
    return this.cardFactory.getVariableFromCard(card);
  }

  /**
   * 获取变量卡片名称
   * @param card 卡片元素
   * @returns 卡片中的变量名称
   */
  public getVariableCardName(card: JQuery<HTMLElement>): string {
    const variable = this.getVariableFromCard(card);
    return variable?.name || '';
  }

  /**
   * 显示添加变量选择对话框
   * @param callback 选择后的回调函数
   */
  public async showAddVariableDialog(callback: (dataType: VariableDataType, floorId?: number) => void): Promise<void> {
    const currentType = this.getActiveVariableType();

    if (currentType === 'message') {
      await this.showFloorInputDialog(async floorId => {
        if (floorId === null) return;

        await this.showVariableTypeDialog(dataType => {
          callback(dataType, floorId);
        });
      });
      return;
    }

    await this.showVariableTypeDialog(dataType => {
      callback(dataType);
    });
  }

  /**
   * 显示楼层输入对话框
   * @param callback 输入完成后的回调函数
   */
  public async showFloorInputDialog(callback: (floorId: number | null) => void): Promise<void> {
    const content = $(`
      <div>
        <h3>输入楼层号码</h3>
        <div class="floor-input-dialog">
          <input type="number" id="floor-input" min="0" placeholder="请输入楼层号码" />
          <div id="floor-input-error" class="floor-filter-error" style="display: none">请输入有效的楼层号码</div>
        </div>
      </div>
    `);

    const $inputField = content.find('#floor-input');
    const $errorMsg = content.find('#floor-input-error');

    const lastMessageId = getLastMessageId();
    if (lastMessageId >= 0) {
      $inputField.val(lastMessageId);
    }

    // 添加输入验证
    $inputField.on('input', function () {
      const value = parseInt($(this).val() as string, 10);
      if ($(this).val() && (isNaN(value) || value < 0)) {
        $errorMsg.text('楼层号码不能小于0').show();
      } else {
        $errorMsg.hide();
      }
    });

    const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
    });

    if (!result) {
      callback(null);
      return;
    }

    const inputValue = $inputField.val() as string;
    const floorId = parseInt(inputValue, 10);

    if (!inputValue.trim() || isNaN(floorId)) {
      $errorMsg.text('请输入有效的楼层号码').show();
      setTimeout(() => this.showFloorInputDialog(callback), 100);
      return;
    }

    if (floorId < 0) {
      $errorMsg.text('楼层号码不能小于0').show();
      setTimeout(() => this.showFloorInputDialog(callback), 100);
      return;
    }

    callback(floorId);
  }

  /**
   * 显示变量类型选择对话框
   * @param callback 选择后的回调函数
   * @param floorId 楼层ID(仅用于message类型)
   */
  public async showVariableTypeDialog(callback: (dataType: VariableDataType) => void): Promise<void> {
    const content = $(`
      <div>
        <h3>选择变量类型</h3>
        <div class="variable-type-options">
          <div data-type="string"><i class="fa-regular fa-font"></i> 字符串</div>
          <div data-type="number"><i class="fa-regular fa-hashtag"></i> 数字</div>
          <div data-type="boolean"><i class="fa-regular fa-toggle-on"></i> 布尔值</div>
          <div data-type="array"><i class="fa-regular fa-list"></i> 数组</div>
          <div data-type="object"><i class="fa-regular fa-code"></i> 对象</div>
        </div>
      </div>
    `);

    content.find('.variable-type-options div').on('click', function () {
      const dataType = $(this).attr('data-type') as VariableDataType;
      callback(dataType);

      $('.popup').find('.popup-button-close').trigger('click');
    });

    await callGenericPopup(content, POPUP_TYPE.DISPLAY);
  }

  /**
   * 显示确认对话框
   * @param message 确认信息
   * @param callback 确认后的回调
   */
  public async showConfirmDialog(message: string, callback: (confirmed: boolean) => void): Promise<void> {
    const result = await callGenericPopup(message, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
    });

    callback(!!result);
  }

  /**
   * 渲染变量管理器浮窗
   * 创建可拖动、可调整大小的浮窗
   */
  public render(): void {
    this.unrender();

    this.dialog = $(`
      <div class="variable-manager-dialog">
        <div class="dialog-header">
          <div class="dialog-title">变量管理器</div>
          <div class="dialog-controls">
            <button class="dialog-toggle-btn" title="折叠/展开内容"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="dialog-close-btn"><i class="fa-solid fa-times"></i></button>
          </div>
        </div>
        <div class="dialog-content"></div>
        <div class="dialog-resize-handle"></div>
      </div>
    `);

    this.dialog.find('.dialog-content').append(this.container);

    this.dialog.find('.dialog-close-btn').on('click', () => {
      this.unrender();
    });

    this.dialog.find('.dialog-toggle-btn').on('click', () => {
      const $content = this.dialog!.find('.dialog-content');
      const $toggleBtn = this.dialog!.find('.dialog-toggle-btn i');

      $content.slideToggle(300, () => {
        if ($content.is(':visible')) {
          $toggleBtn.removeClass('fa-chevron-down').addClass('fa-chevron-up');
          this.dialog!.find('.dialog-resize-handle').show();
        } else {
          $toggleBtn.removeClass('fa-chevron-up').addClass('fa-chevron-down');
          this.dialog!.find('.dialog-resize-handle').hide();
        }
      });

      this.dialog!.toggleClass('content-collapsed');
    });

    $('body').append(this.dialog);

    this.initDraggableDialog();
    this.centerDialog();
    this.container.show();
  }

  /**
   * 关闭并清理变量管理器浮窗
   */
  public unrender(): void {
    if (this.dialog) {
      this.container.detach();
      this.dialog.remove();
      this.dialog = null;

      if (this.controller) {
        this.controller.cleanup();
      }
    }
  }

  /**
   * 初始化浮窗的拖动和调整大小功能
   */
  private initDraggableDialog(): void {
    if (!this.dialog) return;

    const isMobileDevice = isMobile();

    (this.dialog as any).draggable({
      handle: '.dialog-header',
      containment: 'window',
      start: () => {
        this.dialog?.addClass('dragging');
      },
      stop: () => {
        this.dialog?.removeClass('dragging');
      },
    });

    (this.dialog as any).resizable({
      // 桌面设备用所有边缘，移动设备仅用右下角
      handles: isMobileDevice ? 'se' : 'n,e,s,w,ne,se,sw,nw',
      minHeight: VariableView.MIN_DIALOG_HEIGHT,
      minWidth: VariableView.MIN_DIALOG_WIDTH,
      start: () => {
        this.dialog?.addClass('resizing');
      },
      stop: () => {
        this.dialog?.removeClass('resizing');
      },
    });

    this.dialog.find('.dialog-resize-handle').toggle(isMobileDevice);
  }

  /**
   * 将浮窗居中显示
   */
  private centerDialog(): void {
    if (!this.dialog) return;

    const windowWidth = $(window).width() || 0;
    const windowHeight = $(window).height() || 0;

    const dialogWidth = this.dialog.outerWidth() || VariableView.MIN_DIALOG_WIDTH;
    const dialogHeight = this.dialog.outerHeight() || VariableView.MIN_DIALOG_HEIGHT;

    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);

    this.dialog.css({
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed',
    });
  }

  public addVariableCard(variable: VariableItem): void {
    try {
      const newCard = this.cardFactory.createCard(variable);
      newCard.attr('data-type', variable.dataType);

      const activeType = this.getActiveVariableType();
      const $variableList = this.container.find(`#${activeType}-content .variable-list`);

      if (activeType === 'message' && variable.message_id !== undefined) {
        this.addCardToFloorPanel($variableList, newCard, variable.message_id);
      } else {
        $variableList.find('.empty-state').remove();
        $variableList.append(newCard);
        this.addAnimation(newCard, 'variable-added', () => {});
      }
    } catch (error) {
      log.error(`[VariableManager] 添加卡片"${variable.name}"失败:`, error);
    }
  }

  /**
   * 移除变量卡片
   * @param variable_id 变量ID
   */
  public removeVariableCard(variable_id: string): void {
    try {
      if (!variable_id) {
        log.warn(`[VariableManager] 变量ID为空，无法移除卡片`);
        return;
      }

      const $card = this.container.find(`.variable-card[data-variable-id="${variable_id}"]`);

      if ($card.length === 0) {
        log.warn(`[VariableManager] 未找到ID为"${variable_id}"的卡片`);
        return;
      }

      this.addAnimation($card, 'variable-deleted', () => {
        $card.remove();
        this.checkAndShowEmptyState();
      });
    } catch (error) {
      log.error(`[VariableManager] 移除卡片失败:`, error);
    }
  }

  /**
   * 检查并显示空状态提示
   */
  private checkAndShowEmptyState(): void {
    const activeType = this.getActiveVariableType();
    const $variableList = this.container.find(`#${activeType}-content .variable-list`);

    if ($variableList.find('.variable-card').length === 0) {
      $variableList.html('<div class="empty-state"><p>暂无变量</p></div>');
    }
  }

  /**
   * 更新变量卡片
   * @param variable 变量
   */
  public updateVariableCard(variable: VariableItem): void {
    try {
      const $card = this.container.find(`.variable-card[data-variable-id="${variable.id}"]`);

      if ($card.length === 0) {
        log.warn(`[VariableManager] 未找到ID为"${variable.id}"的卡片`);
        return;
      }

      // 创建新卡片替换旧卡片，保持一致性
      const newCard = this.cardFactory.createCard(variable);
      newCard.attr('data-type', variable.dataType);

      if (variable.message_id !== undefined) {
        newCard.attr('data-floor-id', variable.message_id.toString());
      }

      $card.replaceWith(newCard);
      this.addAnimation(newCard, 'variable-changed', () => {});
    } catch (error) {
      log.error(`[VariableManager] 更新卡片失败:`, error);
    }
  }

  /**
   * 显示键名输入对话框
   * @param callback 输入完成后的回调函数
   */
  public async showKeyNameInputDialog(callback: (keyName: string | null) => void): Promise<void> {
    const content = $(`
      <div>
        <h3>输入键名</h3>
        <div class="key-input-dialog">
          <input type="text" id="key-input" placeholder="请输入键名" />
          <div id="key-input-error" class="input-error" style="display: none">请输入有效的键名</div>
        </div>
      </div>
    `);

    const $inputField = content.find('#key-input');
    const $errorMsg = content.find('#key-input-error');

    const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
    });

    if (!result) {
      callback(null);
      return;
    }

    const keyName = $inputField.val() as string;
    if (!keyName || keyName.trim() === '') {
      $errorMsg.show();
      setTimeout(() => this.showKeyNameInputDialog(callback), 10);
      return;
    }

    callback(keyName.trim());
  }

  /**
   * 添加动画效果
   * @param element 要添加动画效果的元素
   * @param animationClass CSS动画类名
   * @param callback 动画结束后的回调
   */
  public addAnimation(element: JQuery<HTMLElement>, animationClass: string, callback: () => void): void {
    const namespace = `animation.${animationClass}`;

    element.addClass(animationClass);

    void element[0].offsetHeight;

    element.off(`animationend.${namespace}`);

    element.on(`animationend.${namespace}`, function () {
      $(this).off(`animationend.${namespace}`);
      $(this).removeClass(animationClass);
      callback();
    });
  }
}
