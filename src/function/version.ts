import manifest from '@/../manifest.json';
import { updateExtension } from '@/function/extension';

export function getTavernHelperVersion(): string {
  return manifest.version;
}

export function getTavernHelperExtensionId(): string {
  return 'JS-Slash-Runner';
}

export async function updateTavernHelper(): Promise<boolean> {
  return updateExtension(getTavernHelperExtensionId()).then(res => res.ok);
}

export async function getTavernVersion(): Promise<string> {
  return fetch('/version')
    .then(res => res.json())
    .then(data => data.pkgVersion);
}
