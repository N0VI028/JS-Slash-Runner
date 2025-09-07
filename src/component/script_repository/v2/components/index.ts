// 导出所有组件
export { default as RepositoryPage } from './RepositoryPage.vue';
export { default as ScriptList } from './ScriptList.vue';
export { default as ScriptListItem } from './ScriptListItem.vue';

import { VueAppManager } from '@/component/script_repository/v2/mount';

/**
 * 初始化脚本库
 */
export async function initializeVueScriptRepository(): Promise<void> {
  try {
    const container = $('#script-settings-content');
    if (!container) {
      console.error('[ScriptRepository] 找不到script-settings-content容器');
      return;
    }

    const vueContainer = $('<div>').attr('id', 'vue-script-repository').attr('class', 'width100p height100p');

    // 清空容器并添加Vue容器
    container.empty().append(vueContainer);

    console.log('[ScriptRepository] Vue容器创建完成，准备挂载Vue应用');

    // 获取VueAppManager实例并挂载
    const vueAppManager = VueAppManager.getInstance();
    await vueAppManager.mount('vue-script-repository');

    console.log('[ScriptRepository] Vue应用挂载完成:', vueAppManager.isMounted());
  } catch (error) {
    console.error('[ScriptRepository] 初始化Vue脚本库失败:', error);
  }
}
