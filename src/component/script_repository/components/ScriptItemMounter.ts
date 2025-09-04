/**
 * Vue ScriptItem 组件挂载器
 * 用于在现有 DOM 结构中挂载 Vue 脚本项组件
 */

import { createApp, type App } from 'vue';
import type { Script, ScriptType } from '../types';
import ScriptItem from './ScriptItem.vue';

interface ScriptItemInstance {
  app: App;
  element: HTMLElement;
  script: Script;
  scriptType: ScriptType;
}

export class ScriptItemMounter {
  private static instances: Map<string, ScriptItemInstance> = new Map();

  /**
   * 在指定容器中挂载 Vue ScriptItem 组件
   * @param container 容器元素
   * @param script 脚本对象
   * @param scriptType 脚本类型
   * @param mode 显示模式
   * @returns 挂载的 Vue 应用实例
   */
  static mount(
    container: HTMLElement,
    script: Script,
    scriptType: ScriptType,
    mode: 'normal' | 'preset' = 'normal',
  ): App {
    // 如果已经挂载了相同的脚本，先卸载
    const existingKey = `${script.id}-${scriptType}`;
    if (this.instances.has(existingKey)) {
      this.unmount(script.id, scriptType);
    }

    // 创建 Vue 应用
    const app = createApp(ScriptItem, {
      script,
      scriptType,
      mode,
      onToggle: (script: Script, type: ScriptType, enable: boolean) => {
        console.log(`[ScriptItemMounter] Script toggle: ${script.name} -> ${enable}`);
      },
      onEdit: (scriptId: string, type: ScriptType) => {
        console.log(`[ScriptItemMounter] Script edit: ${scriptId}`);
      },
      onMove: (script: Script, fromType: ScriptType) => {
        console.log(`[ScriptItemMounter] Script move: ${script.name} from ${fromType}`);
      },
      onExport: (script: Script) => {
        console.log(`[ScriptItemMounter] Script export: ${script.name}`);
      },
      onDelete: (scriptId: string, type: ScriptType) => {
        console.log(`[ScriptItemMounter] Script delete: ${scriptId}`);
        // 自动卸载组件
        this.unmount(scriptId, type);
      },
    });

    // 挂载到容器
    app.mount(container);

    // 记录实例
    this.instances.set(existingKey, {
      app,
      element: container,
      script,
      scriptType,
    });

    return app;
  }

  /**
   * 卸载指定的 ScriptItem 组件
   * @param scriptId 脚本ID
   * @param scriptType 脚本类型
   */
  static unmount(scriptId: string, scriptType: ScriptType): void {
    const key = `${scriptId}-${scriptType}`;
    const instance = this.instances.get(key);

    if (instance) {
      instance.app.unmount();
      this.instances.delete(key);
    }
  }

  /**
   * 卸载所有 ScriptItem 组件
   */
  static unmountAll(): void {
    for (const [key, instance] of this.instances.entries()) {
      instance.app.unmount();
    }
    this.instances.clear();
  }

  /**
   * 更新指定脚本的数据
   * @param scriptId 脚本ID
   * @param scriptType 脚本类型
   * @param updatedScript 更新后的脚本数据
   */
  static updateScript(scriptId: string, scriptType: ScriptType, updatedScript: Script): void {
    const key = `${scriptId}-${scriptType}`;
    const instance = this.instances.get(key);

    if (instance) {
      // 重新挂载以更新数据
      this.unmount(scriptId, scriptType);
      this.mount(instance.element, updatedScript, scriptType);
    }
  }

  /**
   * 获取所有挂载的实例
   */
  static getAllInstances(): Map<string, ScriptItemInstance> {
    return new Map(this.instances);
  }

  /**
   * 检查指定脚本是否已挂载
   * @param scriptId 脚本ID
   * @param scriptType 脚本类型
   */
  static isMounted(scriptId: string, scriptType: ScriptType): boolean {
    const key = `${scriptId}-${scriptType}`;
    return this.instances.has(key);
  }
}

/**
 * 便捷函数：替换现有的脚本项 DOM 元素为 Vue 组件
 * @param existingElement 现有的脚本项元素
 * @param script 脚本对象
 * @param scriptType 脚本类型
 * @param mode 显示模式
 */
export function replaceScriptItemWithVue(
  existingElement: HTMLElement,
  script: Script,
  scriptType: ScriptType,
  mode: 'normal' | 'preset' = 'normal',
): App {
  // 清空现有内容
  existingElement.innerHTML = '';

  // 挂载 Vue 组件
  return ScriptItemMounter.mount(existingElement, script, scriptType, mode);
}

/**
 * 便捷函数：在新的容器中创建 Vue 脚本项
 * @param script 脚本对象
 * @param scriptType 脚本类型
 * @param mode 显示模式
 * @returns 包含 Vue 组件的容器元素
 */
export function createVueScriptItem(
  script: Script,
  scriptType: ScriptType,
  mode: 'normal' | 'preset' = 'normal',
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vue-script-item-container';

  ScriptItemMounter.mount(container, script, scriptType, mode);

  return container;
}
