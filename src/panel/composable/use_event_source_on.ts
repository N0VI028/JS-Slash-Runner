import { eventSource } from '@sillytavern/script';

export function useEventSourceOn(
  event: MaybeRefOrGetter<string>,
  callback: MaybeRefOrGetter<(...args: any[]) => void>,
): () => void {
  const stop_watch = watch(
    () => [toValue(event), unref(callback)] as const,
    ([new_event, new_callback], old) => {
      if (old) {
        const [old_event, old_callback] = old;
        eventSource.removeListener(old_event, old_callback);
      }
      eventSource.on(new_event, new_callback);
    },
    { immediate: true },
  );

  const stop = () => {
    stop_watch();
    eventSource.removeListener(toValue(event), unref(callback));
  };

  tryOnScopeDispose(stop);

  return stop;
}
