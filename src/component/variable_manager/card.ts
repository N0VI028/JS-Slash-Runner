import { VariableDataType, VariableItem } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';

import { getSortableDelay } from '@sillytavern/scripts/utils';

import log from 'loglevel';

declare const toastr: any;

export class VariableCardFactory {
  private defaultTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>;

  /**
   * 构造函数
   * @param defaultTypeDialogCallback 默认的类型选择对话框回调函数
   */
  constructor(defaultTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>) {
    this.defaultTypeDialogCallback = defaultTypeDialogCallback;
    this.setupGlobalEventDelegation();
  }

  /**
   * 设置全局事件委托
   */
  private setupGlobalEventDelegation(): void {
    $(document).on('click', '.variable-action-btn.object-save-btn', event => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      const $button = $(event.currentTarget);
      const $nestedCard = $button.closest('.variable-card');

      const $parentCard = this.findTopLevelCard($nestedCard);

      if ($parentCard) {
        this.saveNestedCardValue($parentCard);
      }
    });

    $(document).on('click', '.variable-action-btn.object-delete-btn', event => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      const $button = $(event.currentTarget);
      const $nestedCard = $button.closest('.variable-card');

      const $parentCard = this.findTopLevelCard($nestedCard);

      if ($parentCard) {
        this.deleteNestedCardValue($parentCard, $nestedCard);
      }
    });

    $(document).on('click', '.variable-action-btn.add-nested-key-btn', async event => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      const $button = $(event.currentTarget);
      const $card = $button.closest('.variable-card');

      const dialogCallback = this.defaultTypeDialogCallback;
      if (dialogCallback) {
        await dialogCallback((dataType: VariableDataType) => {
          this.addObjectKey($card, dataType, this.defaultTypeDialogCallback);
        });
      } else {
        log.error('添加卡片出错');
        toastr.error('添加卡片出错');
      }
    });

    $(document).on('click', '.variable-action-btn.add-key-btn', async event => {
      event.stopPropagation();
      event.stopImmediatePropagation();

      const $button = $(event.currentTarget);
      const $card = $button.closest('.variable-card');

      const dialogCallback = this.defaultTypeDialogCallback;
      if (dialogCallback) {
        await dialogCallback((dataType: VariableDataType) => {
          this.addObjectKey($card, dataType, this.defaultTypeDialogCallback);
        });
      } else {
        log.error('未提供类型选择对话框回调函数');
        toastr.error('未提供类型选择对话框回调函数');
      }
    });
  }

  /**
   * 创建变量卡片
   * @param variable 变量
   * @param isNested 是否为嵌套卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数（仅用于对象类型）
   * @returns 变量卡片jQuery对象
   */
  public createCard(
    variable: VariableItem,
    isNested?: boolean,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): JQuery<HTMLElement> {
    let card: JQuery<HTMLElement>;
    const { name, value, dataType, id } = variable;
    card = $(`
      <div class="variable-card" data-type="${dataType}" data-variable-id="${id}">
        <div class="variable-card-header">
          <div class="variable-title-container">
            <i></i>
            <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
          </div>
          <div class="variable-actions">
            <div class="variable-action-btn save-btn" title="保存">
              <i class="fa-regular fa-save"></i>
            </div>
            <div class="variable-action-btn delete-btn" title="删除">
              <i class="fa-regular fa-trash-can"></i>
            </div>
          </div>
        </div>
        <div class="variable-card-content">
        </div>
      </div>
    `);

    if (isNested) {
      card.removeAttr('data-variable-id');
      card
        .find('.variable-action-btn.save-btn')
        .removeClass('save-btn')
        .addClass('object-save-btn')
        .end()
        .find('.variable-action-btn.delete-btn')
        .removeClass('delete-btn')
        .addClass('object-delete-btn');
    }

    switch (dataType) {
      case 'array':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-list')
          .end()
          .find('.variable-card-content')
          .append(
            `<div class="list-items-container"></div><div class="add-list-item"><i class="fa-solid fa-plus"></i> 添加项目</div>`,
          );

        this.populateArrayItems(card, value);

        {
          const listContainer = card.find('.list-items-container');
          listContainer.sortable({
            delay: getSortableDelay(),
            handle: '.drag-handle',
          });
        }
        break;
      case 'object':
        card.find('.variable-title-container i').addClass('fa-regular fa-code');
        this.setupObjectCard(card, variable, isNested, showTypeDialogCallback);
        break;
      case 'boolean':
        card
          .find('.variable-title-container i')
          .addClass('fa-regular fa-toggle-on')
          .end()
          .find('.variable-card-content')
          .append(
            `
              <div class="boolean-input-container">
                <div class="boolean-buttons-container">
                  <div class="boolean-btn ${value ? 'active' : ''}" data-value="true">True</div>
                  <div class="boolean-btn ${!value ? 'active' : ''}" data-value="false">False</div>
                </div>
              </div>
            `,
          )
          .find('.boolean-btn')
          .on('click', function () {
            card.find('.boolean-btn').removeClass('active');
            $(this).addClass('active');
          });
        break;
      case 'number':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-hashtag')
          .end()
          .find('.variable-card-content')
          .append(`<input type="number" class="number-input variable-content-input" value="${value}" step="any">`);
        break;
      case 'string':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-font')
          .end()
          .find('.variable-card-content')
          .append(
            `<textarea class="string-input variable-content-input" placeholder="输入字符串值">${value}</textarea>`,
          );
        break;
    }
    return card;
  }

  /**
   * 从卡片获取变量信息
   * @param card 变量卡片
   * @returns 变量信息
   */
  public getVariableFromCard(card: JQuery<HTMLElement>): VariableItem | null {
    const id = card.attr('data-variable-id') || '';
    const name = card.find('.variable-title').val() as string;
    const dataType = card.attr('data-type') as VariableDataType;
    const value = this.extractValueFromCard(card, dataType);

    return {
      id,
      name,
      dataType,
      value,
    };
  }

  /**
   * 从卡片提取值（统一处理所有类型的卡片值提取）
   * @param card 卡片
   * @param dataType 数据类型
   * @returns 提取的值
   */
  private extractValueFromCard(card: JQuery<HTMLElement>, dataType: VariableDataType): any {
    switch (dataType) {
      case 'string':
        return card.find('.string-input').val() as string;
      case 'number': {
        const numberValue = card.find('.number-input').val() as string;
        return numberValue ? parseFloat(numberValue) : 0;
      }
      case 'boolean':
        return card.find('.boolean-btn.active').attr('data-value') === 'true';
      case 'array': {
        const arrayItems: any[] = [];
        card.find('.list-item').each((_, elem) => {
          const $listItem = $(elem);

          const itemValue = $listItem.find('.variable-content-input').val() as string;
          try {
            arrayItems.push(JSON.parse(itemValue));
          } catch {
            arrayItems.push(itemValue);
          }
        });
        return arrayItems;
      }
      case 'object': {
        const viewMode = card.attr('data-view-mode') || 'card';

        if (viewMode === 'card') {
          const extracted = this.extractObjectFromNestedCards(card);
          return extracted;
        }

        const jsonValue = card.find('.json-input').val() as string;

        if (jsonValue && jsonValue.trim()) {
          try {
            const parsed = JSON.parse(jsonValue);
            return parsed;
          } catch (e) {
            log.error('JSON解析错误:', e);
            toastr.error('JSON解析错误');
            return {};
          }
        } else {
          const extracted = this.extractObjectFromNestedCards(card);
          return extracted;
        }
      }
      default:
        return card.find('.variable-content-input').val() as string;
    }
  }

  /**
   * 从嵌套卡片提取对象值
   * @param card 对象卡片
   * @returns 提取的对象值
   */
  private extractObjectFromNestedCards(card: JQuery<HTMLElement>): Record<string, any> {
    const result: Record<string, any> = {};

    let $container = card.find('> .variable-card-content > .object-card-view > .nested-cards-container');

    if ($container.length === 0) {
      $container = card.find('> .variable-card-content > .nested-object-container > .nested-cards-container');
    }

    if ($container.length === 0) {
      $container = card.find('.nested-cards-container').first();
    }

    $container.children('.variable-card').each((_index, element) => {
      const $nestedCard = $(element);
      const key = $nestedCard.find('.variable-title').val() as string;
      const nestedDataType = $nestedCard.attr('data-type') as VariableDataType;

      log.info('[VariableManager] 处理嵌套卡片:', {
        index: _index,
        key: key,
        dataType: nestedDataType,
        cardHtml: $nestedCard[0].outerHTML.substring(0, 200) + '...',
      });

      if (key) {
        const nestedValue = this.extractValueFromCard($nestedCard, nestedDataType);
        result[key] = nestedValue;
      } else {
        log.warn('[VariableManager] 跳过空键的嵌套卡片:', _index);
      }
    });

    log.info('[VariableManager] 最终提取结果:', result);
    return result;
  }

  /**
   * 渲染对象卡片的卡片视图
   * @param card 对象卡片jQuery对象
   * @param variable 对象变量
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private renderObjectCardView(
    card: JQuery<HTMLElement>,
    variable: VariableItem,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    const $container = card.find('.nested-cards-container');
    $container.empty();

    if (!variable.value || typeof variable.value !== 'object') {
      return;
    }

    Object.entries(variable.value).forEach(([key, propertyValue]) => {
      const dataType: VariableDataType = VariableManagerUtil.inferDataType(propertyValue);

      const propertyVariable: VariableItem = {
        name: key,
        dataType: dataType,
        value: propertyValue,
        id: '',
      };

      const nestedCard = this.createCard(propertyVariable, true, showTypeDialogCallback);

      $container.append(nestedCard);
    });
  }

  /**
   * 触发嵌套卡片保存事件
   * @param parentCard 父级卡片
   */
  private saveNestedCardValue(parentCard: JQuery<HTMLElement>): void {
    this.syncCardViewToJsonInput(parentCard);

    const topLevelCard = this.findTopLevelCard(parentCard);
    if (topLevelCard) {
      topLevelCard.trigger('nested-card:changed');
    }
  }

  /**
   * 找到顶级对象卡片
   * @param card 当前卡片
   * @returns 具有data-variable-id属性的卡片或null
   */
  private findTopLevelCard(card: JQuery<HTMLElement>): JQuery<HTMLElement> | null {
    if (card.attr('data-variable-id')) {
      return card;
    }

    const cardWithId = card.closest('[data-variable-id]');
    return cardWithId.length > 0 ? cardWithId : null;
  }

  /**
   * 删除嵌套卡片
   * @param parentCard 父级卡片
   * @param nestedCard 嵌套卡片
   */
  private deleteNestedCardValue(parentCard: JQuery<HTMLElement>, nestedCard: JQuery<HTMLElement>): void {
    nestedCard.remove();

    this.syncCardViewToJsonInput(parentCard);

    const topLevelCard = this.findTopLevelCard(parentCard);
    if (topLevelCard) {
      topLevelCard.trigger('nested-card:changed');
    }
  }

  /**
   * 为对象卡片添加新的键值对（统一处理顶级和嵌套对象卡片）
   * @param card 对象卡片（顶级或嵌套）
   * @param dataType 新键值对的数据类型
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private addObjectKey(
    card: JQuery<HTMLElement>,
    newDataType: VariableDataType,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    const defaultValue = VariableManagerUtil.getDefaultValueForType(newDataType);
    const existingKeys = new Set<string>();

    const $targetCard = card.closest('.variable-card');
    $targetCard
      .find('.nested-cards-container')
      .first()
      .children('.variable-card')
      .each((_, element) => {
        const key = $(element).find('.variable-title').val() as string;
        if (key) {
          existingKeys.add(key);
        }
      });

    const newKey = VariableManagerUtil.generateUniqueKey(existingKeys);

    const newVariable: VariableItem = {
      name: newKey,
      dataType: newDataType,
      value: defaultValue,
      id: '',
    };

    const newNestedCard = this.createCard(newVariable, true, showTypeDialogCallback);

    const $targetCardHeader = $targetCard.find('.variable-card-header').first();
    const $targetCardContent = $targetCardHeader.siblings('.variable-card-content').first();
    const $container = $targetCardContent.find('.nested-cards-container').first();

    $container.prepend(newNestedCard);

    newNestedCard.find('.variable-title').focus().select();

    const topLevelCard = this.findTopLevelCard($targetCard);
    if (topLevelCard && topLevelCard.is($targetCard)) {
      this.syncCardViewToJsonInput($targetCard);
    }
  }

  /**
   * 设置对象卡片（统一处理嵌套和非嵌套对象卡片）
   * @param card 对象卡片
   * @param variable 变量对象
   * @param isNested 是否为嵌套卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private setupObjectCard(
    card: JQuery<HTMLElement>,
    variable: VariableItem,
    isNested?: boolean,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    if (isNested) {
      card.find('.variable-card-content').append(`
        <div class="nested-object-container">
          <div class="nested-cards-container"></div>
        </div>
      `);

      card.find('.variable-actions .object-save-btn').before(`
        <div class="variable-action-btn add-nested-key-btn" title="添加键值对">
          <i class="fa-regular fa-plus"></i>
        </div>
      `);
    } else {
      card.find('.variable-card-content').append(`
        <textarea class="json-input variable-content-input" placeholder="输入JSON对象" style="display: none;"></textarea>
            <div class="object-card-view">
              <div class="nested-cards-container"></div>
            </div>
      `);

      card.find('.variable-actions .save-btn').before(`
        <div class="variable-action-btn toggle-view-btn" title="切换到JSON视图">
          <i class="fa-regular fa-list"></i>
        </div>
        <div class="variable-action-btn add-key-btn" title="添加键值对">
          <i class="fa-regular fa-plus"></i>
        </div>
      `);

      card.find('.variable-actions .delete-btn').after(`
        <div class="variable-action-btn collapse-btn flex" title="折叠">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      `);

      card.find('.variable-card-content').addClass('expanded');
      card.find('.collapse-btn').addClass('expanded');

      card.find('.collapse-btn').on('click', () => {
        const $icon = card.find('.collapse-btn');
        const $body = card.children('.variable-card-content');

        $icon.toggleClass('expanded');
        $body.toggleClass('expanded');
      });

      card.find('.json-input').val(JSON.stringify(variable.value, null, 2)).end().attr('data-view-mode', 'card');

      card.find('.json-input').on('blur change', () => {
        const currentMode = card.attr('data-view-mode') || 'card';

        if (currentMode === 'card') {
          this.syncJsonInputToCardView(card, showTypeDialogCallback);
        }
      });

      card.find('.toggle-view-btn').on('click', () => {
        const $card = card;
        const currentMode = $card.attr('data-view-mode') || 'card';

        const newMode = currentMode === 'json' ? 'card' : 'json';
        $card.attr('data-view-mode', newMode);

        if (newMode === 'json') {
          $card
            .find('.toggle-view-btn i')
            .removeClass('fa-list')
            .addClass('fa-eye')
            .end()
            .attr('title', '切换到卡片视图');
          $card.find('.variable-action-btn.add-key-btn').hide();

          $card.find('.json-input').show().end().find('.object-card-view').hide();

          this.syncCardViewToJsonInput($card);
        } else {
          $card
            .find('.toggle-view-btn i')
            .removeClass('fa-eye')
            .addClass('fa-list')
            .end()
            .attr('title', '切换到JSON视图');
          $card.find('.variable-action-btn.add-key-btn').show();

          $card.find('.json-input').hide().end().find('.object-card-view').show();

          this.syncJsonInputToCardView($card, showTypeDialogCallback);
        }
      });
    }

    try {
      this.renderObjectCardView(card, variable, showTypeDialogCallback);
    } catch (e) {
      log.error('渲染初始对象卡片视图错误:', e);
      toastr.error('渲染对象卡片视图错误');
    }
  }

  /**
   * 同步卡片视图到JSON输入框
   * @param card 对象卡片
   */
  private syncCardViewToJsonInput(card: JQuery<HTMLElement>): void {
    const objectValue = this.extractObjectFromNestedCards(card);
    card.find('.json-input').val(JSON.stringify(objectValue, null, 2));
  }

  /**
   * 同步JSON输入框到卡片视图
   * @param card 对象卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private syncJsonInputToCardView(
    card: JQuery<HTMLElement>,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    try {
      const jsonValue = card.find('.json-input').val() as string;
      if (jsonValue && jsonValue.trim()) {
        const objectValue = JSON.parse(jsonValue);
        const tempVariable: VariableItem = {
          id: card.attr('data-variable-id') || '',
          name: card.find('.variable-title').val() as string,
          dataType: 'object',
          value: objectValue,
        };
        this.renderObjectCardView(card, tempVariable, showTypeDialogCallback);
      }
    } catch (parseError) {
      log.error('JSON解析错误:', parseError);
      toastr.error('JSON格式错误，无法同步到卡片视图');
    }
  }

  /**
   * 创建数组项（所有项都显示为字符串输入框）
   * @param card 数组卡片
   * @param items 数组项
   */
  private populateArrayItems(card: JQuery<HTMLElement>, items: any[]): void {
    if (!items || items.length === 0) {
      return;
    }

    const listContainer = card.find('.list-items-container');
    listContainer.empty();

    items.forEach(item => {
      const displayValue = typeof item === 'object' ? JSON.stringify(item) : String(item);
      const listItem = $(`
        <div class="list-item">
          <span class="drag-handle">☰</span>
          <textarea class="variable-content-input">${displayValue}</textarea>
          <div class="list-item-delete"><i class="fa-solid fa-times"></i></div>
        </div>
      `);
      listContainer.append(listItem);
    });
  }
}
