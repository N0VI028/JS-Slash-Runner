import log from 'loglevel';
import { createPinia } from 'pinia';
import { App, createApp } from 'vue';
import RepositoryPage from './components/RepositoryPage.vue';

export class ScriptRepositoryManager {
  private static instance: ScriptRepositoryManager;
  private app: App | null = null;
  private pinia: ReturnType<typeof createPinia> | null = null;
  private mountElement: HTMLElement | null = null;

  private constructor() {}

  public static getInstance(): ScriptRepositoryManager {
    if (!ScriptRepositoryManager.instance) {
      ScriptRepositoryManager.instance = new ScriptRepositoryManager();
    }
    return ScriptRepositoryManager.instance;
  }

  /**
   * 挂载应用
   * @param containerId 容器元素ID
   */
  public async mount(container: JQuery<HTMLElement>): Promise<void> {
    try {
      this.mountElement = container[0];
      if (!this.mountElement) {
        throw new Error(`找不到挂载容器: ${container}`);
      }

      this.mountElement.innerHTML = '';

      this.pinia = createPinia();

      this.app = createApp(RepositoryPage);

      this.app.use(this.pinia);

      this.app.config.errorHandler = (err, _instance, info) => {
        log.error('[ScriptRepository] 应用错误:', err, info);
        console.error(err);
      };

      this.app.mount(this.mountElement);
    } catch (error) {
      log.error('[ScriptRepository] 挂载应用失败:', error);
      throw error;
    }
  }

  /**
   * 卸载应用
   */
  public unmount(): void {
    try {
      if (this.app) {
        this.app.unmount();
        this.app = null;
      }

      if (this.mountElement) {
        this.mountElement.innerHTML = '';
        this.mountElement = null;
      }

      this.pinia = null;

      log.info('[ScriptRepository] 应用已卸载');
    } catch (error) {
      log.error('[ScriptRepository] 卸载应用失败:', error);
    }
  }

  /**
   * 检查应用是否已挂载
   */
  public isMounted(): boolean {
    return this.app !== null && this.mountElement !== null;
  }

  /**
   * 获取Pinia实例
   */
  public getPinia() {
    return this.pinia;
  }

  /**
   * 获取应用实例
   */
  public getApp() {
    return this.app;
  }

  /**
   * 渲染Vue组件为HTML字符串
   * @param component Vue组件
   * @param props 组件props
   * @returns HTML字符串
   */
  public static renderComponentToString(component: any, props: Record<string, any> = {}): string {
    try {
      // 创建一个临时的DOM元素
      const container = document.createElement('div');

      // 创建Vue应用实例
      const app = createApp(component, props);

      // 如果有Pinia实例，使用它
      const instance = ScriptRepositoryManager.instance;
      if (instance?.pinia) {
        app.use(instance.pinia);
      }

      // 渲染到容器
      app.mount(container);

      // 获取HTML内容
      const html = container.innerHTML;

      // 清理
      app.unmount();

      return html;
    } catch (error) {
      log.error('[ScriptRepository] 渲染组件失败:', error);
      throw error;
    }
  }

  /**
   * 销毁管理器实例
   */
  public static destroyInstance(): void {
    if (ScriptRepositoryManager.instance) {
      ScriptRepositoryManager.instance.unmount();
      ScriptRepositoryManager.instance = undefined as unknown as ScriptRepositoryManager;
    }
  }
}
