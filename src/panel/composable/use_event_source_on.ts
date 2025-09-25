import { eventSource } from '@sillytavern/script';

export function useEventSourceOn(
  event: MaybeRefOrGetter<string>,
  callback: MaybeRefOrGetter<(...args: any[]) => void>,
  should_enable: MaybeRefOrGetter<boolean> = true,
): () => void {
  const stop_watch = watch(
    () => [toValue(event), unref(callback), toValue(should_enable)] as const,
    ([new_event, new_callback, new_should_enable], old) => {
      if (old) {
        const [old_event, old_callback, old_should_enable] = old;
        if (old_should_enable) {
          eventSource.removeListener(old_event, old_callback);
        }
      }
      if (new_should_enable) {
        eventSource.on(new_event, new_callback);
      }
    },
    { immediate: true },
  );

  const stop = () => {
    stop_watch();
    if (toValue(should_enable)) {
      eventSource.removeListener(toValue(event), unref(callback));
    }
  };

  tryOnScopeDispose(stop);

  return stop;
}
