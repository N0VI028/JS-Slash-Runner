import { disableIncompatibleOption } from '@/compatibility/disable_incompatible_option';
import '@/global.css';
import Panel from '@/Panel.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

const app = createApp(Panel).use(createPinia());
function initPanel() {
  const $app = $('<div id="tavern_helper_new">').appendTo('#extensions_settings');
  app.mount($app[0]);
}

$(() => {
  disableIncompatibleOption();
  initPanel();
});
