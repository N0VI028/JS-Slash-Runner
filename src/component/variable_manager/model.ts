import { TavernVariables, VariableDataType, VariableItem, VariableType } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';
import { getVariables, replaceVariables } from '@/function/variables';
import { uuidv4 } from '@sillytavern/scripts/utils';

import log from 'loglevel';

export class VariableModel {
  private currentVariables: VariableItem[] | null = null;
  private variableIdMap: Map<string, VariableItem> = new Map();

  private activeVariableType: VariableType = 'global';

  private filterState: Record<VariableDataType, boolean> = {
    string: true,
    array: true,
    boolean: true,
    number: true,
    object: true,
  };

  private searchKeyword: string = '';

  private floorMinRange: number | null = null;
  private floorMaxRange: number | null = null;

  constructor() {}

  /**
   * 为变量创建唯一ID并建立映射关系
   * @param name 变量名称
   * @param value 变量值
   * @param message_id 消息ID（可选，仅用于message类型变量）
   * @returns 生成的唯一ID
   */
  public createVariableItem(name: string, value: any, message_id?: number): VariableItem {
    const id = uuidv4();
    const variable_item: VariableItem = {
      name,
      value,
      dataType: VariableManagerUtil.inferDataType(value),
      id,
      ...(message_id !== undefined && { message_id }),
    };
    this.variableIdMap.set(id, variable_item);
    return variable_item;
  }

  // ========== 前端和Map之间的存取 ==========

  /**
   * 获取当前map中的所有变量 (前端 ← map)
   */
  public getCurrentMapVariables(): VariableItem[] {
    return this.currentVariables ? [...this.currentVariables] : [];
  }

  /**
   * 向map中添加变量 (前端 → map)
   */
  public addToMap(name: string, value: any, message_id?: number): VariableItem {
    const variable = this.createVariableItem(name, value, message_id);
    if (!this.currentVariables) {
      this.currentVariables = [];
    }
    this.currentVariables.push(variable);
    return variable;
  }

  /**
   * 从map中移除变量 (前端 → map)
   */
  public removeFromMap(id: string): boolean {
    if (!this.currentVariables) return false;
    const index = this.currentVariables.findIndex(v => v.id === id);
    if (index >= 0) {
      this.currentVariables.splice(index, 1);
      this.variableIdMap.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 在map中更新变量 (前端 → map)
   */
  public updateInMap(id: string, newName: string, newValue: any, newMessageId?: number): boolean {
    if (!this.currentVariables) return false;
    const variable = this.currentVariables.find(v => v.id === id);
    if (variable) {
      variable.name = newName;
      variable.value = newValue;
      variable.dataType = VariableManagerUtil.inferDataType(newValue);
      if (newMessageId !== undefined) {
        variable.message_id = newMessageId;
      }
      this.variableIdMap.set(id, variable);
      return true;
    }
    return false;
  }

  /**
   * 清除所有变量ID映射
   */
  public clearVariableIdMap(): void {
    this.variableIdMap.clear();
  }

  /**
   * 通过ID获取变量信息
   * @param id 变量ID
   * @returns 变量信息对象 {name, value} 或 undefined
   */
  public getVariableById(id: string): VariableItem | undefined {
    return this.variableIdMap.get(id);
  }

  // ========== 酒馆和Map之间的存取 ==========

  /**
   * 将酒馆变量转换为VariableItem数组
   * @param tavernVariables 从酒馆获取的原始变量数据
   * @param message_id 消息ID（可选，仅用于message类型变量）
   * @returns 转换后的VariableItem数组
   * @description 自动推断每个变量的数据类型并分配唯一ID
   */
  public convertTavernVariablesToItems(tavernVariables: TavernVariables, message_id?: number): VariableItem[] {
    return Object.entries(tavernVariables).map(([name, value]) => {
      return this.createVariableItem(name, value, message_id);
    });
  }

  /**
   * 将VariableItem数组转换为TavernVariables对象
   * @param variables VariableItem数组
   * @param message_id 可选的message_id筛选条件
   * @returns TavernVariables对象
   */
  public convertItemsToTavernVariables(variables: VariableItem[], message_id?: number): TavernVariables {
    const result: TavernVariables = {};

    for (const variable of variables) {
      // 如果指定了message_id，只转换匹配的变量
      if (message_id !== undefined) {
        if (variable.message_id === message_id) {
          result[variable.name] = variable.value;
        }
      } else {
        // 如果没有指定message_id，转换所有变量
        result[variable.name] = variable.value;
      }
    }

    return result;
  }

  /**
   * 加载指定类型的变量
   * @param type 变量类型(global/character/chat/message)
   * @returns 加载的变量数据
   */
  public async loadFromTavern(type: VariableType): Promise<VariableItem[]> {
    this.clearVariableIdMap();

    try {
      this.activeVariableType = type;

      if (type === 'message') {
        this.currentVariables = [];

        // 获取当前楼层范围
        const [minFloor, maxFloor] = this.getFloorRange();

        // 确保至少有一个有效的楼层范围
        if (minFloor !== null || maxFloor !== null) {
          const effectiveMinFloor = minFloor ?? 0;
          const effectiveMaxFloor = maxFloor ?? minFloor ?? 0;

          // 遍历每个楼层，加载各自的变量
          for (let floor = effectiveMinFloor; floor <= effectiveMaxFloor; floor++) {
            try {
              const floorVars = this.getFloorVariables(floor);
              // 为每个楼层的变量添加message_id标识
              const floorVariableItems = this.convertTavernVariablesToItems(floorVars, floor);
              this.currentVariables.push(...floorVariableItems);
            } catch (error) {
              log.warn(`[VariableModel] 加载第${floor}层变量失败:`, error);
              // 继续加载其他楼层
            }
          }
        }
      } else {
        const variables = getVariables({ type }) as TavernVariables;
        this.currentVariables = this.convertTavernVariablesToItems(variables);
      }

      return this.currentVariables;
    } catch (error) {
      log.error(`[VariableManager] 加载${type}变量失败:`, error);
      return [];
    }
  }

  /**
   * 保存所有变量到酒馆
   * @param type 变量类型(global/character/chat/message)
   * @param message_id 消息ID(仅用于message类型，可选，如果指定则只保存到该楼层)
   */
  public async saveAllVariables(type: VariableType, message_id?: number): Promise<void> {
    if (!this.currentVariables) {
      log.warn('[VariableModel] 当前没有变量数据，跳过保存');
      return;
    }

    if (type === 'message') {
      const [minFloor, maxFloor] = this.getFloorRange();

      if (minFloor === null || maxFloor === null) {
        log.warn('[VariableModel] 保存message变量失败: 未设置有效的楼层范围');
        return;
      }

      // 如果指定了特定的message_id，只保存到该楼层
      if (message_id !== undefined && message_id >= minFloor && message_id <= maxFloor) {
        const variablesForFloor = this.currentVariables.filter(v => v.message_id === message_id);
        const tavernVariables = this.convertItemsToTavernVariables(variablesForFloor, message_id);

        try {
          await replaceVariables(tavernVariables, { type: 'message', message_id });
          log.info(`[VariableManager] 成功保存第${message_id}层变量`);
        } catch (error) {
          log.error(`[VariableManager] 保存第${message_id}层变量失败:`, error);
        }
      } else {
        // 对于消息类型，按楼层分组保存变量
        for (let floor = minFloor; floor <= maxFloor; floor++) {
          const variablesForFloor = this.currentVariables.filter(v => v.message_id === floor);
          const tavernVariables = this.convertItemsToTavernVariables(variablesForFloor, floor);

          try {
            await replaceVariables(tavernVariables, { type: 'message', message_id: floor });
          } catch (error) {
            log.error(`[VariableManager] 保存第${floor}层变量失败:`, error);
          }
        }
      }
    } else {
      // 对于其他类型（global/character/chat），构建变量对象
      const tavernVariables = this.convertItemsToTavernVariables(this.currentVariables);
      await replaceVariables(tavernVariables, { type });
    }

    log.info(`[VariableManager] 保存变量成功`);
  }

  /**
   * 获取当前活动的变量类型
   * @returns 变量类型
   */
  public getActiveVariableType(): VariableType {
    return this.activeVariableType;
  }

  /**
   * 更新列表变量的顺序
   * @param type 变量类型(global/character/chat/message)
   * @param name 变量名称
   * @param items 新的列表顺序
   * @param variable_id 变量ID(可选，如果提供则同时更新ID映射)
   */
  public async updateListOrder(type: VariableType, name: string, items: string[], variable_id?: string): Promise<void> {
    if (type === this.activeVariableType && this.currentVariables) {
      const variable = this.currentVariables.find(variable => variable.name === name);
      if (variable && Array.isArray(variable.value)) {
        variable.value = items;

        // 如果提供了变量ID，更新映射
        if (variable_id) {
          const varInfo = this.variableIdMap.get(variable_id);
          if (varInfo) {
            varInfo.value = items;
            // 保持变量的message_id不变
            this.variableIdMap.set(variable_id, varInfo);
          }
        }

        // 使用完全覆盖模式保存
        await this.saveAllVariables(type, variable.message_id);
      }
    }
  }

  /**
   * 清除所有变量
   * @param type 变量类型(global/character/chat/message)
   */
  public async clearAllVariables(type: VariableType): Promise<void> {
    if (type === this.activeVariableType) {
      this.currentVariables = [];
      this.clearVariableIdMap();
    }

    // 消息类型变量需要逐层清除
    if (type === 'message') {
      const [minFloor, maxFloor] = this.getFloorRange();

      if (minFloor === null || maxFloor === null) {
        log.warn('[VariableModel] 清除message变量失败: 未设置有效的楼层范围');
        return;
      }

      // 逐层清除变量
      for (let floor = minFloor; floor <= maxFloor; floor++) {
        try {
          const emptyVariables: TavernVariables = {};
          await replaceVariables(emptyVariables, { type: 'message', message_id: floor });
        } catch (error) {
          log.error(`[VariableModel] 清除第${floor}层变量失败:`, error);
        }
      }
    } else {
      // 其他类型变量直接替换为空对象
      const emptyVariables: TavernVariables = {};
      await replaceVariables(emptyVariables, { type });
    }
  }

  /**
   * 更新筛选状态
   * @param type 数据类型
   * @param checked 是否选中
   */
  public updateFilterState(type: VariableDataType, checked: boolean): void {
    this.filterState[type] = checked;
  }

  /**
   * 获取筛选状态
   * @returns 筛选状态
   */
  public getFilterState(): Record<VariableDataType, boolean> {
    return this.filterState;
  }

  /**
   * 更新搜索关键词
   * @param keyword 关键词
   */
  public updateSearchKeyword(keyword: string): void {
    this.searchKeyword = keyword;
  }

  /**
   * 获取搜索关键词
   * @returns 搜索关键词
   */
  public getSearchKeyword(): string {
    return this.searchKeyword;
  }

  /**
   * 更新楼层范围筛选
   * @param min 最小楼层
   * @param max 最大楼层
   */
  public updateFloorRange(min: number | null, max: number | null): void {
    // 验证楼层不能小于0
    if (min !== null) {
      min = Math.max(0, min);
    }
    if (max !== null) {
      max = Math.max(0, max);
    }

    // 如果设置了范围但是最小值大于最大值，则交换它们
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
    }

    this.floorMinRange = min;
    this.floorMaxRange = max;

    // 清除缓存，强制重新加载
    if (this.activeVariableType === 'message') {
      this.currentVariables = null;
    }
  }

  /**
   * 获取当前楼层范围筛选
   * @returns 当前楼层范围 [min, max]
   */
  public getFloorRange(): [number | null, number | null] {
    return [this.floorMinRange, this.floorMaxRange];
  }

  /**
   * 获取特定楼层的变量数据
   * @param messageId 消息ID
   * @returns 楼层变量数据对象
   */
  public getFloorVariables(messageId: number): TavernVariables {
    try {
      const variables = getVariables({ type: 'message', message_id: messageId }) as TavernVariables;
      return variables || {};
    } catch (error) {
      log.error(`获取第${messageId}层变量失败:`, error);
      return {};
    }
  }

  /**
   * 查找变量对应的 ID
   * @param name 变量名称
   * @param message_id 消息ID（可选，用于精确匹配message类型变量）
   * @returns 找到的变量ID，如果不存在则返回undefined
   */
  public findVariableId(name: string, message_id?: number): string | undefined {
    for (const id of this.variableIdMap.keys()) {
      const varInfo = this.variableIdMap.get(id);
      if (varInfo && varInfo.name === name) {
        // 如果指定了message_id，需要精确匹配
        if (message_id !== undefined) {
          if (varInfo.message_id === message_id) {
            return id;
          }
        } else {
          // 如果没有指定message_id，返回第一个匹配的变量
          return id;
        }
      }
    }
    return undefined;
  }

  /**
   * 获取指定楼层的变量列表
   * @param message_id 消息ID
   * @returns 属于该楼层的变量列表
   */
  public getVariablesByMessageId(message_id: number): VariableItem[] {
    if (!this.currentVariables) return [];
    return this.currentVariables.filter(variable => variable.message_id === message_id);
  }

  /**
   * 获取所有没有message_id的变量（通常是非message类型的变量）
   * @returns 没有message_id的变量列表
   */
  public getVariablesWithoutMessageId(): VariableItem[] {
    if (!this.currentVariables) return [];
    return this.currentVariables.filter(variable => variable.message_id === undefined);
  }

  /**
   * 根据变量名获取所有同名变量
   * @param name 变量名称
   * @returns 同名变量列表
   */
  public getVariablesByName(name: string): VariableItem[] {
    if (!this.currentVariables) return [];
    return this.currentVariables.filter(variable => variable.name === name);
  }

  /**
   * 通过变量名查找变量
   * @param name 变量名称
   * @param message_id 消息ID（可选，用于精确匹配message类型变量）
   * @returns 找到的变量，如果不存在则返回undefined
   */
  public findVariableByName(name: string, message_id?: number): VariableItem | undefined {
    if (!this.currentVariables) return undefined;

    for (const variable of this.currentVariables) {
      if (variable.name === name) {
        if (message_id !== undefined) {
          if (variable.message_id === message_id) {
            return variable;
          }
        } else {
          return variable;
        }
      }
    }
    return undefined;
  }

  /**
   * 同步当前变量列表，根据外部变化进行增量更新
   * @param added 新增的变量
   * @param removedIds 要删除的变量ID列表
   * @param updated 要更新的变量
   */
  public syncCurrentVariables(added: VariableItem[], removedIds: string[], updated: VariableItem[]): void {
    if (!this.currentVariables) {
      this.currentVariables = [];
    }

    // 处理删除
    removedIds.forEach(id => {
      const index = this.currentVariables!.findIndex(v => v.id === id);
      if (index >= 0) {
        this.currentVariables!.splice(index, 1);
        this.variableIdMap.delete(id);
      }
    });

    // 处理新增
    added.forEach(variable => {
      this.currentVariables!.push(variable);
      this.variableIdMap.set(variable.id, variable);
    });

    // 处理更新
    updated.forEach(updatedVariable => {
      const index = this.currentVariables!.findIndex(v => v.id === updatedVariable.id);
      if (index >= 0) {
        this.currentVariables![index] = updatedVariable;
        this.variableIdMap.set(updatedVariable.id, updatedVariable);
      }
    });
  }
}
