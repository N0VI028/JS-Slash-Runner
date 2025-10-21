export function useNegate(ref: Ref<boolean>): WritableComputedRef<boolean> {
  return computed({
    get: () => !ref.value,
    set: value => {
      ref.value = !value;
    },
  });
}
