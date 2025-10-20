import '@/global.css';
import Panel from '@/Panel.vue';
import { App } from 'vue';
import { createVfm } from 'vue-final-modal';
import 'vue-final-modal/style.css';
import VueTippy from 'vue-tippy';

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
  const $app = $('<div id="tavern_helper">').appendTo('#extensions_settings');
  app.mount($app[0]);
});
