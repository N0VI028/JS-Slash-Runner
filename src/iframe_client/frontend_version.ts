/**
 * 获取前端助手版本号
 *
 * 自然地, 旧版本前端助手并没有这个函数. 为了让该功能在旧版本下正常使用, 你可以直接使用该函数内部的实现.
 */
function getFrontendVersion(): string {
  //@ts-ignore
  const version = $(".js-settings", window.parent.document).find('.extension_info.flex-container.spaceBetween > small').text().replace('Ver ', '');
  console.info(`[FrontendVersion][getFrontendVersion] 获取前端助手版本号: ${version}`);
  return version;
}

/**
 * 尝试主动更新前端助手
 */
async function updateFrontendVersion(): Promise<boolean> {
  return TavernHelper.updateFrontendVersion();
}
