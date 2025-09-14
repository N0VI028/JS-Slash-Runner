import { disableIncompatibleOption } from '@/compatibility/disable_incompatible_option';
import '@/global.css';
import Panel from '@/Panel.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

const pinia = createPinia();
const app = createApp(Panel);
function initPanel() {
  const $app = $('<div id="tavern_helper_new">').appendTo('#extensions_settings');
  app.use(pinia).mount($app[0]);
}

$(() => {
  disableIncompatibleOption();
  initPanel();
});
