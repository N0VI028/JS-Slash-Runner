import { initSlashAudio } from '@/slash_command/audio';
import { initSlashEventEmit } from '@/slash_command/event';

export function initSlashCommands() {
  initSlashEventEmit();
  initSlashAudio();
}
