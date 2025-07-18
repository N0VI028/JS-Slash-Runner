import { isMobile } from '@sillytavern/scripts/RossAscends-mods';

export interface FloatingDialogOptions {
  /** 浮窗标题 */
  title: string;
  /** 浮窗唯一标识符，用于防止重复打开 */
  id: string;
  /** 最小宽度（像素） */
  minWidth?: number;
  /** 最小高度（像素） */
  minHeight?: number;
  /** 初始宽度（像素） */
  width?: number;
  /** 初始高度（像素） */
  height?: number;
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

  /** 全局浮窗实例管理器 */
  private static instances: Map<string, FloatingDialog> = new Map();

  private dialog: JQuery<HTMLElement> | null = null;
  private content: JQuery<HTMLElement> | null = null;
  private options: Required<FloatingDialogOptions>;
  private isCollapsed = false;

  constructor(options: FloatingDialogOptions) {
    this.options = {
      minWidth: FloatingDialog.DEFAULT_MIN_WIDTH,
      minHeight: FloatingDialog.DEFAULT_MIN_HEIGHT,
      width: FloatingDialog.DEFAULT_WIDTH,
      height: FloatingDialog.DEFAULT_HEIGHT,
      resizable: true,
      draggable: true,
      collapsible: true,
      onClose: () => {},
      onToggle: () => {},
      ...options,
    };
  }

  /**
   * 创建或显示浮窗
   * @param options 浮窗配置选项
   * @returns 浮窗实例，如果已存在则返回现有实例
   */
  public static create(options: FloatingDialogOptions): FloatingDialog | null {
    // 检查是否已存在同ID的浮窗
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

    // 设置初始尺寸
    this.dialog.css({
      width: this.options.width,
      height: this.options.height,
    });

    this.bindEvents();
    this.initInteractions();

    $('body').append(this.dialog);
    this.centerDialog();

    return this.content;
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
      // 获取当前最高的z-index
      const maxZIndex = Math.max(
        ...Array.from($('.floating-dialog')).map(el => parseInt($(el).css('z-index') || '1000')),
      );

      this.dialog.css('z-index', maxZIndex + 1);

      // 添加聚焦效果
      $('.floating-dialog').removeClass('focused');
      this.dialog.addClass('focused');
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

    // 关闭按钮
    this.dialog.find('.dialog-close-btn').on('click', () => {
      this.close();
    });

    // 折叠按钮
    if (this.options.collapsible) {
      this.dialog.find('.dialog-toggle-btn').on('click', () => {
        this.toggle();
      });
    }

    // 点击浮窗时聚焦
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
        minHeight: this.options.minHeight,
        minWidth: this.options.minWidth,
        start: () => {
          this.dialog?.addClass('resizing');
          this.focus();
        },
        stop: () => {
          this.dialog?.removeClass('resizing');
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

    const dialogWidth = this.dialog.outerWidth() || this.options.width;
    const dialogHeight = this.dialog.outerHeight() || this.options.height;

    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);

    this.dialog.css({
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed',
      zIndex: 1000,
    });

    this.focus();
  }
}
