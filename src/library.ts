import { event_types } from '../../../../../script.js';
import { loadScripts } from './util/load_script.js';

export let libraries_text: string = "";

export const library_load_events = [
  event_types.CHAT_CHANGED
];

export function initializeLibraries(): void {
  const libraries = loadScripts("库-");
  console.info(`[Library] 加载库: ${JSON.stringify(libraries.map(library => library.name))}`);

  libraries_text = libraries.map(script => script.code).join('\n');
}

export function clearLibraries(): void {
  libraries_text = "";
}
