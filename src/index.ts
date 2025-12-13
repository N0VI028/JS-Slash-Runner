import { initTavernHelperObject } from '@/function/index';
import '@/global.css';
import { disableIncompatibleOption } from '@/incompatible_option';
import { registerMacros } from '@/macro';
import Panel from '@/Panel.vue';
import { initSlashCommands } from '@/slash_command/index';
import { registerSwipeEvent } from '@/swipe';
import { initThirdPartyObject } from '@/third_party_object';
import { getCurrentLocale } from '@sillytavern/scripts/i18n';
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
  z.config(getCurrentLocale().includes('zh') ? z.locales.zhCN() : z.locales.en());
  disableIncompatibleOption();
  registerMacros();
  registerSwipeEvent();
  initTavernHelperObject();
  initThirdPartyObject();
  initSlashCommands();

  const $app = $('<div id="tavern_helper">').appendTo('#extensions_settings');
  app.mount($app[0]);
});

$(window).on('pagehide', () => {
  app.unmount();
});
