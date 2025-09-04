import log from 'loglevel';
import { createPinia } from 'pinia';
import { App, createApp } from 'vue';
import RepositoryPage from './components/RepositoryPage.vue';

/**
 * Vue应用实例管理器
 */
export class VueAppManager {
  private static instance: VueAppManager;
  private app: App | null = null;
  private pinia: ReturnType<typeof createPinia> | null = null;
  private mountElement: HTMLElement | null = null;

  private constructor() {}

  public static getInstance(): VueAppManager {
    if (!VueAppManager.instance) {
      VueAppManager.instance = new VueAppManager();
    }
    return VueAppManager.instance;
  }

  /**
   * 挂载Vue应用
   * @param containerId 容器元素ID
   */
  public async mount(containerId: string): Promise<void> {
    try {
      // 查找容器元素
      this.mountElement = document.getElementById(containerId);
      if (!this.mountElement) {
        throw new Error(`找不到挂载容器: ${containerId}`);
      }

      // 清空容器
      this.mountElement.innerHTML = '';

      // 创建Pinia实例
      this.pinia = createPinia();

      // 创建Vue应用
      this.app = createApp(RepositoryPage);

      // 注册Pinia
      this.app.use(this.pinia);

      // 全局错误处理
      this.app.config.errorHandler = (err, _instance, info) => {
        log.error('[Vue] 应用错误:', err, info);
        console.error(err);
      };

      // 挂载应用
      this.app.mount(this.mountElement);

      log.info('[VueAppManager] Vue应用已挂载到:', containerId);
    } catch (error) {
      log.error('[VueAppManager] 挂载Vue应用失败:', error);
      throw error;
    }
  }

  /**
   * 卸载Vue应用
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

      log.info('[VueAppManager] Vue应用已卸载');
    } catch (error) {
      log.error('[VueAppManager] 卸载Vue应用失败:', error);
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
   * 获取Vue应用实例
   */
  public getApp() {
    return this.app;
  }

  /**
   * 销毁管理器实例
   */
  public static destroyInstance(): void {
    if (VueAppManager.instance) {
      VueAppManager.instance.unmount();
      VueAppManager.instance = undefined as unknown as VueAppManager;
    }
  }
}
