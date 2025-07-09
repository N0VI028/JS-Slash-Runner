import { VariableCardFactory } from '@/component/variable_manager/card';
import { VariableModel } from '@/component/variable_manager/model';
import { VariableSyncService } from '@/component/variable_manager/sync';
import { VariableDataType, VariableItem, VariableType } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';
import { VariableView } from '@/component/variable_manager/view';

import log from 'loglevel';

export class VariableController {
  /**
   * 变量数据模型
   */
  private model: VariableModel;

  /**
   * 变量视图
   */
  private view: VariableView;

  /**
   * 变量同步服务
   */
  private syncService: VariableSyncService;

  /**
   * 变量卡片工厂
   */
  private cardFactory: VariableCardFactory;

  /**
   * 构造函数
   * @param model 数据模型
   * @param view 视图
   * @param syncService 同步服务
   * @param cardFactory 卡片工厂
   */
  constructor(
    model: VariableModel,
    view: VariableView,
    syncService: VariableSyncService,
    cardFactory: VariableCardFactory,
  ) {
    this.model = model;
    this.view = view;
    this.syncService = syncService;
    this.cardFactory = cardFactory;
  }

  /**
   * 初始化控制器
   * @param container UI容器
   */
  public async init(container: JQuery<HTMLElement>): Promise<void> {
    this.view.initUI();
    this.bindEvents(container);
    await this.syncService.initCurrentType();
    await this.syncService.setCurrentType('global');
    await this.loadVariables('global');
  }

  /**
   * 绑定UI事件
   * @param container UI容器
   */
  private bindEvents(container: JQuery<HTMLElement>): void {
    container.find('.tab-item').on('click', this.handleTabChange.bind(this));
    container.on('click', '.add-list-item', this.handleAddListItem.bind(this));
    container.on('click', '.list-item-delete', this.handleDeleteListItem.bind(this));
    container.on('click', '.delete-btn', this.handleDeleteVariableCard.bind(this));
    container.on('click', '.save-btn', this.handleSaveVariableCard.bind(this));
    container.on('click', '#add-variable', this.handleAddVariable.bind(this));
    container.on('click', '#clear-all', this.handleClearAll.bind(this));
    container.on('click', '#filter-icon', this.handleFilterIconClick.bind(this));
    container.on('change', '.filter-checkbox', this.handleFilterOptionChange.bind(this));
    container.on('input', '#variable-search', this.handleVariableSearch.bind(this));
    container.on('click', '#floor-filter-btn', this.handleFloorRangeFilter.bind(this));
    container.on('nested-card:changed', '.variable-card', this.handleNestedCardChanged.bind(this));
  }

  /**
   * 加载变量
   * @param type 变量类型
   */
  public async loadVariables(type: VariableType): Promise<void> {
    const variables = await this.model.loadFromTavern(type);

    if (variables.length === 0) {
      toastr.warning(`${type}变量为空`);
      return;
    }

    if (type === 'message') {
      this.view.container.find('#floor-filter-container').show();
      const [minFloor, maxFloor] = this.model.getFloorRange();
      this.view.updateFloorRangeInputs(minFloor, maxFloor);
    } else {
      this.view.container.find('#floor-filter-container').hide();
    }

    this.view.refreshVariableCards(type, variables);

    this.applyFilters();
  }

  /**
   * 处理标签页切换
   * @param event 点击事件
   */
  private async handleTabChange(event: JQuery.ClickEvent): Promise<void> {
    const target = $(event.currentTarget);
    const tabId = target.attr('id');

    if (!tabId) return;

    const type = tabId.replace('-tab', '') as VariableType;
    const currentType = this.model.getActiveVariableType();

    if (type === currentType) return;

    this.view.setActiveTab(type);

    await this.syncService.setCurrentType(type);
    await this.loadVariables(type);
  }

  /**
   * 处理添加列表项
   * @param event 点击事件
   */
  private handleAddListItem(event: JQuery.ClickEvent): void {
    const button = $(event.currentTarget);
    const listContainer = button.siblings('.list-items-container');

    const newItem = $(`
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input" placeholder="输入变量内容"></textarea>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `);

    listContainer.append(newItem);
    newItem.find('textarea').focus();
  }

  /**
   * 处理删除列表项
   * @param event 点击事件
   */
  private handleDeleteListItem(event: JQuery.ClickEvent): void {
    const button = $(event.currentTarget);
    const listItem = button.closest('.list-item');

    listItem.css({
      'background-color': 'rgba(255, 0, 0, 0.2)',
      transition: 'all 0.3s ease',
    });

    setTimeout(() => {
      listItem.css({
        transform: 'scale(0.9)',
        opacity: '0.7',
      });

      setTimeout(() => {
        listItem.remove();
      }, 200);
    }, 50);
  }

  /**
   * 处理删除变量卡片
   * @param event 点击事件
   */
  private async handleDeleteVariableCard(event: JQuery.ClickEvent): Promise<void> {
    const button = $(event.currentTarget);
    const card = button.closest('.variable-card');
    const variable_id = card.attr('data-variable-id') || '';

    const type = this.model.getActiveVariableType();

    if (button.hasClass('object-delete-btn')) {
      return;
    }

    this.view.showConfirmDialog(`确定要删除变量吗？此操作无法撤销。`, async confirmed => {
      if (confirmed) {
        try {
          const isRemoved = this.model.removeFromMap(variable_id);
          if (isRemoved) {
            await this.model.saveAllVariables(type);
            this.view.removeVariableCard(variable_id);
          }
        } catch (error) {
          log.error(`[VariableManager] 删除变量失败:`, error);
        }
      }
    });
  }

  /**
   * 处理添加变量
   */
  private async handleAddVariable(): Promise<void> {
    const type = this.model.getActiveVariableType();
    this.view.showAddVariableDialog((dataType, floorId) => {
      this.view.addNewVariableCard(type, dataType, floorId);
      this.applyFilters();
    });
  }

  /**
   * 处理保存变量卡片
   * @param event 点击事件
   */
  private async handleSaveVariableCard(event: JQuery.ClickEvent): Promise<void> {
    const button = $(event.currentTarget);
    const card = button.closest('.variable-card');
    const type = this.model.getActiveVariableType();
    const dataType = VariableManagerUtil.inferDataType(this.cardFactory.getVariableFromCard(card));

    if (dataType == 'object') {
      this.syncObjectCardData(card);
    }

    let message_id: number | undefined = undefined;
    if (type === 'message') {
      const floorIdStr = card.attr('data-floor-id');
      if (floorIdStr) {
        message_id = parseInt(floorIdStr);
      }
    }

    let newVariable: VariableItem = {
      name: this.view.getVariableCardName(card),
      value: this.cardFactory.getVariableFromCard(card)?.value,
      dataType: dataType,
      id: card.attr('data-variable-id') || '',
      ...(message_id !== undefined && { message_id }),
    };

    if (newVariable.name == undefined || newVariable.name.trim() === '') {
      toastr.error('变量名不能为空');
      return;
    }

    let sameNameVariables: VariableItem[];
    if (type === 'message' && message_id !== undefined) {
      sameNameVariables = this.model.getVariablesByMessageId(message_id).filter(v => v.name === newVariable.name);
    } else {
      sameNameVariables = this.model.getVariablesByName(newVariable.name);
    }
    
    const otherSameNameVariables = sameNameVariables.filter(v => v.id !== newVariable.id);
    if (otherSameNameVariables.length > 0) {
      toastr.error('变量名重复');
      return;
    }

    try {
      if (newVariable.id && this.model.getVariableById(newVariable.id)) {
        this.model.updateInMap(newVariable.id, newVariable.name, newVariable.value, message_id);
      } else {
        const addedVariable = this.model.addToMap(newVariable.name, newVariable.value, message_id);
        newVariable.id = addedVariable.id;
        card.attr('data-variable-id', newVariable.id);
      }

      if (type === 'message' && message_id !== undefined) {
        await this.model.saveAllVariables(type, message_id);
      } else {
        await this.model.saveAllVariables(type);
      }

      this.view.addAnimation(card, 'variable-changed', () => {});
    } catch (error) {
      log.error(`[VariableManager] 保存变量失败:`, error);
      toastr.error(`保存变量失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理清除所有变量
   */
  private async handleClearAll(): Promise<void> {
    const type = this.model.getActiveVariableType();

    this.view.showConfirmDialog(
      `确定要清除所有${this.getVariableTypeName(type)}变量吗？此操作不可撤销。`,
      async confirmed => {
        if (confirmed) {
          try {
            await this.model.clearAllVariables(type);
            const container = this.view.container.find(`#${type}-content .variable-list`);
            container.empty();
            if (type == 'message') {
              const floorContainer = this.view.container.find(`#${type}-content .floor-variables-container`);
              floorContainer.empty();
            }
            toastr.success(`已清除所有${this.getVariableTypeName(type)}变量`);
          } catch (error: any) {
            log.error(`[VariableManager] 清除${type}变量失败:`, error);
            toastr.error(`清除${this.getVariableTypeName(type)}变量时出错: ${error.message || '未知错误'}`);
          }
        }
      },
    );
  }

  /**
   * 处理筛选图标点击
   */
  private handleFilterIconClick(): void {
    const $filterOptions = this.view.container.find('.filter-options');
    $filterOptions.toggle();
  }

  /**
   * 处理筛选选项变更
   * @param event 变更事件
   */
  private handleFilterOptionChange(event: JQuery.ChangeEvent): void {
    const $checkbox = $(event.currentTarget);
    const type = $checkbox.data('type') as VariableDataType;
    const isChecked = $checkbox.is(':checked');

    this.model.updateFilterState(type, isChecked);
    this.applyFilters();
  }

  /**
   * 处理变量搜索
   * @param event 输入事件
   */
  private handleVariableSearch(event: JQuery.TriggeredEvent): void {
    const keyword = $(event.currentTarget).val() as string;
    this.model.updateSearchKeyword(keyword);
    this.applyFilters();
  }

  /**
   * 应用筛选
   */
  private applyFilters(): void {
    const filterState = this.model.getFilterState();
    const searchKeyword = this.model.getSearchKeyword();

    this.view.applyClientSideFilters(filterState, searchKeyword);
  }

  /**
   * 处理楼层范围筛选
   */
  private handleFloorRangeFilter(): void {
    const $minInput = this.view.container.find('#floor-min');
    const $maxInput = this.view.container.find('#floor-max');

    const minVal = $minInput.val() as string;
    const maxVal = $maxInput.val() as string;

    const min = minVal.trim() ? parseInt(minVal, 10) : null;
    const max = maxVal.trim() ? parseInt(maxVal, 10) : null;

    if ((minVal.trim() && isNaN(min!)) || (maxVal.trim() && isNaN(max!))) {
      this.view.showFloorFilterError('请输入有效的数字');
      return;
    }

    if (min !== null && min < 0) {
      this.view.showFloorFilterError('最小楼层不能小于0');
      return;
    }

    if (max !== null && max < 0) {
      this.view.showFloorFilterError('最大楼层不能小于0');
      return;
    }

    if (min !== null && max !== null && min > max) {
      this.view.showFloorFilterError('最小值不能大于最大值');
      return;
    }

    if (min === null && max === null) {
      this.view.showFloorFilterError('请至少设置最小楼层或最大楼层');
      return;
    }

    this.view.hideFloorFilterError();

    const effectiveMin = min ?? 0;
    const effectiveMax = max ?? 9999;

    this.applyFloorRangeAndReload(effectiveMin, effectiveMax);
  }

  /**
   * 应用楼层范围并重新加载变量
   * @param min 最小楼层
   * @param max 最大楼层
   */
  private async applyFloorRangeAndReload(min: number, max: number): Promise<void> {
    try {
      this.model.updateFloorRange(min, max);
      this.view.updateFloorRangeInputs(min, max);
      await this.loadVariables('message');
    } catch (error: any) {
      log.error(`[VariableManager] 应用楼层范围并重新加载变量失败:`, error);
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    try {
      this.syncService.cleanup();
    } catch (error) {
      log.error(`[VariableManager] 清理资源失败:`, error);
    }
  }

  /**
   * 同步对象卡片的视图数据
   * @param card 变量卡片
   */
  private syncObjectCardData(card: JQuery<HTMLElement>): void {
    const currentMode = card.attr('data-view-mode') || 'card';

    if (currentMode === 'card') {
      const objectValue = this.cardFactory.getVariableFromCard(card);
      card.find('.json-input').val(JSON.stringify(objectValue?.value, null, 2));
    }
  }

  /**
   * 处理嵌套卡片变更事件
   * @param event 事件对象
   */
  private async handleNestedCardChanged(event: JQuery.TriggeredEvent): Promise<void> {
    const card = $(event.currentTarget);

    const saveBtn = card.find('.variable-action-btn.save-btn');
    if (saveBtn.length > 0) {
      saveBtn.trigger('click');
    }
  }

  /**
   * 获取变量类型的中文名称
   * @param type 变量类型
   * @returns 中文名称
   */
  private getVariableTypeName(type: VariableType): string {
    switch (type) {
      case 'global':
        return '全局';
      case 'character':
        return '角色';
      case 'chat':
        return '聊天';
      case 'message':
        return '消息';
      default:
        return type;
    }
  }
}
