import adjust_viewport from '@/iframe/adjust_viewport?raw';
import emit_loaded_event from '@/iframe/emit_loaded_event?raw';
import parent_jquery from '@/iframe/parent_jquery?raw';
import predefine from '@/iframe/predefine?raw';

function createObjectURLFromScript(code: string): string {
  return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}

// 反正酒馆助手不会 unmount, 无需考虑 revoke
export const parent_jquery_url = createObjectURLFromScript(parent_jquery);
export const predefine_url = createObjectURLFromScript(predefine);
export const emit_loaded_event_url = createObjectURLFromScript(emit_loaded_event);
export const adjust_viewport_url = createObjectURLFromScript(adjust_viewport);
