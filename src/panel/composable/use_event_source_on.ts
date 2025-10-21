import { eventSource } from '@sillytavern/script';

function listen(event: string | string[], callback: (...args: any[]) => void) {
  if (Array.isArray(event)) {
    event.forEach(event => eventSource.on(event, callback));
  } else {
    eventSource.on(event, callback);
  }
}

function unlisten(event: string | string[], callback: (...args: any[]) => void) {
  if (Array.isArray(event)) {
    event.forEach(event => eventSource.removeListener(event, callback));
  } else {
    eventSource.removeListener(event, callback);
  }
}

export function useEventSourceOn(
  event: MaybeRefOrGetter<string> | MaybeRefOrGetter<string[]>,
  callback: MaybeRefOrGetter<(...args: any[]) => void>,
): () => void {
  const stop_watch = watch(
    () => [toValue(event), unref(callback)] as const,
    ([new_event, new_callback], old) => {
      if (old) {
        const [old_event, old_callback] = old;
        unlisten(old_event, old_callback);
      }
      listen(new_event, new_callback);
    },
    { immediate: true },
  );

  const stop = () => {
    stop_watch();
    unlisten(toValue(event), unref(callback));
  };

  tryOnScopeDispose(stop);

  return stop;
}
