import manifest from '@/../manifest.json';
import { getTavernHelperExtensionId, updateExtension } from '@/function/extension';
import { version } from '@/util/tavern';

export function getTavernHelperVersion(): string {
  return manifest.version;
}

export async function updateTavernHelper(): Promise<boolean> {
  return updateExtension(getTavernHelperExtensionId()).then(res => res.ok);
}

export function getTavernVersion(): string {
  return version;
}
