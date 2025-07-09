import { VariableModel } from '@/component/variable_manager/model';
import { VariableItem, VariableType } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';
import { getVariables } from '@/function/variables';

import { eventSource } from '@sillytavern/script';

import log from 'loglevel';

const VARIABLE_EVENTS: Record<string, string> = {
  GLOBAL: 'settings_updated',
  CHARACTER: 'character_variables_changed',
  MESSAGE: 'message_variables_changed',
  CHAT: '',
};

const CHAT_POLLING_INTERVAL = 2000;

export interface IDomUpdater {
  addVariableCard(variable: VariableItem): void;
  removeVariableCard(variable_id: string): void;
  updateVariableCard(variable: VariableItem): void;
}

interface ListenerStatus {
  bound: boolean;
  handler: (...args: any[]) => Promise<void>;
}

export class VariableSyncService {
  private domUpdater: IDomUpdater;
  private model: VariableModel;
  private currentType: VariableType | null = null;
  private _boundListeners: Record<VariableType, ListenerStatus> = {
    global: { bound: false, handler: this._handleVariableUpdate.bind(this, 'global') },
    character: { bound: false, handler: this._handleVariableUpdate.bind(this, 'character') },
    chat: { bound: false, handler: this._handleVariableUpdate.bind(this, 'chat') },
    message: { bound: false, handler: this._handleVariableUpdate.bind(this, 'message') },
  };

  private _chatPollingInterval: number | null = null;

  /**
   * @param domUpdater DOM更新器
   * @param model 变量数据模型
   */
  constructor(domUpdater: IDomUpdater, model: VariableModel) {
    this.domUpdater = domUpdater;
    this.model = model;
  }

  public async cleanup(): Promise<void> {
    this._unbindAllEventListeners();
    this._stopChatPolling();
    this.currentType = null;
  }

  /**
   * 初始化当前类型
   */
  public async initCurrentType(): Promise<void> {
    this.currentType = 'global';
    this._activateCurrentListeners();
  }

  /**
   * 设置当前变量类型，并相应地初始化监听器或轮询
   * @param type 变量类型
   */
  public async setCurrentType(type: VariableType): Promise<void> {
    if (this.currentType !== type) {
      this._deactivateCurrentListeners();
      this.currentType = type;
      this._activateCurrentListeners();
    }
  }

  /**
   * 重新激活当前类型的监听器（用于标签页重新激活等场景）
   */
  public reactivateListeners(): void {
    this._deactivateCurrentListeners();
    this._activateCurrentListeners();
  }

  /**
   * 停用当前的事件监听器或轮询
   */
  public deactivateListeners(): void {
    this._deactivateCurrentListeners();
  }

  /**
   * 激活当前类型的监听器或轮询
   * @private
   */
  private _activateCurrentListeners(): void {
    if (this.currentType) {
      if (this.currentType === 'chat') {
        this._startChatPolling();
      } else {
        this._bindVariableListener(this.currentType);
      }
    }
  }

  /**
   * 停用当前的监听器或轮询
   * @private
   */
  private _deactivateCurrentListeners(): void {
    this._unbindAllEventListeners();
    this._stopChatPolling();
  }

  /**
   * 统一的变量监听器绑定方法
   * @param type 变量类型
   * @private
   */
  private _bindVariableListener(type: VariableType): void {
    if (type === 'chat') return;

    const eventName = VARIABLE_EVENTS[type.toUpperCase()];
    const listenerStatus = this._boundListeners[type];

    if (!listenerStatus.bound && eventName) {
      try {
        eventSource.on(eventName, listenerStatus.handler);
        this._boundListeners[type].bound = true;
        log.info(`[VariableManager]：开始同步监听${type}变量`);
      } catch (error) {
        log.error(`[VariableManager]：绑定${type}变量事件监听器时出错:`, error);
        this._boundListeners[type].bound = false;
      }
    }
  }

  /**
   * 解绑所有事件监听器
   * @private
   */
  private _unbindAllEventListeners(): void {
    for (const type of Object.keys(this._boundListeners) as VariableType[]) {
      if (type === 'chat') continue;

      const eventName = VARIABLE_EVENTS[type.toUpperCase()];
      const listenerStatus = this._boundListeners[type];

      if (listenerStatus.bound && eventName) {
        try {
          eventSource.removeListener(eventName, listenerStatus.handler);
          this._boundListeners[type].bound = false;
        } catch (error) {
          log.error(`[VariableManager]：解绑${type}变量事件监听器时出错:`, error);
          this._boundListeners[type].bound = false;
        }
      }
    }
  }

  /**
   * 启动聊天变量的轮询
   * @private
   */
  private _startChatPolling(): void {
    this._stopChatPolling();

    if (this.currentType === 'chat') {
      try {
        this._chatPollingInterval = window.setInterval(async () => {
          await this._handleVariableUpdate('chat');
        }, CHAT_POLLING_INTERVAL);
      } catch (error) {
        log.error('[VariableManager]：启动聊天变量轮询时出错:', error);
        this._chatPollingInterval = null;
      }
    }
  }

  /**
   * 停止聊天变量的轮询
   * @private
   */
  private _stopChatPolling(): void {
    if (this._chatPollingInterval !== null) {
      try {
        window.clearInterval(this._chatPollingInterval);
        this._chatPollingInterval = null;
      } catch (error) {
        log.error('[VariableManager]：停止聊天变量轮询时出错:', error);
      }
    }
  }

  /**
   * 统一的变量更新处理方法
   * 适用于所有变量类型（全局、角色、聊天、消息）
   * @param type 变量类型
   * @param data 可选的事件数据
   * @private
   */
  private async _handleVariableUpdate(type: VariableType, data?: any): Promise<void> {
    if (!this.currentType || this.currentType !== type) {
      return;
    }

    try {
      let newTavernVariables: Record<string, any>;
      let messageId: number | undefined;

      if ((type === 'character' || type === 'message') && data && data.variables) {
        newTavernVariables = data.variables;
        messageId = data.message_id;
      } else {
        newTavernVariables = getVariables({ type });
      }

      const oldVariables = this.model.getCurrentMapVariables();

      const { added, removed, updated } = this._compareTavernVariables(oldVariables, newTavernVariables, messageId);

      this._processDiff(added, removed, updated, newTavernVariables, messageId);
    } catch (error) {
      log.error(`[VariableManager]：处理${type}变量更新时出错:`, error);
    }
  }

  /**
   * 比较当前变量与新的 TavernVariables 对象
   * @param oldVariables 当前的变量列表
   * @param newVars 新的变量对象
   * @param messageId 消息ID
   * @returns 包含已添加、已删除、已更新变量名的对象
   * @private
   */
  private _compareTavernVariables(
    oldVariables: VariableItem[],
    newVars: Record<string, any>,
    messageId?: number,
  ): { added: string[]; removed: string[]; updated: string[] } {
    const oldVarsMap = new Map<string, any>();

    oldVariables.forEach(variable => {
      if (messageId !== undefined) {
        if (variable.message_id === messageId) {
          oldVarsMap.set(variable.name, variable.value);
        }
      } else if (variable.message_id === undefined) {
        oldVarsMap.set(variable.name, variable.value);
      }
    });

    const oldKeys = new Set(oldVarsMap.keys());
    const newKeys = new Set(Object.keys(newVars));

    const added = [...newKeys].filter(key => !oldKeys.has(key));
    const removed = [...oldKeys].filter(key => !newKeys.has(key));
    const updated = [...newKeys].filter(key => oldKeys.has(key) && !_.isEqual(oldVarsMap.get(key), newVars[key]));

    return { added, removed, updated };
  }

  /**
   * 处理变量差异，更新 DOM 和模型
   * @param added 新增的变量名列表
   * @param removed 删除的变量名列表
   * @param updated 更新的变量名列表
   * @param newTavernVariables 新的变量数据
   * @param messageId 消息ID
   * @private
   */
  private _processDiff(
    added: string[],
    removed: string[],
    updated: string[],
    newTavernVariables: Record<string, any>,
    messageId?: number,
  ): void {
    const addedVariables: VariableItem[] = [];
    const removedIds: string[] = [];
    const updatedVariables: VariableItem[] = [];

    added.forEach(name => {
      const variable = this.model.createVariableItem(name, newTavernVariables[name], messageId);
      this.domUpdater.addVariableCard(variable);
      addedVariables.push(variable);
    });

    removed.forEach(name => {
      const variable = this.model.findVariableByName(name, messageId);
      if (variable) {
        this.domUpdater.removeVariableCard(variable.id);
        removedIds.push(variable.id);
      }
    });

    updated.forEach(name => {
      const variable = this.model.findVariableByName(name, messageId);
      if (variable) {
        variable.value = newTavernVariables[name];
        variable.dataType = VariableManagerUtil.inferDataType(variable.value);
        this.domUpdater.updateVariableCard(variable);
        updatedVariables.push(variable);
      }
    });

    this.model.syncCurrentVariables(addedVariables, removedIds, updatedVariables);
  }
}
