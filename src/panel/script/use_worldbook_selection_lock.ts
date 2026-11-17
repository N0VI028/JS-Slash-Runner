export function useWorldbookSelectionLock() {
  const locks = inject<Ref<number> | null>('worldbook_selection_locks', null);
  let lock_count = 0;

  const lock = () => {
    if (!locks) return;
    locks.value += 1;
    lock_count += 1;
  };

  const unlock = () => {
    if (!locks || lock_count === 0) return;
    locks.value = Math.max(0, locks.value - 1);
    lock_count -= 1;
  };

  onBeforeUnmount(() => {
    while (lock_count > 0) unlock();
  });

  return { lock, unlock };
}
