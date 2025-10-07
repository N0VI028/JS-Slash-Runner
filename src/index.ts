import '@/global.css';
import Panel from '@/Panel.vue';
import { App } from 'vue';
import { createVfm } from 'vue-final-modal';
import VueTippy from 'vue-tippy';
import 'vue-final-modal/style.css';

const app = createApp(Panel);

const pinia = createPinia();
app.use(pinia);

const vfm = createVfm();
app.use(vfm);

app.use(VueTippy);

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

$(() => {
  const $app = $('<div id="tavern_helper_new">').appendTo('#extensions_settings');
  // TODO: 性能分析，正式版时移除
  app.config.performance = true;
  app.mount($app[0]);
});
