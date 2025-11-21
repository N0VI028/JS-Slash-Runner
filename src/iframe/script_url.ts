import adjust_viewport from '@/iframe/adjust_viewport?raw';
import adjust_iframe_height from '@/iframe/adjust_iframe_height?raw';
import parent_jquery from '@/iframe/parent_jquery?raw';
import predefine from '@/iframe/predefine?raw';

function createObjectURLFromScript(code: string): string {
  return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}

// 反正酒馆助手不会 unmount, 无需考虑 revoke
export const adjust_iframe_height_url = createObjectURLFromScript(adjust_iframe_height);
export const adjust_viewport_url = createObjectURLFromScript(adjust_viewport);
export const parent_jquery_url = createObjectURLFromScript(parent_jquery);
export const predefine_url = createObjectURLFromScript(predefine);
