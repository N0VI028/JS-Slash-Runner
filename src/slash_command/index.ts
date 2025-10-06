import { initSlashAudio } from '@/slash_command/audio';
import { initSlashEventEmit } from '@/slash_command/event';

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function initSlashCommands() {
  initSlashEventEmit();
  initSlashAudio();
}
