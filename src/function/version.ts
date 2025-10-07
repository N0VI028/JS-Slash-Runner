import manifest from '@/../manifest.json';
import { updateExtension } from '@/function/extension';
import { version } from '@/util/tavern';

export function getTavernHelperVersion(): string {
  return manifest.version;
}

export function getTavernHelperExtensionId(): string {
  return 'JS-Slash-Runner';
}

export async function updateTavernHelper(): Promise<boolean> {
  return updateExtension(getTavernHelperExtensionId()).then(res => res.ok);
}

export function getTavernVersion(): string {
  return version;
}
