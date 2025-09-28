import parent_jquery from '@/iframe/parent_jquery?raw';
import predefine from '@/iframe/predefine?raw';

function createObjectURLFromScript(code: string): string {
  return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}

// 反正酒馆助手不会 unmount, 无需考虑 revoke
export const parent_jquery_url = createObjectURLFromScript(parent_jquery);
export const predefine_url = createObjectURLFromScript(predefine);
