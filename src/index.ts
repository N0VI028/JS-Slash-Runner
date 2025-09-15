import { disableIncompatibleOption } from '@/disable_incompatible_option';
import '@/global.css';
import { initPanel } from '@/panel';

$(() => {
  disableIncompatibleOption();
  initPanel();
});
