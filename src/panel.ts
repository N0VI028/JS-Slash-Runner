import Panel from '@/Panel.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

const app = createApp(Panel).use(createPinia());
export function initPanel() {
  const $app = $('<div id="tavern_helper_new">').appendTo('#extensions_settings');
  // TODO: 一些组件应该在 APP_READY 后才加载
  app.mount($app[0]);
}
