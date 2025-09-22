import Panel from '@/Panel.vue';
import { addQuickButton } from '@/panel/toolbox/prompt_viewer';
import { App } from 'vue';

const app = createApp(Panel);

const pinia = createPinia();
app.use(pinia);
declare module 'vue' {
  interface ComponentCustomProperties {
    t: typeof t;
  }
}
const i18n = {
  install: (app: App) => {
    app.config.globalProperties.t = t;
  },
};
app.use(i18n);

export function initPanel() {
  const $app = $('<div id="tavern_helper_new">').appendTo('#extensions_settings');
  // TODO: 一些组件应该在 APP_READY 后才加载
  app.mount($app[0]);
  addQuickButton();
}
