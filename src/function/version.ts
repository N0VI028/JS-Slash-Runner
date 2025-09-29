import { updateExtension } from '@/function/extension';
import { getCurrentVersion } from '@/panel/main/check_update';

export function getTavernHelperVersion(): string {
  return getCurrentVersion();
}

export async function updateTavernHelper(): Promise<boolean> {
  return updateExtension('JS-Slash-Runner').then(res => res.ok);
}

export async function getTavernVersion(): Promise<string> {
  return fetch('/version')
    .then(res => res.json())
    .then(data => data.pkgVersion);
}
