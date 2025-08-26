import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import log from 'loglevel';

export interface FloatingDialogOptions {
  /** 浮窗标题 */
  title: string;
  /** 浮窗唯一标识符，用于防止重复打开 */
  id: string;
  /** 最小宽度（支持数字像素或CSS单位，如'40vw'、'50%'） */
  minWidth?: number | string;
  /** 最小高度（支持数字像素或CSS单位，如'40vh'、'50%'） */
  minHeight?: number | string;
  /** 初始宽度（支持数字像素或CSS单位，如'80vw'、'50%'） */
  width?: number | string;
  /** 初始高度（支持数字像素或CSS单位，如'80vh'、'50%'） */
  height?: number | string;
  /** 移动端最小宽度（支持数字像素或CSS单位，如'90vw'、'80%'） */
  mobileMinWidth?: number | string;
  /** 移动端最小高度（支持数字像素或CSS单位，如'50vh'、'40%'） */
  mobileMinHeight?: number | string;
  /** 移动端初始宽度（支持数字像素或CSS单位，如'95vw'、'90%'） */
  mobileWidth?: number | string;
  /** 移动端初始高度（支持数字像素或CSS单位，如'70vh'、'60%'） */
  mobileHeight?: number | string;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否显示折叠按钮 */
  collapsible?: boolean;
  /** 关闭时的回调函数 */
  onClose?: () => void;
  /** 折叠/展开时的回调函数 */
  onToggle?: (collapsed: boolean) => void;
}

export class FloatingDialog {
  private static readonly DEFAULT_MIN_WIDTH = 300;
  private static readonly DEFAULT_MIN_HEIGHT = 250;
  private static readonly DEFAULT_WIDTH = 600;
  private static readonly DEFAULT_HEIGHT = 400;

  // 移动端默认尺寸
  private static readonly MOBILE_DEFAULT_MIN_WIDTH = 280;
  private static readonly MOBILE_DEFAULT_MIN_HEIGHT = 200;
  private static readonly MOBILE_DEFAULT_WIDTH = 200;
  private static readonly MOBILE_DEFAULT_HEIGHT = 100;

  private static readonly STORAGE_KEY_PREFIX = 'TH_floating_dialog_size_';

  /** 全局浮窗实例管理器 */
  private static instances: Map<string, FloatingDialog> = new Map();

  private dialog: JQuery<HTMLElement> | null = null;
  private content: JQuery<HTMLElement> | null = null;
  private options: Required<
    Omit<FloatingDialogOptions, 'mobileMinWidth' | 'mobileMinHeight' | 'mobileWidth' | 'mobileHeight'>
  > &
    Pick<FloatingDialogOptions, 'mobileMinWidth' | 'mobileMinHeight' | 'mobileWidth' | 'mobileHeight'>;
  private isCollapsed = false;

  constructor(options: FloatingDialogOptions) {
    const isCurrentlyMobile = isMobile();

    const savedSize = FloatingDialog.loadWindowSize(options.id, isCurrentlyMobile);

    const finalMinWidth = isCurrentlyMobile
      ? options.mobileMinWidth ?? FloatingDialog.MOBILE_DEFAULT_MIN_WIDTH
      : options.minWidth ?? FloatingDialog.DEFAULT_MIN_WIDTH;
    const finalMinHeight = isCurrentlyMobile
      ? options.mobileMinHeight ?? FloatingDialog.MOBILE_DEFAULT_MIN_HEIGHT
      : options.minHeight ?? FloatingDialog.DEFAULT_MIN_HEIGHT;
    
    // 如果有保存的大小，使用保存的大小；否则使用选项中的大小或默认大小
    let finalWidth: number | string;
    let finalHeight: number | string;
    
    if (savedSize) {
      finalWidth = savedSize.width;
      finalHeight = savedSize.height;
    } else {
      finalWidth = isCurrentlyMobile
        ? options.mobileWidth ?? FloatingDialog.MOBILE_DEFAULT_WIDTH
        : options.width ?? FloatingDialog.DEFAULT_WIDTH;
      finalHeight = isCurrentlyMobile
        ? options.mobileHeight ?? FloatingDialog.MOBILE_DEFAULT_HEIGHT
        : options.height ?? FloatingDialog.DEFAULT_HEIGHT;
    }

    this.options = {
      ...options, // 先展开原始选项
      // 然后覆盖计算后的尺寸值
      minWidth: finalMinWidth,
      minHeight: finalMinHeight,
      width: finalWidth,
      height: finalHeight,
      resizable: options.resizable ?? true,
      draggable: options.draggable ?? true,
      collapsible: options.collapsible ?? true,
      onClose: options.onClose ?? (() => {}),
      onToggle: options.onToggle ?? (() => {}),
      mobileMinWidth: options.mobileMinWidth,
      mobileMinHeight: options.mobileMinHeight,
      mobileWidth: options.mobileWidth,
      mobileHeight: options.mobileHeight,
    };
  }

  /**
   * 创建或显示浮窗
   * @param options 浮窗配置选项
   * @returns 浮窗实例，如果已存在则返回现有实例
   */
  public static create(options: FloatingDialogOptions): FloatingDialog | null {
    const existing = FloatingDialog.instances.get(options.id);
    if (existing) {
      existing.focus();
      return null; // 返回null表示没有创建新实例
    }

    const dialog = new FloatingDialog(options);
    FloatingDialog.instances.set(options.id, dialog);
    return dialog;
  }

  /**
   * 获取指定ID的浮窗实例
   * @param id 浮窗ID
   * @returns 浮窗实例或null
   */
  public static getInstance(id: string): FloatingDialog | null {
    return FloatingDialog.instances.get(id) || null;
  }

  /**
   * 关闭指定ID的浮窗
   * @param id 浮窗ID
   * @returns 是否成功关闭
   */
  public static close(id: string): boolean {
    const instance = FloatingDialog.instances.get(id);
    if (instance) {
      instance.close();
      return true;
    }
    return false;
  }

  /**
   * 保存窗口大小到localStorage
   * @param id 浮窗ID
   * @param width 宽度
   * @param height 高度
   * @param isMobileDevice 是否为移动端
   */
  private static saveWindowSize(id: string, width: number, height: number, isMobileDevice: boolean): void {
    try {
      const key = `${FloatingDialog.STORAGE_KEY_PREFIX}${id}`;
      const sizeData = {
        width,
        height,
        isMobile: isMobileDevice,
      };
      localStorage.setItem(key, JSON.stringify(sizeData));
    } catch (error) {
      log.warn('保存窗口大小失败:', error);
    }
  }

  /**
   * 从localStorage加载窗口大小
   * @param id 浮窗ID
   * @param isMobileDevice 当前是否为移动端
   * @returns 保存的窗口大小或null
   */
  private static loadWindowSize(id: string, isMobileDevice: boolean): { width: number; height: number } | null {
    try {
      const key = `${FloatingDialog.STORAGE_KEY_PREFIX}${id}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const sizeData = JSON.parse(stored);
      if (sizeData.isMobile === isMobileDevice && sizeData.width && sizeData.height) {
        return {
          width: sizeData.width,
          height: sizeData.height,
        };
      }
    } catch (error) {
      log.warn('加载窗口大小失败:', error);
    }
    return null;
  }

  /**
   * 渲染浮窗
   * @returns 内容容器jQuery对象
   */
  public render(): JQuery<HTMLElement> {
    this.unrender();

    this.dialog = $(`
      <div class="floating-dialog" data-dialog-id="${this.options.id}">
        <div class="dialog-header">
          <div class="dialog-title">${this.options.title}</div>
          <div class="dialog-controls">
            ${
              this.options.collapsible
                ? '<button class="dialog-toggle-btn" title="折叠/展开内容"><i class="fa-solid fa-chevron-up"></i></button>'
                : ''
            }
            <button class="dialog-close-btn" title="关闭"><i class="fa-solid fa-times"></i></button>
          </div>
        </div>
        <div class="dialog-content"></div>
        ${isMobile() ? '<div class="dialog-resize-handle"></div>' : ''}
      </div>
    `);

    this.content = this.dialog.find('.dialog-content');

    const cssValues = {
      width: this.resolveCssSize(this.options.width, 'w'),
      height: this.resolveCssSize(this.options.height, 'h'),
      minWidth: this.resolveCssSize(this.options.minWidth, 'w'),
      minHeight: this.resolveCssSize(this.options.minHeight, 'h'),
    };

    this.dialog.css(cssValues);

    this.bindEvents();
    this.initInteractions();

    $('body').append(this.dialog);
    this.centerDialog();

    return this.content;
  }

  /**
   * 将宽高选项解析为CSS尺寸字符串。
   * - 若为数字，则追加px
   * - 若为字符串，则原样返回
   */
  private resolveCssSize(value: number | string | undefined, axis: 'w' | 'h'): string {
    if (typeof value === 'number' || typeof value === 'undefined') {
      const isCurrentlyMobile = isMobile();
      let fallback: number | string;

      if (axis === 'w') {
        fallback = isCurrentlyMobile ? FloatingDialog.MOBILE_DEFAULT_WIDTH : FloatingDialog.DEFAULT_WIDTH;
      } else {
        fallback = isCurrentlyMobile ? FloatingDialog.MOBILE_DEFAULT_HEIGHT : FloatingDialog.DEFAULT_HEIGHT;
      }

      const numeric = typeof value === 'number' ? value : fallback;
      return typeof numeric === 'number' ? `${numeric}px` : numeric;
    }
    return value;
  }

  /**
   * 将宽高选项计算为像素值（用于jQuery UI resizable）。
   * - 数字：直接返回
   * - 百分比：按窗口尺寸计算
   * - vw/vh：按视口宽高计算
   * - 其它单位：尝试通过临时元素计算，否则回退默认像素
   */
  private computePixelSize(value: number | string | undefined, axis: 'w' | 'h'): number {
    const viewportW = $(window).width() || 0;
    const viewportH = $(window).height() || 0;

    const isCurrentlyMobile = isMobile();
    const fallback =
      axis === 'w'
        ? isCurrentlyMobile
          ? FloatingDialog.MOBILE_DEFAULT_MIN_WIDTH
          : FloatingDialog.DEFAULT_MIN_WIDTH
        : isCurrentlyMobile
        ? FloatingDialog.MOBILE_DEFAULT_MIN_HEIGHT
        : FloatingDialog.DEFAULT_MIN_HEIGHT;

    if (typeof value === 'number' || typeof value === 'undefined') {
      return typeof value === 'number' ? value : fallback;
    }

    const trimmed = value.trim();
    // 百分比
    const percentMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)%$/);
    if (percentMatch) {
      const ratio = parseFloat(percentMatch[1]) / 100;
      return Math.max(0, Math.round((axis === 'w' ? viewportW : viewportH) * ratio));
    }
    // vw/vh
    const vwMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)vw$/i);
    if (vwMatch && axis === 'w') {
      const ratio = parseFloat(vwMatch[1]) / 100;
      return Math.max(0, Math.round(viewportW * ratio));
    }
    const vhMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)vh$/i);
    if (vhMatch && axis === 'h') {
      const ratio = parseFloat(vhMatch[1]) / 100;
      return Math.max(0, Math.round(viewportH * ratio));
    }

    // 其它单位：尝试通过临时元素计算
    const temp = $('<div/>').css({
      position: 'absolute',
      visibility: 'hidden',
      width: axis === 'w' ? trimmed : 'auto',
      height: axis === 'h' ? trimmed : 'auto',
    });
    $('body').append(temp);
    const measured = axis === 'w' ? temp.outerWidth() || 0 : temp.outerHeight() || 0;
    temp.remove();
    return measured || fallback;
  }

  /**
   * 获取内容容器
   * @returns 内容容器jQuery对象
   */
  public getContent(): JQuery<HTMLElement> | null {
    return this.content;
  }

  /**
   * 聚焦浮窗（置顶显示）
   */
  public focus(): void {
    if (this.dialog) {
      const maxZIndex = Math.max(
        ...Array.from($('.floating-dialog')).map(el => parseInt($(el).css('z-index') || '4000')),
      );

      this.dialog.css('z-index', maxZIndex + 1);
    }
  }

  /**
   * 设置浮窗标题
   * @param title 新标题
   */
  public setTitle(title: string): void {
    if (this.dialog) {
      this.dialog.find('.dialog-title').text(title);
    }
  }

  /**
   * 切换折叠状态
   */
  public toggle(): void {
    if (!this.options.collapsible || !this.dialog) return;

    const $content = this.dialog.find('.dialog-content');
    const $toggleBtn = this.dialog.find('.dialog-toggle-btn i');
    const $resizeHandle = this.dialog.find('.dialog-resize-handle');

    this.isCollapsed = !this.isCollapsed;

    $content.slideToggle(300, () => {
      if (this.isCollapsed) {
        $toggleBtn.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        $resizeHandle.hide();
      } else {
        $toggleBtn.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        $resizeHandle.show();
      }
    });

    this.dialog.toggleClass('content-collapsed', this.isCollapsed);
    this.options.onToggle(this.isCollapsed);
  }

  /**
   * 关闭浮窗
   */
  public close(): void {
    if (this.dialog) {
      this.options.onClose();
      this.unrender();
      FloatingDialog.instances.delete(this.options.id);
    }
  }

  /**
   * 销毁浮窗DOM
   */
  private unrender(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
      this.content = null;
    }
  }

  /**
   * 绑定事件处理器
   */
  private bindEvents(): void {
    if (!this.dialog) return;

    this.dialog.find('.dialog-close-btn').on('click', () => {
      this.close();
    });

    if (this.options.collapsible) {
      this.dialog.find('.dialog-toggle-btn').on('click', () => {
        this.toggle();
      });
    }

    this.dialog.on('mousedown', () => {
      this.focus();
    });
  }

  /**
   * 初始化拖拽和调整大小功能
   */
  private initInteractions(): void {
    if (!this.dialog) return;

    const isMobileDevice = isMobile();

    // 拖拽功能
    if (this.options.draggable) {
      (this.dialog as any).draggable({
        handle: '.dialog-header',
        containment: 'window',
        start: () => {
          this.dialog?.addClass('dragging');
          this.focus();
        },
        stop: () => {
          this.dialog?.removeClass('dragging');
        },
      });
    }

    // 调整大小功能
    if (this.options.resizable) {
      (this.dialog as any).resizable({
        handles: isMobileDevice ? 'se' : 'n,e,s,w,ne,se,sw,nw',
        minHeight: this.computePixelSize(this.options.minHeight, 'h'),
        minWidth: this.computePixelSize(this.options.minWidth, 'w'),
        start: () => {
          this.dialog?.addClass('resizing');
          this.focus();
          const minW = this.computePixelSize(this.options.minWidth, 'w');
          const minH = this.computePixelSize(this.options.minHeight, 'h');
          (this.dialog as any).resizable('option', 'minWidth', minW);
          (this.dialog as any).resizable('option', 'minHeight', minH);
        },
        stop: () => {
          this.dialog?.removeClass('resizing');
          if (this.dialog) {
            const width = this.dialog.outerWidth() || 0;
            const height = this.dialog.outerHeight() || 0;
            FloatingDialog.saveWindowSize(this.options.id, width, height, isMobileDevice);
          }
        },
      });
    }

    // 移动设备显示调整大小手柄
    if (isMobileDevice && this.options.resizable) {
      this.dialog.find('.dialog-resize-handle').show();
    }
  }

  /**
   * 将浮窗居中显示
   */
  private centerDialog(): void {
    if (!this.dialog) return;

    const windowWidth = $(window).width() || 0;
    const windowHeight = $(window).height() || 0;

    const dialogWidth = this.dialog.outerWidth() || 0;
    const dialogHeight = this.dialog.outerHeight() || 0;

    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);

    this.dialog.css({
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed',
      zIndex: 4000,
    });

    this.focus();
  }
}
