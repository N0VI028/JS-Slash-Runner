import { loadScripts } from '@/util/load_script';

export let libraries_text: string = '';

export function initialize(): void {
  const libraries = loadScripts('库-');
  console.info(`[Library] 加载库: ${JSON.stringify(libraries.map(library => library.name))}`);

  libraries_text = libraries.map(script => script.code).join('\n');
}

export function destroy(): void {
  libraries_text = '';
}
