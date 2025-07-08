import {
  addRenderingHideStyleSettings,
  removeRenderingHideStyleSettings,
} from '@/component/message_iframe/render_hide_style';
import {
  clearAllIframes,
  clearAndRenderAllIframes,
  handleTampermonkeyCompatibilityChange,
  renderAllIframes,
  setupIframeRemovalListener,
  updateIframeViewportHeight,
} from '@/component/message_iframe/render_message';
import {
  addRenderingOptimizeSettings,
  removeRenderingOptimizeSettings,
} from '@/component/message_iframe/render_optimize';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';

import { reloadCurrentChat, this_chid } from '@sillytavern/script';

export let isRenderEnabled: boolean;
export let renderDepth: number;
export let isTampermonkeyEnabled: boolean;
export let isRenderingOptimizeEnabled: boolean;
export let isRenderingHideStyleEnabled: boolean;

export const defaultIframeSettings = {
  render_enabled: true,
  tampermonkey_compatibility: false,
  render_depth: 0,
  render_optimize: false,
};

/**
 * 注入加载样式
 */
export function injectLoadingStyles() {
  if ($('#iframe-loading-styles').length) return;

  const styleSheet = $('<style>', {
    id: 'iframe-loading-styles',
    text: `
        .iframe-loading-overlay{
          position:absolute;
          top:0;
          left:0;
          right:0;
          bottom:0;
          background:rgba(0,0,0,.7);
          display:flex;
          justify-content:center;
          align-items:center;
          z-index:1000;
          transition:opacity .3s ease
        }
        .iframe-loading-content{
          color:#fff;
          display:flex;
          align-items:center;
          gap:10px;
          font-size:16px
        }
        .iframe-loading-content i{
          font-size:20px
        }
        .loading-text {
          transition: opacity 0.3s ease;
        }`,
  });

  $('head').append(styleSheet);
}

/**
 * 添加前端渲染快速按钮
 */
function addRenderQuickButton() {
  const buttonHtml = $(`
  <div id="tavern-helper-render-container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      <span id="tavern-helper-render-text">${isRenderEnabled ? '关闭前端渲染' : '开启前端渲染'}</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#tavern-helper-render-container').on('click', async function () {
    $('#tavern-helper-render-text').text(!isRenderEnabled ? '关闭前端渲染' : '开启前端渲染');
    await handleRenderEnableToggle(!isRenderEnabled, true);
    $('#render-enable-toggle').prop('checked', isRenderEnabled);
  });
}

/**
 * 初始化iframe控制面板
 */
export async function initIframePanel() {
  // 处理处理深度设置
  renderDepth = getSettingValue('render.render_depth');
  $('#render-depth')
    .val(renderDepth ?? defaultIframeSettings.render_depth)
    .on('blur', function (event) {
      onDepthInput((event.target as HTMLInputElement).value);
    });

  // 处理油猴兼容性设置
  isTampermonkeyEnabled = getSettingValue('render.tampermonkey_compatibility');
  if (isTampermonkeyEnabled) {
    handleTampermonkeyCompatibilityChange(true, false);
  }
  $('#tampermonkey-compatibility-toggle')
    .prop('checked', isTampermonkeyEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleTampermonkeyCompatibilityChange(event.target.checked, true));

  // 首先处理前端渲染设置 - 这个必须先执行，因为它可能会调用reloadCurrentChat
  isRenderEnabled = getSettingValue('render.render_enabled');
  await handleRenderEnableToggle(isRenderEnabled, false);
  $('#render-enable-toggle')
    .prop('checked', isRenderEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderEnableToggle(event.target.checked, true));

  // 处理重型前端卡渲染优化
  isRenderingOptimizeEnabled = getSettingValue('render.render_optimize');
  if (isRenderingOptimizeEnabled) {
    await handleRenderingOptimizationToggle(true, false);
  }
  $('#render-optimize-toggle')
    .prop('checked', isRenderingOptimizeEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderingOptimizationToggle(event.target.checked, true));

  // 处理代码块折叠设置 - 这个放在渲染设置之后，确保不被reloadCurrentChat清除
  isRenderingHideStyleEnabled = getSettingValue('render.render_hide_style');
  if (isRenderingHideStyleEnabled) {
    await handleRenderingHideStyleToggle(true, false);
  }
  $('#render-hide-style-toggle')
    .prop('checked', isRenderingHideStyleEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderingHideStyleToggle(event.target.checked, true));

  $(window).on('resize', function () {
    if ($('iframe[data-needs-vh="true"]').length) {
      updateIframeViewportHeight();
    }
  });

  addRenderQuickButton();
  injectLoadingStyles();
  setupIframeRemovalListener();
}

/**
 * 处理深度输入改变时
 */
export async function onDepthInput(value: string) {
  const processDepth = parseInt(value, 10);
  renderDepth = processDepth;

  if (processDepth < 0) {
    toastr.warning('处理深度不能为负数');
    $('#render-depth').val(getSettingValue('render.render_depth'));
    return;
  }

  saveSettingValue('render.render_depth', processDepth);

  await clearAndRenderAllIframes();
}

/**
 * 处理渲染器启用设置改变
 * @param enable 是否启用渲染器
 * @param userInput 是否由用户手动触发
 */
export async function handleRenderEnableToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_enabled', enable);
    isRenderEnabled = enable;
  }
  if (enable) {
    $('#render-settings-content .extension-content-item').slice(3).css('opacity', 1);
    await renderAllIframes();
  } else {
    $('#render-settings-content .extension-content-item').slice(3).css('opacity', 0.5);
    await clearAllIframes();
    if (userInput && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  }
}

/**
 * 处理代码块折叠设置改变
 * @param enable 是否启用代码块折叠
 * @param userInput 是否由用户手动触发
 */
export async function handleRenderingHideStyleToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_hide_style', enable);
    isRenderingHideStyleEnabled = enable;
  }

  if (enable) {
    addRenderingHideStyleSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  } else {
    removeRenderingHideStyleSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  }
}

/**
 * 处理重型前端卡渲染优化
 * @param enable 是否启用重型前端卡渲染优化
 * @param userInput 是否由用户手动触发
 */
export async function handleRenderingOptimizationToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_optimize', enable);
    isRenderingOptimizeEnabled = enable;
  }

  if (enable) {
    addRenderingOptimizeSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  } else {
    removeRenderingOptimizeSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  }
}
